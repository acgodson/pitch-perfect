#!/usr/bin/env python3
"""
Unified Voice Registry Test Tool
Combines recording, registration, and identification testing
"""

import requests
import json
import os
import time
import wave
from pathlib import Path
from datetime import datetime

# Check for pyaudio availability
try:
    import pyaudio

    RECORDING_AVAILABLE = True
except ImportError:
    RECORDING_AVAILABLE = False

BASE_URL = "http://localhost:8000"
SAMPLE_RATE = 16000
CHANNELS = 1
DURATION = 5


def test_api_connection():
    """Test API connection"""
    print("Testing API connection...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            result = response.json()
            print("✅ API Connected")
            print(f"   Model: {result['model']}")
            print(f"   Device: {result['device']}")
            print(f"   Registered Voices: {result['registered_voices']}")
            print(f"   Threshold: {result['identification_threshold']}")
            return True
        else:
            print(f"❌ API responded with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False


def get_enrollment_phrases():
    """Get enrollment phrases from API"""
    try:
        response = requests.get(f"{BASE_URL}/enrollment_phrases")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get phrases: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting phrases: {e}")
        return None


def record_audio(filename, phrase_text, duration=DURATION):
    """Record a single audio phrase"""
    if not RECORDING_AVAILABLE:
        print("❌ PyAudio not available. Install with: pip install pyaudio")
        return None

    chunk = 1024
    format = pyaudio.paInt16

    p = pyaudio.PyAudio()

    print(f"\n🎙️  Recording: '{phrase_text}'")
    print(f"Duration: {duration} seconds")
    print("\nCountdown:")

    # Countdown
    for i in range(3, 0, -1):
        print(f"{i}...")
        time.sleep(1)

    print("🔴 Recording now - speak clearly!")

    try:
        stream = p.open(
            format=format,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=chunk,
        )

        frames = []

        # Record audio
        for i in range(0, int(SAMPLE_RATE / chunk * duration)):
            data = stream.read(chunk, exception_on_overflow=False)
            frames.append(data)

            # Progress indicator
            progress = (i + 1) / (SAMPLE_RATE / chunk * duration) * 100
            print(f"\rRecording... {progress:.0f}%", end="", flush=True)

        print("\n✅ Recording complete!")

        stream.stop_stream()
        stream.close()

    except Exception as e:
        print(f"\n❌ Recording error: {e}")
        p.terminate()
        return None

    p.terminate()

    # Save audio file
    try:
        wf = wave.open(filename, "wb")
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(pyaudio.PyAudio().get_sample_size(format))
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
        wf.close()

        print(f"💾 Saved: {filename}")
        return filename

    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return None


def record_enrollment_session(user_name):
    """Record complete enrollment session for a user"""
    import random

    print(f"\n=== Voice Enrollment for {user_name} ===")

    # Get phrases from API
    phrase_data = get_enrollment_phrases()
    if not phrase_data:
        return None, None

    phrases = phrase_data["phrases"]
    required_count = phrase_data["required_count"]

    # Randomly select phrases for enrollment
    available_indices = list(range(len(phrases)))
    random.shuffle(available_indices)
    selected_indices = available_indices[:required_count]

    print(f"\nYou will record {required_count} randomly selected phrases.")
    print("System will present each phrase one by one.")
    print("Speak clearly and naturally for each phrase.")

    input("\nPress Enter when ready to start recording...")

    # Record phrases one by one
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    audio_files = []

    for i, phrase_idx in enumerate(selected_indices):
        phrase_text = phrases[phrase_idx]
        filename = f"voice_{user_name}_{timestamp}_phrase_{phrase_idx}.wav"

        print(f"\n" + "=" * 60)
        print(f"PHRASE {i + 1} of {required_count}")
        print("=" * 60)
        print(f"\nPlease read this phrase clearly:")
        print(f'\n📝 "{phrase_text}"')
        print()

        # Ask if ready to record this phrase
        ready = (
            input(
                "Press Enter when ready to record (or 'skip' to try a different phrase): "
            )
            .strip()
            .lower()
        )

        if ready == "skip":
            print("🔄 Selecting a different phrase...")
            # Get next available phrase
            if len(available_indices) > required_count:
                new_phrase_idx = available_indices[required_count + i]
                selected_indices[i] = new_phrase_idx
                phrase_text = phrases[new_phrase_idx]
                filename = f"voice_{user_name}_{timestamp}_phrase_{new_phrase_idx}.wav"
                print(f'\n📝 New phrase: "{phrase_text}"')
                print()
                input("Press Enter when ready to record: ")

        result = record_audio(filename, phrase_text)
        if result:
            audio_files.append(result)
            print(f"✅ Phrase {i + 1} recorded successfully!")

            # Option to re-record if not happy
            if i < required_count - 1:  # Don't ask on last phrase
                redo = (
                    input("\nHappy with this recording? (Enter=yes, 'r'=re-record): ")
                    .strip()
                    .lower()
                )
                if redo == "r":
                    print("🔄 Re-recording this phrase...")
                    os.remove(result)  # Delete the file
                    audio_files.pop()  # Remove from list

                    # Re-record the same phrase
                    result = record_audio(filename, phrase_text)
                    if result:
                        audio_files.append(result)
                        print(f"✅ Phrase {i + 1} re-recorded successfully!")
                    else:
                        print(f"❌ Failed to re-record phrase {i + 1}")
                        # Clean up partial recordings
                        for f in audio_files:
                            if os.path.exists(f):
                                os.remove(f)
                        return None, None
        else:
            print(f"❌ Failed to record phrase {i + 1}")
            # Clean up partial recordings
            for f in audio_files:
                if os.path.exists(f):
                    os.remove(f)
            return None, None

    print(f"\n🎉 All {required_count} phrases recorded successfully!")
    print(f"📊 Voice profile will be created from these recordings.")

    return audio_files, selected_indices


def register_voice_with_api(user_name, audio_files, phrase_indices):
    """Register voice with the API"""
    print(f"\n📤 Registering voice for {user_name}...")

    try:
        # Prepare files for upload
        files = []
        for audio_file in audio_files:
            files.append(("audios", open(audio_file, "rb")))

        # Prepare form data
        data = {
            "user_name": user_name,
            "phrase_indices": ",".join(map(str, phrase_indices)),
        }

        # Send registration request
        response = requests.post(f"{BASE_URL}/register_voice", files=files, data=data)

        # Close file handles
        for _, f in files:
            f.close()

        if response.status_code == 200:
            result = response.json()
            print("✅ Voice registration successful!")
            print(f"   User ID: {result['user_id']}")
            print(f"   Consistency Score: {result['consistency_score']:.3f}")
            return result["user_id"]
        else:
            error = response.json().get("error", "Unknown error")
            print(f"❌ Registration failed: {error}")
            return None

    except Exception as e:
        print(f"❌ Error during registration: {e}")
        return None


def record_and_identify():
    """Record audio and test identification"""
    if not RECORDING_AVAILABLE:
        print("❌ PyAudio not available for recording")
        return

    print(f"\n🔍 Voice Identification Test")
    print("Record a sample to test identification...")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_filename = f"test_voice_{timestamp}.wav"

    result = record_audio(test_filename, "Say anything for identification", duration=3)
    if not result:
        return

    # Test identification
    test_voice_identification(test_filename)

    # Clean up test file
    if os.path.exists(test_filename):
        os.remove(test_filename)


def test_voice_identification(audio_file):
    """Test voice identification with an audio file"""
    print(f"\nTesting voice identification with {audio_file}...")

    if not os.path.exists(audio_file):
        print(f"❌ Audio file not found: {audio_file}")
        return False

    try:
        with open(audio_file, "rb") as f:
            files = {"audio": f}
            response = requests.post(f"{BASE_URL}/identify_voice", files=files)

        if response.status_code == 200:
            result = response.json()
            if result["identified"]:
                print("✅ Voice identified!")
                print(f"   User: {result['user_name']}")
                print(f"   Confidence: {result['confidence_score']:.3f}")
                print(f"   Threshold: {result['threshold']:.3f}")

                if "ranking" in result:
                    print("   Top matches:")
                    for i, match in enumerate(result["ranking"][:3]):
                        print(
                            f"     {i + 1}. {match['user_name']}: {match['score']:.3f}"
                        )
            else:
                print("❌ Voice not recognized")
                print(f"   Best score: {result['best_score']:.3f}")
                print(f"   Threshold: {result['threshold']:.3f}")

                if "ranking" in result:
                    print("   Closest matches:")
                    for i, match in enumerate(result["ranking"][:3]):
                        print(
                            f"     {i + 1}. {match['user_name']}: {match['score']:.3f}"
                        )
            return True
        else:
            error = response.json().get("error", "Unknown error")
            print(f"❌ Identification failed: {error}")
            return False

    except Exception as e:
        print(f"❌ Error during identification: {e}")
        return False


def show_voice_registry():
    """Show current voice registry"""
    print("\nVoice Registry Status...")
    try:
        response = requests.get(f"{BASE_URL}/voice_registry")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Voice registry retrieved")
            print(f"   Total voices: {result['total_voices']}")

            if result["voices"]:
                print("   Registered voices:")
                for voice in result["voices"]:
                    print(
                        f"     • {voice['user_name']} (consistency: {voice['consistency_score']:.3f})"
                    )
            else:
                print("   No voices registered yet")
            return result
        else:
            print(f"❌ Failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def show_enrollment_phrases():
    """Show available enrollment phrases"""
    print("\nEnrollment Phrases...")
    phrase_data = get_enrollment_phrases()
    if phrase_data:
        print("✅ Available phrases:")
        print(f"   Required count: {phrase_data['required_count']}")
        print("   Phrase options:")
        for i, phrase in enumerate(phrase_data["phrases"]):
            print(f"     {i}: {phrase}")
        return phrase_data
    return None


def find_audio_files():
    """Find available audio files in current directory"""
    extensions = [".wav", ".mp3", ".flac", ".m4a"]
    audio_files = []

    current_dir = Path(".")
    for ext in extensions:
        audio_files.extend(list(current_dir.glob(f"*{ext}")))

    return [str(f) for f in audio_files]


def test_with_existing_files():
    """Test identification with existing audio files"""
    audio_files = find_audio_files()
    if not audio_files:
        print("❌ No audio files found in current directory")
        return

    print(f"\nFound {len(audio_files)} audio files:")
    for i, file in enumerate(audio_files):
        print(f"   {i + 1}: {file}")

    try:
        file_choice = int(input(f"Select file (1-{len(audio_files)}): ")) - 1
        if 0 <= file_choice < len(audio_files):
            test_voice_identification(audio_files[file_choice])
        else:
            print("❌ Invalid file number")
    except ValueError:
        print("❌ Invalid input")


def complete_user_registration():
    """Complete registration workflow for a new user"""
    if not RECORDING_AVAILABLE:
        print("❌ Cannot record audio. PyAudio not available.")
        print("Install with: pip install pyaudio")
        return

    user_name = input("\nEnter user name for registration: ").strip()
    if not user_name:
        print("❌ User name required")
        return

    # Record enrollment session
    audio_files, phrase_indices = record_enrollment_session(user_name)
    if not audio_files:
        return

    # Register with API
    user_id = register_voice_with_api(user_name, audio_files, phrase_indices)

    # Clean up audio files
    for audio_file in audio_files:
        if os.path.exists(audio_file):
            os.remove(audio_file)

    if user_id:
        print(f"\n🎉 {user_name} successfully registered!")
        print(f"User ID: {user_id}")
    else:
        print(f"\n❌ Registration failed for {user_name}")


def main():
    """Main interactive menu"""
    print("=== Voice Registry System - Unified Test Tool ===")

    # Check PyAudio availability
    if not RECORDING_AVAILABLE:
        print("\n⚠️  PyAudio not available - recording features disabled")
        print("Install with: pip install pyaudio")

    # Test API connection first
    if not test_api_connection():
        print("\n❌ Cannot connect to API. Make sure the server is running:")
        print("   python app.py")
        return

    while True:
        print("\n" + "=" * 50)
        print("VOICE REGISTRY TEST MENU")
        print("=" * 50)
        print("1. Show enrollment phrases")
        print("2. Register new voice (record + register)")
        print("3. Test voice identification (record + identify)")
        print("4. View voice registry")
        print("5. Test with existing audio files")
        print("6. System statistics")
        print("7. Exit")

        if not RECORDING_AVAILABLE:
            print("\n⚠️  Options 2-3 require PyAudio for recording")

        choice = input("\nSelect option (1-7): ").strip()

        if choice == "1":
            show_enrollment_phrases()

        elif choice == "2":
            complete_user_registration()

        elif choice == "3":
            record_and_identify()

        elif choice == "4":
            show_voice_registry()

        elif choice == "5":
            test_with_existing_files()

        elif choice == "6":
            try:
                response = requests.get(f"{BASE_URL}/system_stats")
                if response.status_code == 200:
                    result = response.json()
                    print("✅ System Statistics:")
                    print(f"   Total profiles: {result['total_profiles']}")
                    if result["total_profiles"] > 0:
                        print(
                            f"   Average consistency: {result['average_consistency']:.3f}"
                        )
                        print(f"   System ready: {result['system_ready']}")
                else:
                    print("❌ Failed to get statistics")
            except Exception as e:
                print(f"❌ Error: {e}")

        elif choice == "7":
            print("👋 Goodbye!")
            break

        else:
            print("❌ Invalid choice")


if __name__ == "__main__":
    main()
