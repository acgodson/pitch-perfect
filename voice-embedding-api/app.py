from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import json
import time
import uuid
from typing import List, Optional, Dict
import torch
import numpy as np
import librosa
import traceback
from transformers import Wav2Vec2FeatureExtractor, WavLMModel
from sklearn.metrics.pairwise import cosine_similarity
import statistics

app = FastAPI(title="Voice Registry System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_NAME = "microsoft/wavlm-base-plus"
REGISTRY_DIR = "./data/voice_registry"
SAMPLING_RATE = 16000
IDENTIFICATION_THRESHOLD = 0.82
REQUIRED_PHRASES = 5

# enrollment phrases
ENROLLMENT_PHRASES = [
    "The quick brown fox jumps over the lazy dog",
    "She sells seashells by the seashore",
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
    "Peter Piper picked a peck of pickled peppers",
    "Red leather yellow leather",
    "The five boxing wizards jump quickly",
    "Pack my box with five dozen liquor jugs",
    "Sphinx of black quartz judge my vow",
    "How vexingly quick daft zebras jump",
    "Waltz bad nymph for quick jigs vex",
    "Please call Stella and ask her to bring these things with her from the store",
    "The birch canoe slid on the smooth planks",
    "Say the words below to complete voice setup",
    "My voice is stronger than passwords",
    "Ready to learn my voice",
]

# Initialize device and model
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading WavLM model: {MODEL_NAME}")
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_NAME)
model = WavLMModel.from_pretrained(MODEL_NAME).to(device)
model.eval()

os.makedirs(REGISTRY_DIR, exist_ok=True)


def extract_voice_embedding(audio_path):
    """Extract voice embedding from audio file"""
    try:
        # Load and preprocess audio
        audio, sr = librosa.load(audio_path, sr=SAMPLING_RATE)

        # Ensure minimum length (1 second)
        if len(audio) < SAMPLING_RATE:
            audio = np.pad(audio, (0, SAMPLING_RATE - len(audio)), mode="constant")

        # Extract features
        inputs = feature_extractor(
            audio, sampling_rate=SAMPLING_RATE, return_tensors="pt"
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)

        # Mean pooling and L2 normalization
        hidden_states = outputs.last_hidden_state
        embedding = torch.mean(hidden_states, dim=1).squeeze()
        embedding = torch.nn.functional.normalize(embedding, p=2, dim=0)

        return embedding.cpu().numpy()

    except Exception as e:
        print(f"Error extracting embedding: {e}")
        raise e


def create_voice_profile(embeddings, user_name, phrase_indices):
    """Create robust voice profile from multiple phrase embeddings"""
    # Validate phrase consistency
    similarities = []
    for i in range(len(embeddings)):
        for j in range(i + 1, len(embeddings)):
            sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
            similarities.append(float(sim))

    avg_consistency = statistics.mean(similarities)
    min_consistency = min(similarities)

    if min_consistency < 0.70:  # Phrases should be reasonably consistent
        raise ValueError(
            f"Voice samples inconsistent. Min similarity: {min_consistency:.3f}"
        )

    # Create centroid embedding
    centroid = np.mean(embeddings, axis=0)
    centroid = centroid / np.linalg.norm(centroid)  # L2 normalize

    profile = {
        "user_id": str(uuid.uuid4()),
        "user_name": user_name,
        "voice_embedding": [float(x) for x in centroid],
        "phrase_embeddings": [[float(x) for x in emb] for emb in embeddings],
        "phrase_indices": phrase_indices,
        "phrases_used": [ENROLLMENT_PHRASES[i] for i in phrase_indices],
        "consistency_score": float(avg_consistency),
        "min_consistency": float(min_consistency),
        "enrollment_timestamp": time.time(),
        "embedding_dim": len(centroid),
    }

    return profile


def save_voice_profile(profile):
    """Save voice profile to registry"""
    profile_path = os.path.join(REGISTRY_DIR, f"{profile['user_id']}.json")
    with open(profile_path, "w") as f:
        json.dump(profile, f, indent=2)
    return profile_path


