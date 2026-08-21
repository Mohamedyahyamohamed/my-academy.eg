export type QrSoundKind = "success" | "error";

type AudioContextConstructor = new () => AudioContext;

type AudioWindow = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = (window.AudioContext || (window as AudioWindow).webkitAudioContext) as AudioContextConstructor | undefined;
  if (!AudioContextClass) return null;
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
  return audioContext;
}

function unlockContext(context: AudioContext): void {
  // A very short silent source makes iOS/Safari accept subsequent audio
  // scheduled after the camera callback, which is not itself a user gesture.
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.00001, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.01);
  } catch {
    // Audio feedback is optional and must never interrupt attendance.
  }
}

/** Prime the audio context from a user gesture, such as pressing Start camera. */
export function primeQrSound(): void {
  const context = getAudioContext();
  if (!context) return;
  unlockContext(context);
  if (context.state === "suspended") void context.resume().catch(() => undefined);
}

function scheduleTone(context: AudioContext, kind: QrSoundKind): void {
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
    gain.gain.exponentialRampToValueAtTime(kind === "success" ? 0.3 : 0.24, toneStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  });
}

/** Play a short, non-blocking result tone for QR attendance. */
export function playQrResultSound(kind: QrSoundKind): void {
  const context = getAudioContext();
  if (!context) return;

  // The scan callback is asynchronous. Always resume first, then schedule;
  // scheduling while suspended is ignored or delayed inconsistently on phones.
  if (context.state === "suspended") {
    void context.resume().then(() => {
      if (context.state === "running") scheduleTone(context, kind);
    }).catch(() => undefined);
    return;
  }

  if (context.state === "running") scheduleTone(context, kind);
}
