// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  playSfx,
  isMuted,
  setMuted,
  subscribeMuted,
  _resetSoundFxForTests,
} from './soundFx';

class FakeCtx {
  static instances = 0;
  static last: FakeCtx | null = null;
  state = 'suspended';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => Promise.resolve());
  createOscillator = vi.fn(() => ({
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));
  constructor() {
    FakeCtx.instances++;
    FakeCtx.last = this;
  }
}

describe('soundFx', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetSoundFxForTests();
    FakeCtx.instances = 0;
    FakeCtx.last = null;
    vi.stubGlobal('AudioContext', FakeCtx);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the AudioContext lazily and reuses it across calls', () => {
    expect(FakeCtx.instances).toBe(0);

    playSfx('match');

    expect(FakeCtx.instances).toBe(1);
    const ctx = FakeCtx.last as FakeCtx;
    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    expect(ctx.createGain).toHaveBeenCalledTimes(3);
    expect(ctx.resume).toHaveBeenCalled();

    playSfx('flip');

    expect(FakeCtx.instances).toBe(1);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it('setMuted persists the flag and silences playSfx', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem('wa.muted')).toBe('1');

    playSfx('win');
    expect(FakeCtx.instances).toBe(0);

    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(localStorage.getItem('wa.muted')).toBe(null);
  });

  it('notifies muted subscribers until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMuted(listener);

    setMuted(true);
    expect(listener).toHaveBeenCalledTimes(1);

    setMuted(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();

    setMuted(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not throw when AudioContext is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playSfx('hit')).not.toThrow();
  });
});