def load_all_profiles():
    """Load all voice profiles from registry"""
    profiles = []
    if os.path.exists(REGISTRY_DIR):
        for filename in os.listdir(REGISTRY_DIR):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(REGISTRY_DIR, filename), "r") as f:
                        profile = json.load(f)
                        profiles.append(profile)
                except Exception as e:
                    print(f"Error loading profile {filename}: {e}")
    return profiles


def identify_speaker(test_embedding, threshold=IDENTIFICATION_THRESHOLD):
    """Identify speaker from voice registry"""
    profiles = load_all_profiles()

    if not profiles:
        return None, 0.0, "No profiles in registry"

    best_match = None
    best_score = 0.0
    all_scores = []

    for profile in profiles:
        # Compare against centroid embedding
        profile_embedding = np.array(profile["voice_embedding"])
        centroid_similarity = cosine_similarity([test_embedding], [profile_embedding])[
            0
        ][0]

        # Compare against individual phrase embeddings
        phrase_embeddings = [np.array(emb) for emb in profile["phrase_embeddings"]]
        phrase_similarities = []
        for phrase_emb in phrase_embeddings:
            sim = cosine_similarity([test_embedding], [phrase_emb])[0][0]
            phrase_similarities.append(float(sim))  # Convert to Python float

        # Use maximum similarity as the final score
        max_phrase_sim = max(phrase_similarities)
        final_score = max(
            float(centroid_similarity), max_phrase_sim
        )  # Convert to Python float

        all_scores.append(
            {
                "user_id": profile["user_id"],
                "user_name": profile["user_name"],
                "score": final_score,
                "centroid_similarity": float(
                    centroid_similarity
                ),  # Convert to Python float
                "max_phrase_similarity": max_phrase_sim,
            }
        )

        if final_score > best_score:
            best_score = final_score
            best_match = profile

    # Sort all scores for ranking
    all_scores.sort(key=lambda x: x["score"], reverse=True)

    if best_score >= threshold:
        return best_match, best_score, all_scores
    else:
        return None, best_score, all_scores


@app.get("/")
def root():
    return {"message": "Voice Registry System", "version": "1.0.0"}


@app.get("/health")
def health():
    profiles = load_all_profiles()
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": device,
        "registered_voices": len(profiles),
        "identification_threshold": IDENTIFICATION_THRESHOLD,
    }


@app.get("/enrollment_phrases")
def get_enrollment_phrases():
    """Get standard enrollment phrases"""
    return {
        "phrases": ENROLLMENT_PHRASES,
        "required_count": REQUIRED_PHRASES,
        "instructions": "Record each phrase clearly. Speak naturally and consistently.",
    }


@app.post("/register_voice")
async def register_voice(
    user_name: str = Form(...),
    phrase_indices: str = Form(...),
    audios: List[UploadFile] = File(...),
):
    """Register a new voice with standard phrases"""

    # Parse phrase indices
    try:
        phrase_idx_list = [int(x.strip()) for x in phrase_indices.split(",")]
    except ValueError:
        return JSONResponse(
            {"error": "Invalid phrase indices format. Use comma-separated numbers."},
            status_code=400,
        )

    # Validate inputs
    if len(audios) != len(phrase_idx_list):
        return JSONResponse(
            {
                "error": f"Number of audio files ({len(audios)}) must match number of phrase indices ({len(phrase_idx_list)})"
            },
            status_code=400,
        )

    if len(audios) < REQUIRED_PHRASES:
        return JSONResponse(
            {"error": f"Need at least {REQUIRED_PHRASES} phrase recordings"},
            status_code=400,
        )

    # Validate phrase indices
    invalid_indices = [
        i for i in phrase_idx_list if i < 0 or i >= len(ENROLLMENT_PHRASES)
    ]
    if invalid_indices:
        return JSONResponse(
            {
                "error": f"Invalid phrase indices: {invalid_indices}. Must be 0-{len(ENROLLMENT_PHRASES) - 1}"
            },
            status_code=400,
        )

    # Check for duplicate user name
    existing_profiles = load_all_profiles()
    if any(p["user_name"].lower() == user_name.lower() for p in existing_profiles):
        return JSONResponse(
            {"error": f"User name '{user_name}' already registered"}, status_code=400
        )

    temp_files = []
    try:
        # Extract embeddings from all audio files
        embeddings = []
        for i, audio in enumerate(audios):
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                content = await audio.read()
                tmp.write(content)
                temp_files.append(tmp.name)

            # Extract embedding
            embedding = extract_voice_embedding(tmp.name)
            embeddings.append(embedding)

        # Create and save profile
        profile = create_voice_profile(embeddings, user_name, phrase_idx_list)
        profile_path = save_voice_profile(profile)

        return {
            "success": True,
            "user_id": profile["user_id"],
            "user_name": profile["user_name"],
            "phrases_recorded": len(embeddings),
            "consistency_score": profile["consistency_score"],
            "message": f"Voice successfully registered for {user_name}",
        }

    except Exception as e:
        tb = traceback.format_exc()
        print(f"[ERROR] Voice registration failed for {user_name}: {e}\n{tb}")
        return JSONResponse(
            {"error": f"Registration failed: {str(e)}"}, status_code=500
        )
    finally:
        # Clean up temporary files
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)


