from pathlib import Path
import math
import struct
import wave

OUT = Path(__file__).resolve().parents[1] / "public" / "sounds"
OUT.mkdir(parents=True, exist_ok=True)


def write_wav(
    path: Path,
    notes: list[tuple[float, float]],
    duration: float,
    note_duration: float,
    amplitude: float = 0.38,
    waveform: str = "sine",
) -> None:
    sample_rate = 44100
    channels = 1
    frames = int(sample_rate * duration)
    samples: list[int] = []

    for i in range(frames):
        t = i / sample_rate
        value = 0.0
        for start, frequency in notes:
            local = t - start
            if 0 <= local < note_duration:
                # Short attack/release avoids clicks while keeping the scanner
                # confirmation crisp and immediately recognizable.
                attack = min(1.0, local / 0.004)
                release = max(0.0, 1.0 - max(0.0, local - note_duration + 0.026) / 0.026)
                envelope = attack * release
                phase = math.sin(2 * math.pi * frequency * local)
                tone = (1.0 if phase >= 0 else -1.0) if waveform == "square" else phase
                value += tone * envelope
        value = max(-1.0, min(1.0, value * amplitude))
        samples.append(int(value * 32767))

    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(b"".join(struct.pack("<h", sample) for sample in samples))


# Reference-matched QR/barcode scanner confirmation: one clean electronic sine beep.
write_wav(
    OUT / "qr-success.wav",
    [(0.0, 1760.0)],
    duration=0.15,
    note_duration=0.12,
    amplitude=0.46,
    waveform="sine",
)

# Two descending notes remain reserved for rejected, duplicate, or invalid scans.
write_wav(
    OUT / "qr-error.wav",
    [(0.0, 260.0), (0.105, 180.0)],
    duration=0.28,
    note_duration=0.13,
    amplitude=0.38,
    waveform="sine",
)

print(f"Created {OUT / 'qr-success.wav'} and {OUT / 'qr-error.wav'}")

  
