import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Sound effects felt like they lagged behind the collisions that caused them.
 * The cause was the gain envelope, not the AudioContext lifecycle: an
 * exponential ramp is linear in decibels, so climbing from a near-zero floor
 * to peak over 12 ms left each blip inaudible for most of that ramp and
 * pushed its perceived onset well past the hit. These tests assert the
 * envelope shape that keeps the onset instant, because latency is the one
 * thing about these sounds that cannot be checked by reading the code.
 */

/** The longest attack that still reads as a percussive hit rather than a swell. */
const MAX_ATTACK = 0.002;

type Automation = { kind: 'set' | 'linear' | 'exponential'; value: number; time: number };

class FakeParam {
  events: Automation[] = [];
  value = 0;
  setValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'set', value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'linear', value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'exponential', value, time });
    return this;
  }
}

class FakeNode {
  connect<T>(destination: T): T {
    return destination;
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start() {}
  stop() {}
}

class FakeAudioContext {
  state = 'running';
  currentTime = 100;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  createOscillator() {
    return new FakeOscillator();
  }
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  resume() {
    return Promise.resolve();
  }
}

let ctx: FakeAudioContext;
let audio: typeof import('./audio');

beforeAll(async () => {
  (globalThis as { window?: unknown }).window = {
    AudioContext: function AudioContextStub(this: unknown) {
      ctx = new FakeAudioContext();
      return ctx;
    },
  };
  audio = await import('./audio');
  // The context is built lazily on first use; prime it so `ctx` exists before
  // the first envelope is recorded.
  audio.primeAudio();
});

/**
 * Every envelope a single play() call scheduled. The keep-alive oscillator
 * sets its gain via `.value` rather than automation, so it records no events
 * and drops out here on its own.
 */
function envelopes(play: () => void): Automation[][] {
  ctx.gains.length = 0;
  play();
  return ctx.gains.map((g) => g.gain.events).filter((events) => events.length > 0);
}

const SOUNDS = ['playBonk', 'playOpen', 'playGrab', 'playRelease', 'playCollide', 'playTap'] as const;

describe.each(SOUNDS)('%s', (name) => {
  it('opens from true silence and reaches peak within the attack window', () => {
    const tones = envelopes(() => audio[name]());
    expect(tones.length).toBeGreaterThan(0);

    for (const events of tones) {
      const [open, attack] = events;

      // Exactly zero, not a 0.0001 floor: a linear ramp may start at silence,
      // which is what lets the attack be this short at all.
      expect(open.kind).toBe('set');
      expect(open.value).toBe(0);

      // Linear, so amplitude rises evenly instead of spending the ramp far
      // below audibility the way a decibel-linear exponential does.
      expect(attack.kind).toBe('linear');
      expect(attack.value).toBeGreaterThan(0);
      expect(attack.time - open.time).toBeGreaterThan(0);
      expect(attack.time - open.time).toBeLessThanOrEqual(MAX_ATTACK);
    }
  });

  it('decays to a tail rather than cutting off', () => {
    for (const events of envelopes(() => audio[name]())) {
      const decay = events[events.length - 1];
      expect(decay.kind).toBe('exponential');
      // Exponential curves cannot reach zero, so the tail ends at a floor.
      expect(decay.value).toBeGreaterThan(0);
      expect(decay.time).toBeGreaterThan(events[1].time);
    }
  });
});

it('schedules the first tone of a sound at the current time, never later', () => {
  for (const name of SOUNDS) {
    const [first] = envelopes(() => audio[name]());
    expect(first[0].time, name).toBe(ctx.currentTime);
  }
});