@app.post("/identify_voice")
async def identify_voice(audio: UploadFile = File(...)):
    """Identify speaker from voice registry"""

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Extract embedding from test audio
        test_embedding = extract_voice_embedding(tmp_path)

        # Identify speaker
        match, score, all_scores = identify_speaker(test_embedding)

        if match:
            return {
                "identified": True,
                "user_id": match["user_id"],
                "user_name": match["user_name"],
                "confidence_score": score,
                "threshold": IDENTIFICATION_THRESHOLD,
                "enrollment_date": match["enrollment_timestamp"],
                "ranking": all_scores[:5],  # Top 5 matches
            }
        else:
            return {
                "identified": False,
                "message": "Voice not recognized",
                "best_score": score,
                "threshold": IDENTIFICATION_THRESHOLD,
                "ranking": all_scores[:3],  # Top 3 closest matches
            }

    except Exception as e:
        tb = traceback.format_exc()
        print(f"[ERROR] Voice identification failed: {e}\n{tb}")
        return JSONResponse(
            {"error": f"Identification failed: {str(e)}"}, status_code=500
        )
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/voice_registry")
def get_voice_registry():
    """Get all registered voices"""
    profiles = load_all_profiles()

    registry = []
    for profile in profiles:
        registry.append(
            {
                "user_id": profile["user_id"],
                "user_name": profile["user_name"],
                "enrollment_date": profile["enrollment_timestamp"],
                "phrases_count": len(profile["phrase_embeddings"]),
                "consistency_score": profile["consistency_score"],
                "phrases_used": profile["phrases_used"],
            }
        )

    return {
        "total_voices": len(registry),
        "voices": registry,
        "identification_threshold": IDENTIFICATION_THRESHOLD,
    }


@app.delete("/voice_registry/{user_id}")
def delete_voice(user_id: str):
    """Delete a voice from registry"""
    profile_path = os.path.join(REGISTRY_DIR, f"{user_id}.json")

    if not os.path.exists(profile_path):
        return JSONResponse(
            {"error": f"Voice profile {user_id} not found"}, status_code=404
        )

    try:
        # Load profile to get user name
        with open(profile_path, "r") as f:
            profile = json.load(f)

        os.remove(profile_path)
        return {
            "success": True,
            "message": f"Voice profile for {profile['user_name']} deleted successfully",
        }
    except Exception as e:
        return JSONResponse(
            {"error": f"Failed to delete voice profile: {str(e)}"}, status_code=500
        )


@app.get("/system_stats")
def get_system_stats():
    """Get system statistics"""
    profiles = load_all_profiles()

    if not profiles:
        return {"total_profiles": 0, "average_consistency": 0, "system_ready": False}

    consistencies = [p["consistency_score"] for p in profiles]

    return {
        "total_profiles": len(profiles),
        "average_consistency": statistics.mean(consistencies),
        "min_consistency": min(consistencies),
        "max_consistency": max(consistencies),
        "identification_threshold": IDENTIFICATION_THRESHOLD,
        "system_ready": len(profiles) > 0,
        "model_info": {
            "name": MODEL_NAME,
            "device": device,
            "embedding_dimension": model.config.hidden_size,
        },
    }
