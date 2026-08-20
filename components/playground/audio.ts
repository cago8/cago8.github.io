/**
 * Two sounds, synthesized rather than downloaded: a dull bonk when the diver
 * bumps something too gently to open it, and a two-tone chime when a hit lands
 * hard enough. Both are short, quiet, and only ever fire in response to
 * something the visitor did.
 *
 * The AudioContext is created on the first sound, which is always after a
 * gesture — browsers block audio before that, and building it eagerly would
 * leave a suspended context running for visitors who never play.
 */
const STORAGE_KEY = 'cb-sound';

let context: AudioContext | null = null;
let muted: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

export function subscribeMuted(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getMuted(): boolean {
  if (muted === null) muted = read();
  return muted;
}

/** The server has no preference to report; sound is on until told otherwise. */
export function getServerMuted(): boolean {
  return false;
}

export function setMuted(next: boolean) {
  if (muted === next) return;
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on');
  } catch {
    /* the choice just does not persist */
  }
  listeners.forEach((listener) => listener());
}

function audio(): AudioContext | null {
  if (getMuted()) return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(
  ac: AudioContext,
  type: OscillatorType,
  from: number,
  to: number,
  duration: number,
  peak: number,
  delay = 0,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const start = ac.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Too soft to open anything: a low, damped knock. */
export function playBonk() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 'sine', 90, 58, 0.13, 0.13);
}

/** A hit that opens a panel: a short rising two-tone. */
export function playOpen() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 'triangle', 520, 620, 0.09, 0.07);
  tone(ac, 'triangle', 720, 790, 0.14, 0.055, 0.07);
}
