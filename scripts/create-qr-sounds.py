from pathlib import Path
import math
import struct
import wave

OUT = Path(__file__).resolve().parents[1] / "public" / "sounds"
OUT.mkdir(parents=True, exist_ok=True)


def write_wav(
    path: Path,
    notes: list[tuple[float, float]],
    duration: float = 0.28,
    note_duration: float = 0.13,
) -> None:
    sample_rate = 44100
    channels = 1
    amplitude = 0.38
    frames = int(sample_rate * duration)
    samples: list[int] = []

    for i in range(frames):
        t = i / sample_rate
        value = 0.0
        for start, frequency in notes:
            local = t - start
            if 0 <= local < note_duration:
                attack = min(1.0, local / 0.012)
                release = max(0.0, 1.0 - max(0.0, local - note_duration + 0.035) / 0.035)
                envelope = attack * release
                # A quiet second harmonic makes the confirmation chime clearer
                # on small phone speakers without making it harsh.
                fundamental = math.sin(2 * math.pi * frequency * local)
                harmonic = 0.16 * math.sin(2 * math.pi * frequency * 2 * local)
                value += (fundamental + harmonic) * envelope
        value = max(-1.0, min(1.0, value * amplitude))
        samples.append(int(value * 32767))

    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(b"".join(struct.pack("<h", sample) for sample in samples))


# Two very short, nearly identical beeps: the requested "tin-tin" confirmation sound.
write_wav(
    OUT / "qr-success.wav",
    [(0.0, 880.0), (0.085, 880.0)],
    duration=0.19,
    note_duration=0.055,
)

# Two descending notes remain reserved for rejected, duplicate, or invalid scans.
write_wav(OUT / "qr-error.wav", [(0.0, 260.0), (0.105, 180.0)])

print(f"Created {OUT / 'qr-success.wav'} and {OUT / 'qr-error.wav'}")
