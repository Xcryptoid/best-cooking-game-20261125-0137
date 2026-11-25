// Sound, synthesized live with the Web Audio API: no audio files, no network. A short blip for
// picking things up, a sizzle loop while food cooks, a ding when a dish is served, a low buzz
// when a customer walks out. Everything is guarded: if the browser has no audio, the game
// simply plays silent.

export function createAudio() {
  let context = null;
  let sizzle = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, gainValue, when = 0) {
    const ctx = ensure();
    if (ctx === null) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + seconds);
    } catch {
      // Sound is garnish: a failure here must never stop the game.
    }
  }

  return {
    /** Unlock audio on the first user gesture (browsers require one). */
    unlock() {
      const ctx = ensure();
      if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    pick() {
      tone(520, 0.08, 'sine', 0.12);
    },
    place() {
      tone(340, 0.08, 'sine', 0.12);
    },
    ding() {
      tone(880, 0.25, 'sine', 0.18);
      tone(1318, 0.35, 'sine', 0.14, 0.09);
    },
    error() {
      tone(160, 0.18, 'square', 0.08);
    },
    walkout() {
      tone(220, 0.3, 'sawtooth', 0.07);
      tone(175, 0.4, 'sawtooth', 0.07, 0.12);
    },
    /** Start the frying sizzle while anything cooks; stop it when nothing does. */
    setSizzle(on) {
      const ctx = ensure();
      if (ctx === null) return;
      try {
        if (on && sizzle === null) {
          const length = ctx.sampleRate * 1;
          const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 5200;
          const gain = ctx.createGain();
          gain.gain.value = 0.035;
          source.connect(filter).connect(gain).connect(ctx.destination);
          source.start();
          sizzle = { source, gain };
        } else if (!on && sizzle !== null) {
          sizzle.source.stop();
          sizzle = null;
        }
      } catch {
        sizzle = null;
      }
    },
  };
}
