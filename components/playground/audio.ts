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
    keepAlive(context);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/**
 * Chrome (and others) auto-suspend an AudioContext after a stretch with no
 * audible output to save power. Our sounds are all short blips separated by
 * seconds of silence, so between them the context kept dropping back to
 * 'suspended' — and every play() had to pay a fresh, audible resume() delay.
 * A continuous, inaudible (non-zero) tone keeps the context genuinely busy
 * so it never has cause to suspend, and every real sound schedules instantly.
 */
function keepAlive(ac: AudioContext) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  gain.gain.value = 0.00001;
  osc.frequency.value = 20;
  osc.connect(gain).connect(ac.destination);
  osc.start();
}

/**
 * Creates and resumes the AudioContext right away, without playing anything.
 * Call this from the gesture that starts an interaction (pointerdown,
 * keydown) so the context is already running by the time a collision fires
 * a sound a few physics steps later — resume() is asynchronous, and without
 * this the first sound of a session lags behind the action that caused it.
 */
export function primeAudio() {
  audio();
}

/**
 * Attack time. These are percussive blips, so the onset has to be effectively
 * instant: an exponential ramp is linear in decibels, so climbing to `peak`
 * from a near-zero floor leaves the sound inaudible for most of the ramp and
 * pushes its *perceived* start well past the hit that caused it. A linear
 * ramp can begin at true zero, so the attack is over before it can be heard
 * as a swell — which is what makes the sound land with the collision.
 */
const ATTACK = 0.0015;

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
  const attack = Math.min(ATTACK, duration / 2);
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  // Exponential decay for a natural tail; it cannot reach 0, hence the floor.
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

/** Picking up a badge: a light upward tick. */
export function playGrab() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 'sine', 340, 460, 0.07, 0.05);
}

/** Letting go of a dragged badge: a soft downward drop. */
export function playRelease() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 'sine', 300, 190, 0.09, 0.05);
}

/** A dragged badge knocking into another badge: a short, woody click. */
export function playCollide() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 'square', 220, 140, 0.06, 0.045);
}

/** Clicking a badge: a snappy pop, the tactile half of the click feedback. */
export function playTap() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 'triangle', 880, 520, 0.045, 0.06);
  tone(ac, 'sine', 300, 200, 0.06, 0.04, 0.008);
}
