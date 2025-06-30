#!/usr/bin/env python3
"""
Standalone Audio Recording Tool
Records and saves 2 test audio files
"""

import os
import time
import wave
from datetime import datetime
from pathlib import Path

# Check for pyaudio availability
try:
    import pyaudio
    RECORDING_AVAILABLE = True
except ImportError:
    RECORDING_AVAILABLE = False
    print("❌ PyAudio not available. Install with: pip install pyaudio")
    exit(1)

# Audio settings
SAMPLE_RATE = 16000
CHANNELS = 1
DURATION = 5
CHUNK = 1024
FORMAT = pyaudio.paInt16


def record_audio(filename, phrase_text, duration=DURATION):
    """Record a single audio phrase"""
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
            format=FORMAT,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )

        frames = []

        # Record audio
        for i in range(0, int(SAMPLE_RATE / CHUNK * duration)):
            data = stream.read(CHUNK, exception_on_overflow=False)
            frames.append(data)

            # Progress indicator
            progress = (i + 1) / (SAMPLE_RATE / CHUNK * duration) * 100
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
        wf.setsampwidth(pyaudio.PyAudio().get_sample_size(FORMAT))
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
        wf.close()

        print(f"💾 Saved: {filename}")
        return filename

    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return None


def main():
    """Main recording function"""
    print("=== Standalone Audio Recording Tool ===")
    print(f"Sample Rate: {SAMPLE_RATE} Hz")
    print(f"Channels: {CHANNELS}")
    print(f"Duration: {DURATION} seconds")
    print(f"Format: 16-bit PCM")

    # Create output directory
    output_dir = Path("recorded_audio")
    output_dir.mkdir(exist_ok=True)
    print(f"\n📁 Audio files will be saved to: {output_dir.absolute()}")

    # Get user input for recordings
    print("\n" + "=" * 50)
    print("RECORDING SETUP")
    print("=" * 50)

    # First recording
    print("\n📝 First Recording:")
    phrase1 = input("Enter phrase to say (or press Enter for default): ").strip()
    if not phrase1:
        phrase1 = "Hello, this is my first test recording"
    
    duration1 = input(f"Enter duration in seconds (or press Enter for {DURATION}): ").strip()
    if duration1:
        try:
            duration1 = int(duration1)
        except ValueError:
            duration1 = DURATION
    else:
        duration1 = DURATION

    # Second recording
    print("\n📝 Second Recording:")
    phrase2 = input("Enter phrase to say (or press Enter for default): ").strip()
    if not phrase2:
        phrase2 = "This is my second test recording"
    
    duration2 = input(f"Enter duration in seconds (or press Enter for {DURATION}): ").strip()
    if duration2:
        try:
            duration2 = int(duration2)
        except ValueError:
            duration2 = DURATION
    else:
        duration2 = DURATION

    # Generate filenames
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename1 = output_dir / f"test_audio_1_{timestamp}.wav"
    filename2 = output_dir / f"test_audio_2_{timestamp}.wav"

    print(f"\n📋 Recording Summary:")
    print(f"   File 1: {filename1.name}")
    print(f"   Phrase: '{phrase1}'")
    print(f"   Duration: {duration1} seconds")
    print(f"   File 2: {filename2.name}")
    print(f"   Phrase: '{phrase2}'")
    print(f"   Duration: {duration2} seconds")

    input("\nPress Enter when ready to start recording...")

    # Record first audio
    print("\n" + "=" * 60)
    print("RECORDING FIRST AUDIO")
    print("=" * 60)
    
    result1 = record_audio(str(filename1), phrase1, duration1)
    if not result1:
        print("❌ Failed to record first audio")
        return

    # Option to re-record first audio
    redo1 = input("\nHappy with first recording? (Enter=yes, 'r'=re-record): ").strip().lower()
    if redo1 == 'r':
        print("🔄 Re-recording first audio...")
        if os.path.exists(result1):
            os.remove(result1)
        result1 = record_audio(str(filename1), phrase1, duration1)
        if not result1:
            print("❌ Failed to re-record first audio")
            return

    # Record second audio
    print("\n" + "=" * 60)
    print("RECORDING SECOND AUDIO")
    print("=" * 60)
    
    result2 = record_audio(str(filename2), phrase2, duration2)
    if not result2:
        print("❌ Failed to record second audio")
        return

    # Option to re-record second audio
    redo2 = input("\nHappy with second recording? (Enter=yes, 'r'=re-record): ").strip().lower()
    if redo2 == 'r':
        print("🔄 Re-recording second audio...")
        if os.path.exists(result2):
            os.remove(result2)
        result2 = record_audio(str(filename2), phrase2, duration2)
        if not result2:
            print("❌ Failed to re-record second audio")
            return

    # Final summary
    print("\n" + "=" * 60)
    print("RECORDING COMPLETE")
    print("=" * 60)
    print(f"✅ First audio: {filename1.name}")
    print(f"   Size: {os.path.getsize(filename1)} bytes")
    print(f"   Path: {filename1.absolute()}")
    print(f"✅ Second audio: {filename2.name}")
    print(f"   Size: {os.path.getsize(filename2)} bytes")
    print(f"   Path: {filename2.absolute()}")
    
    print(f"\n🎉 Both audio files recorded successfully!")
    print(f"📁 Check the '{output_dir}' folder for your recordings.")


if __name__ == "__main__":
    main() 