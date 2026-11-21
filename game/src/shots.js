// The screenshot scenes behind ?shot=title|play|alert|win. Each one plays the
// real rules forward from a fresh level with a scripted route — waypoints the
// player walks, sneaks or sprints between, with waits until a guard is in a
// safe place — so the frame is what a short game really looks like, and the
// same route always gives the same frame. No scene cheats: the player can be
// caught mid-route, and the shot then shows what really happened.
import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_EXIT } from './world.js';
import { SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { tileCentre } from './vision.js';

const IDLE = { mx: 0, my: 0, sneak: false, sprint: false };

/**
 * Walk `waypoints` in order. A waypoint is { tx, ty, mode, wait, until }:
 * mode is 'sneak', 'walk' or 'sprint'; wait stands still that many seconds
 * on arrival; until(world) must be true before leaving. Returns the events
 * the run produced. Stops early on a catch, a win, or a chase when asked.
 */
export function runRoute(world, waypoints, maxSeconds, stopOnChase) {
  let events = 0;
  let wi = 0;
  let waitLeft = 0;
  let arrived = false;
  let stall = 0;
  let lastD = Infinity;
  const steps = Math.ceil(maxSeconds / STEP);
  for (let s = 0; s < steps; s += 1) {
    if (world.state.over || world.state.won) break;
    const wp = waypoints[wi];
    if (!wp) break;
    const target = tileCentre(wp.tx, wp.ty);
    const p = world.state.player;
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    if (d < 10) {
      if (!arrived) {
        arrived = true;
        waitLeft = wp.wait || 0;
      }
      if (wp.until && !wp.until(world)) {
        events |= world.step(STEP, IDLE);
        continue;
      }
      if (waitLeft > 0) {
        waitLeft -= STEP;
        events |= world.step(STEP, IDLE);
        continue;
      }
      wi += 1;
      arrived = false;
      stall = 0;
      lastD = Infinity;
      continue;
    }
    arrived = false;
    if (d >= lastD - 0.5) {
      stall += 1;
      if (stall > 90) {
        wi += 1;
        stall = 0;
        lastD = Infinity;
        continue;
      }
    } else {
      stall = 0;
    }
    lastD = d;
    const mode = wp.mode || 'walk';
    events |= world.step(STEP, {
      mx: (target.x - p.x) / d,
      my: (target.y - p.y) / d,
      sneak: mode === 'sneak',
      sprint: mode === 'sprint',
    });
    if (events & EVENT_CAUGHT) break;
    if (stopOnChase && world.state.guards.some((g) => g.state === 'chase')) break;
  }
  return events;
}

/** Highest guard detection right now, 0 to 1. */
function maxDetection(world) {
  let m = 0;
  for (let i = 0; i < world.state.guards.length; i += 1) m = Math.max(m, world.state.guards[i].detection);
  return m;
}

/** Stand still until detection reaches `level`, a guard chases, or time runs out. */
function waitForDetection(world, level, maxSeconds) {
  const steps = Math.ceil(maxSeconds / STEP);
  for (let s = 0; s < steps; s += 1) {
    if (world.state.over || world.state.won) break;
    if (maxDetection(world) >= level) break;
    if (world.state.guards.some((g) => g.state === 'chase')) break;
    world.step(STEP, IDLE);
  }
}

/**
 * Set `world` to the named scene (title, play, alert or win) and return the
 * screen to draw over it. All scenes run on level 1, The Vault Floor.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Slip to the patrol lane and stand in front of guard A as it comes up
    // the lane: the frame catches the guard staring, suspicion half full.
    runRoute(
      world,
      [
        { tx: 2, ty: 7, mode: 'sneak' },
        { tx: 5, ty: 7, mode: 'sneak' },
        { tx: 8, ty: 7, mode: 'sneak' },
        { tx: 8, ty: 10, mode: 'sneak' },
        { tx: 10, ty: 10, mode: 'walk' },
      ],
      40,
      false,
    );
    waitForDetection(world, 0.5, 6);
    return { screen: world.state.over ? SCREEN_CAUGHT : SCREEN_PLAY };
  }
  if (name === 'alert') {
    // Walk onto guard A's lane in the open, wait for the full alarm, then
    // sprint for the exit through the far gap: a chase, mid-flight. Only step
    // onto the lane while guard A is up at the far end, so the chase starts
    // with the guard behind the player and the sprint can outrun it.
    const guardA = () => world.state.guards[0];
    runRoute(
      world,
      [
        { tx: 2, ty: 7, mode: 'walk' },
        { tx: 5, ty: 7, mode: 'walk' },
        { tx: 8, ty: 7, mode: 'walk', until: () => guardA().y < 160 },
        { tx: 10, ty: 7, mode: 'walk' },
      ],
      40,
      false,
    );
    waitForDetection(world, 1.0, 12);
    runRoute(
      world,
      [
        { tx: 10, ty: 12, mode: 'sprint' },
        { tx: 13, ty: 11, mode: 'sprint' },
        { tx: 16, ty: 11, mode: 'sprint' },
        { tx: 18, ty: 12, mode: 'sprint' },
      ],
      6,
      false,
    );
    return { screen: world.state.over ? SCREEN_CAUGHT : SCREEN_PLAY };
  }
  if (name === 'win') {
    // The whole safe route, sneaking between cover, crossing each patrol
    // lane only while its guard is at the far end, and dropping down the
    // exit column while guard B works the top edge.
    const guardA = () => world.state.guards[0];
    const guardB = () => world.state.guards[1];
    const events = runRoute(
      world,
      [
        { tx: 2, ty: 7, mode: 'sneak' },
        { tx: 5, ty: 7, mode: 'sneak' },
        { tx: 8, ty: 7, mode: 'sneak' },
        { tx: 8, ty: 10, mode: 'sneak', until: () => guardA().y < 200 },
        { tx: 11, ty: 10, mode: 'walk' },
        { tx: 12, ty: 11, mode: 'walk' },
        { tx: 14, ty: 11, mode: 'sneak' },
        { tx: 15, ty: 9, mode: 'sneak' },
        { tx: 18, ty: 9, mode: 'sneak' },
        { tx: 20, ty: 9, mode: 'sneak', until: () => guardB().y < 330 },
        { tx: 20, ty: 12, mode: 'sprint' },
        { tx: 20, ty: 13, mode: 'sprint' },
      ],
      90,
      false,
    );
    void events;
    return { screen: world.state.won ? SCREEN_CLEAR : world.state.over ? SCREEN_CAUGHT : SCREEN_PLAY };
  }
  // title (and anything else): let the guards patrol for a while.
  const steps = Math.ceil(6 / STEP);
  for (let s = 0; s < steps; s += 1) world.step(STEP, IDLE);
  return { screen: SCREEN_TITLE };
}
