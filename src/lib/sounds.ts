import clearUrl from '../assets/sounds/clear-chime.wav';
import aFewUrl from '../assets/sounds/a-few-tone.wav';
import moderateUrl from '../assets/sounds/moderate-tone.wav';
import aLotUrl from '../assets/sounds/drinking-hum.wav';
import type { DayLevel } from '../data/database';

// One sound per logged level; returning a day to unlogged is silent.
// The four tones step from bright to low: the chime, the chime three
// semitones lower (a-few-tone.wav), the hum four semitones higher
// (moderate-tone.wav), and the hum.
//
// Silent switch: on iPhone, plain <audio> plays as media and ignores the
// ring/silent switch (and pauses other apps' music). So:
//  1. the page declares its audio "ambient" (Safari 16.4+): it respects the
//     silent switch and mixes with other audio instead of interrupting it;
//  2. sounds play through the Web Audio API, which iOS mutes with the
//     switch, rather than through <audio> elements.
// Browsers only let audio start during a user gesture, and Safari may not
// count a moment later (after the tap has saved the day) as part of it. So
// unlockAudio() runs synchronously at the very start of a tap, and the sound
// itself plays once the day is saved.

const URLS: Record<DayLevel, string> = {
  clear: clearUrl,
  'a-few': aFewUrl,
  moderate: moderateUrl,
  'a-lot': aLotUrl,
};

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;
let lastError = '';
// For the Sound check: how often the audio had stopped and was rebuilt,
// and the last states the browser reported (e.g. "interrupted" on iOS).
let recoveries = 0;
const stateLog: string[] = [];
const logState = (s: string) => {
  const t = new Date().toTimeString().slice(0, 5);
  stateLog.push(`${t} ${s}`);
  if (stateLog.length > 4) stateLog.shift();
};
const buffers = new Map<DayLevel, Promise<AudioBuffer | null>>();

function setUp(): AudioContext | null {
  if (ctx) return ctx;
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (session) {
    try {
      session.type = 'ambient';
    } catch {
      // Not supported here; Web Audio below still follows the switch on iOS.
    }
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  const c = ctx;
  c.onstatechange = () => logState(c.state);
  // Decode all four now, so later taps play without delay.
  for (const level of Object.keys(URLS) as DayLevel[]) load(level);
  return ctx;
}

function load(level: DayLevel): Promise<AudioBuffer | null> {
  let p = buffers.get(level);
  if (!p) {
    p = fetch(URLS[level])
      .then((r) => r.arrayBuffer())
      .then((data) => ctx!.decodeAudioData(data))
      .catch((e) => {
        lastError = String(e);
        return null;
      });
    buffers.set(level, p);
  }
  return p;
}

/**
 * Call synchronously inside a tap handler, before any await. Creates and
 * resumes the audio context, and plays a moment of silence, which is what
 * unlocks Web Audio on iOS.
 */
export function unlockAudio(): void {
  // iOS pauses a page's audio when it goes to the background, the screen
  // locks, or a call or another app takes over, and doesn't always let it
  // resume: the page then stays silent until reloaded. So if the audio isn't
  // running, rebuild it now, inside the tap, which is what a reload does.
  if (ctx && ctx.state !== 'running') {
    logState(`rebuilt (was ${ctx.state})`);
    recoveries++;
    const old = ctx;
    ctx = null;
    buffers.clear(); // decoded again from the cached files: quick
    old.close().catch(() => undefined);
  }
  const c = setUp();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch((e) => (lastError = String(e)));
  try {
    const silence = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = silence;
    s.connect(c.destination);
    s.start();
  } catch (e) {
    lastError = String(e);
  }
}

/** For the temporary Sound check in Settings. */
export function audioStatus(): string {
  const session = (navigator as AudioSessionNavigator).audioSession?.type ?? 'not supported';
  const state = ctx ? ctx.state : 'not created yet';
  const loaded = [...buffers.keys()].length;
  return [
    `audio session: ${session} · audio: ${state} · sounds loaded: ${loaded}/4`,
    `rebuilt after stopping: ${recoveries}×`,
    stateLog.length ? `recent: ${stateLog.join(', ')}` : '',
    lastError ? `error: ${lastError}` : '',
  ].filter(Boolean).join(' · ');
}

/** For tests: the current audio context. */
export const currentAudioContext = () => ctx;

export function playLoggingSound(level: DayLevel): void {
  const c = setUp();
  if (import.meta.env.DEV) window.dispatchEvent(new CustomEvent('ct:sound', { detail: level }));
  if (!c) return;
  // A paused context (iOS suspends it until a gesture) resumes on this tap.
  if (c.state === 'suspended') c.resume().catch(() => undefined);
  load(level).then((buffer) => {
    if (!buffer) return; // a sound that can't play isn't worth interrupting logging for
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start();
  });
}
