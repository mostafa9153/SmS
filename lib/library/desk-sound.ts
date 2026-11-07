"use client";

/** Desk feedback you can hear without looking at the screen: a short high beep for success, a low double buzz for a refusal. */
export type DeskTone = "ok" | "warn" | "error";

let ctx: AudioContext | null = null;

function tone(freq: number, startS: number, lenS: number, type: OscillatorType, gain: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ctx.currentTime + startS);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startS + lenS);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + startS);
  osc.stop(ctx.currentTime + startS + lenS + 0.02);
}

export function playTone(kind: DeskTone) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    if (kind === "ok") tone(1040, 0, 0.09, "sine", 0.25);
    else if (kind === "warn") tone(660, 0, 0.16, "triangle", 0.25);
    else {
      tone(220, 0, 0.18, "sawtooth", 0.22);
      tone(180, 0.22, 0.26, "sawtooth", 0.22);
    }
  } catch {
    // no audio device or blocked before the first click: the colours still say it
  }
}
