from pathlib import Path
import math
import wave
import struct

OUT = Path(__file__).resolve().parents[1] / "public" / "sounds"
OUT.mkdir(parents=True, exist_ok=True)


def write_wav(path: Path, notes: list[tuple[float, float]], duration: float = 0.22) -> None:
    sample_rate = 44100
    channels = 1
    amplitude = 0.42
    frames = int(sample_rate * duration)
    samples: list[int] = []
    for i in range(frames):
        t = i / sample_rate
        value = 0.0
        for start, frequency in notes:
            local = t - start
            if 0 <= local < 0.12:
                attack = min(1.0, local / 0.012)
                release = max(0.0, 1.0 - max(0.0, local - 0.08) / 0.04)
                envelope = attack * release
                value += math.sin(2 * math.pi * frequency * local) * envelope
        value = max(-1.0, min(1.0, value * amplitude))
        samples.append(int(value * 32767))

    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(b"".join(struct.pack("<h", sample) for sample in samples))


write_wav(OUT / "qr-success.wav", [(0.0, 880.0), (0.09, 1320.0)])
write_wav(OUT / "qr-error.wav", [(0.0, 260.0), (0.09, 180.0)])
print(f"Created {OUT / 'qr-success.wav'} and {OUT / 'qr-error.wav'}")
