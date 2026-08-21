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
    harmonic_level: float = 0.16,
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
                # A fast attack and short release keep the scanner beep crisp
                # without producing a click on phone speakers.
                attack = min(1.0, local / 0.004)
                release = max(0.0, 1.0 - max(0.0, local - note_duration + 0.022) / 0.022)
                envelope = attack * release
                fundamental = math.sin(2 * math.pi * frequency * local)
                harmonic = harmonic_level * math.sin(2 * math.pi * frequency * 2 * local)
                value += (fundamental + harmonic) * envelope
        value = max(-1.0, min(1.0, value * amplitude))
        samples.append(int(value * 32767))

    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(b"".join(struct.pack("<h", sample) for sample in samples))


# Classic QR/barcode scanner confirmation: one short, bright beep.
write_wav(
    OUT / "qr-success.wav",
    [(0.0, 2400.0)],
    duration=0.12,
    note_duration=0.09,
    amplitude=0.30,
    harmonic_level=0.08,
)

# Two descending notes remain reserved for rejected, duplicate, or invalid scans.
write_wav(
    OUT / "qr-error.wav",
    [(0.0, 260.0), (0.105, 180.0)],
    duration=0.28,
    note_duration=0.13,
)

print(f"Created {OUT / 'qr-success.wav'} and {OUT / 'qr-error.wav'}")
