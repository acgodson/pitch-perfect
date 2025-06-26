FROM python:3.11-slim

WORKDIR /app


RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*


COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt


RUN python -c "from transformers import Wav2Vec2FeatureExtractor, WavLMModel; \
               model_name = 'microsoft/wavlm-base-plus'; \
               Wav2Vec2FeatureExtractor.from_pretrained(model_name); \
               WavLMModel.from_pretrained(model_name)"


COPY app.py ./


RUN mkdir -p /app/data/voice_registry

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]