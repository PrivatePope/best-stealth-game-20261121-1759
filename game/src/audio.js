// Tiny synthesised sound: no audio files, just a WebAudio oscillator and a
// gain envelope. Footsteps tick while the player walks (louder and faster
// when sprinting, so a guard's approach is audible), a two-tone sting marks
// an alarm, and short pings mark pickups, level clears and being caught.
// Everything is guarded: if audio is unavailable the game stays silent.
export function createAudio() {
  let context = null;
  let muted = false;
  let stepTimer = 0;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, volume, when) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const start = ctx.currentTime + (when || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume || 0.08, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    } catch {
      // A failed blip never stops the game.
    }
  }

  /** Call every frame while playing; ticks a footstep on a timer. */
  function footstep(dt, sprint, sneak) {
    if (sneak) return;
    stepTimer -= dt;
    if (stepTimer > 0) return;
    stepTimer = sprint ? 0.26 : 0.42;
    tone(sprint ? 95 : 70, 0.07, 'triangle', sprint ? 0.09 : 0.05);
  }

  function alarm() {
    tone(620, 0.14, 'square', 0.06);
    tone(460, 0.2, 'square', 0.06, 0.14);
  }

  function spotted() {
    tone(880, 0.1, 'sine', 0.07);
  }

  function pickup() {
    tone(1320, 0.1, 'sine', 0.07);
    tone(1760, 0.14, 'sine', 0.06, 0.08);
  }

  function levelClear() {
    tone(523, 0.12, 'sine', 0.08);
    tone(659, 0.12, 'sine', 0.08, 0.11);
    tone(784, 0.22, 'sine', 0.08, 0.22);
  }

  function caught() {
    tone(180, 0.5, 'sawtooth', 0.08);
    tone(120, 0.6, 'sawtooth', 0.07, 0.2);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { footstep, alarm, spotted, pickup, levelClear, caught, toggleMute };
}
