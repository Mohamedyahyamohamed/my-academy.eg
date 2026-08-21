export type QrSoundKind = "success" | "error";

type AudioContextConstructor = new () => AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = (window.AudioContext || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

/** Prime the audio context from a user gesture, such as pressing Start camera. */
export function primeQrSound(): void {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;
  void context.resume().catch(() => undefined);
}

/** Play a short, non-blocking result tone for QR attendance. */
export function playQrResultSound(kind: QrSoundKind): void {
  const context = getAudioContext();
  if (!context) return;

  const frequencies = kind === "success" ? [880, 1320] : [260, 180];
  const start = context.currentTime;

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneStart = start + index * 0.09;
    const toneEnd = toneStart + 0.12;

    oscillator.type = kind === "success" ? "sine" : "square";
    oscillator.frequency.setValueAtTime(frequency, toneStart);
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(0.16, toneStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  });
}
