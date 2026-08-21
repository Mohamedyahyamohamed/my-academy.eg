export type QrSoundKind = "success" | "error";

type AudioContextConstructor = new () => AudioContext;

type AudioWindow = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

// Versioned URLs prevent iOS/Safari and installed PWAs from reusing an older
// cached WAV after the confirmation sound is refined.
const SOUND_URLS: Record<QrSoundKind, string> = {
  success: "/sounds/qr-success.wav?v=20260821-scanner-ref-7",
  error: "/sounds/qr-error.wav?v=20260821-scanner-ref-7",
};

let successAudio: HTMLAudioElement | null = null;
let errorAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = (window.AudioContext || (window as AudioWindow).webkitAudioContext) as AudioContextConstructor | undefined;
  if (!AudioContextClass) return null;
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
  return audioContext;
}

function getHtmlAudio(kind: QrSoundKind): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  const current = kind === "success" ? successAudio : errorAudio;
  if (current) return current;

  try {
    const audio = new Audio(SOUND_URLS[kind]);
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    if (kind === "success") successAudio = audio;
    else errorAudio = audio;
    return audio;
  } catch {
    return null;
  }
}

function unlockContext(context: AudioContext): void {
  // Keep the Web Audio fallback unlocked when the browser supports it.
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

function primeHtmlAudio(kind: QrSoundKind): void {
  const audio = getHtmlAudio(kind);
  if (!audio) return;
  try {
    audio.load();
    // A muted play/pause during the Start-camera gesture unlocks the media
    // element on iOS/Safari. The actual result tone is played later by the
    // asynchronous QR callback.
    audio.muted = true;
    const unlock = audio.play();
    void unlock.then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => {
      audio.muted = false;
    });
  } catch {
    audio.muted = false;
  }
}

/** Prime audio from a user gesture, such as pressing Start camera. */
export function primeQrSound(): void {
  if (typeof window === "undefined") return;
  primeHtmlAudio("success");
  primeHtmlAudio("error");

  const context = getAudioContext();
  if (!context) return;
  unlockContext(context);
  if (context.state === "suspended") void context.resume().catch(() => undefined);
}

function scheduleTone(context: AudioContext, kind: QrSoundKind): void {
  const frequencies = kind === "success" ? [1760] : [260, 180];
  const start = context.currentTime;

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneStart = start + index * (kind === "success" ? 0 : 0.09);
    const toneEnd = toneStart + (kind === "success" ? 0.12 : 0.12);

    oscillator.type = kind === "success" ? "sine" : "square";
    oscillator.frequency.setValueAtTime(frequency, toneStart);
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(kind === "success" ? 0.46 : 0.24, toneStart + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  });
}

function playWebAudioFallback(kind: QrSoundKind): void {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume().then(() => {
      if (context.state === "running") scheduleTone(context, kind);
    }).catch(() => undefined);
    return;
  }
  if (context.state === "running") scheduleTone(context, kind);
}

function vibrateQrSuccess(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    // Keep the haptic pulse short so it feels like a scanner confirmation.
    navigator.vibrate(45);
  } catch {
    // Vibration is optional and must never interrupt attendance.
  }
}

/** Play a short, non-blocking result tone for QR attendance. */
export function playQrResultSound(kind: QrSoundKind): void {
  const audio = getHtmlAudio(kind);
  if (audio) {
    try {
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 0.85;
      const playback = audio.play();
      if (kind === "success") vibrateQrSuccess();
      void playback.catch(() => playWebAudioFallback(kind));
      return;
    } catch {
      // Fall through to the Web Audio fallback.
    }
  }
  if (kind === "success") vibrateQrSuccess();
  playWebAudioFallback(kind);
}
