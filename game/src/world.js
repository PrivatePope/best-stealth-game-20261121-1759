// The simulation: one level, stepped in fixed 1/60 s slices. Pure logic — no
// DOM, no canvas, no randomness — so the same code runs the live game, the
// staged screenshots and the local tests, and a scripted input always gives
// the same outcome. Guards patrol, grow suspicious, give chase, then search
// the last place they saw the player; the player wins a level by reaching the
// green exit, and loses it by being caught.
import { DETECTION, GUARD, PLAYER, SCORE, STEP } from './config.js';
import { buildLevel } from './level.js';
import { angleDifference, canGuardSee, wrapAngle } from './vision.js';

export const EVENT_NONE = 0;
export const EVENT_CHIP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_ALARM = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_EXIT = 16;

const TURN_RATE = 6.0;

/** Turn `from` toward `to` by at most `maxStep` radians. */
function turnToward(from, to, maxStep) {
  const diff = wrapAngle(to - from);
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}

/** Does a circle at (x,y) with radius r overlap the rectangle? */
function circleHitsRect(x, y, r, rect) {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Move a circle by (dx,dy), sliding along walls: try x first, then y, and
 * keep whichever axis stays clear of every blocker.
 */
export function moveCircle(x, y, r, dx, dy, blockers) {
  let nx = x + dx;
  let ny = y;
  for (let i = 0; i < blockers.length; i += 1) {
    if (circleHitsRect(nx, ny, r, blockers[i])) {
      nx = x;
      break;
    }
  }
  ny = y + dy;
  for (let i = 0; i < blockers.length; i += 1) {
    if (circleHitsRect(nx, ny, r, blockers[i])) {
      ny = y;
      break;
    }
  }
  return { x: nx, y: ny };
}

export function createWorld(levelIndex) {
  const level = buildLevel(levelIndex);
  const state = {
    levelIndex,
    levelName: level.name,
    time: 0,
    score: 0,
    chipsTaken: 0,
    chipsTotal: level.chips.length,
    alertLevel: 'calm',
    over: false,
    won: false,
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      facing: 0,
      sneak: false,
      sprint: false,
      moving: false,
    },
    guards: level.guards,
  };

  function reset() {
    const fresh = buildLevel(levelIndex);
    state.time = 0;
    state.score = 0;
    state.chipsTaken = 0;
    state.alertLevel = 'calm';
    state.over = false;
    state.won = false;
    state.player.x = fresh.playerStart.x;
    state.player.y = fresh.playerStart.y;
    state.player.facing = 0;
    state.player.sneak = false;
    state.player.sprint = false;
    state.player.moving = false;
    state.guards = fresh.guards;
    for (let i = 0; i < fresh.chips.length; i += 1) level.chips[i].taken = false;
  }

  function stepGuard(guard, dt, events) {
    const player = state.player;
    const sees = canGuardSee(guard, player.x, player.y, level.blockers);
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);

    if (sees) {
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
      guard.lostSightFor = 0;
      const closeness = 1 - dist / guard.range;
      const rate =
        DETECTION.baseRate *
        (DETECTION.farMultiplier + (DETECTION.nearMultiplier - DETECTION.farMultiplier) * closeness) *
        (player.sneak ? DETECTION.sneakMultiplier : 1);
      const before = guard.detection;
      guard.detection = Math.min(DETECTION.chaseAt, guard.detection + rate * dt);
      if (before < DETECTION.suspiciousAt && guard.detection >= DETECTION.suspiciousAt) {
        events.value |= EVENT_SPOTTED;
      }
      if (guard.detection >= DETECTION.suspiciousAt && guard.state === 'patrol') {
        // The guard is sure it saw something: stop, stare, give the player
        // a moment to break line of sight before the chase begins.
        guard.state = 'suspicious';
      }
      if (guard.detection >= DETECTION.chaseAt && guard.state !== 'chase') {
        guard.state = 'chase';
        events.value |= EVENT_ALARM;
      }
    } else {
      guard.detection = Math.max(0, guard.detection - DETECTION.decayRate * dt);
      if (guard.state === 'chase') {
        guard.lostSightFor += dt;
        if (guard.lostSightFor > GUARD.chaseMemory) {
          guard.state = 'search';
          guard.searchLeft = GUARD.searchTime;
        }
      } else if (guard.state === 'suspicious' && guard.detection < 0.25) {
        guard.state = 'patrol';
      }
    }

    // Footsteps: a sprinting player is heard from farther away.
    if (player.moving && guard.state === 'patrol') {
      const heard =
        (player.sprint && dist < PLAYER.noiseRadius) ||
        (!player.sprint && !player.sneak && dist < PLAYER.walkNoiseRadius);
      if (heard) {
        guard.state = 'suspicious';
        guard.detection = Math.max(guard.detection, DETECTION.suspiciousAt);
        guard.lastSeenX = player.x;
        guard.lastSeenY = player.y;
        events.value |= EVENT_SPOTTED;
      }
    }

    if (guard.state === 'patrol') {
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
      } else {
        const target = guard.patrol[guard.patrolIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) {
          guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrol.length;
          guard.pauseLeft = GUARD.pauseAtWaypoint;
        } else {
          const step = Math.min(d, guard.speed * dt);
          const moved = moveCircle(guard.x, guard.y, GUARD.radius, (dx / d) * step, (dy / d) * step, level.blockers);
          guard.x = moved.x;
          guard.y = moved.y;
          guard.facing = turnToward(guard.facing, Math.atan2(dy, dx), TURN_RATE * dt);
        }
      }
    } else if (guard.state === 'suspicious') {
      guard.facing = turnToward(guard.facing, Math.atan2(player.y - guard.y, player.x - guard.x), TURN_RATE * dt);
    } else if (guard.state === 'chase') {
      const dx = player.x - guard.x;
      const dy = player.y - guard.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const step = Math.min(d, GUARD.chaseSpeed * dt);
        const moved = moveCircle(guard.x, guard.y, GUARD.radius, (dx / d) * step, (dy / d) * step, level.blockers);
        guard.x = moved.x;
        guard.y = moved.y;
        guard.facing = turnToward(guard.facing, Math.atan2(dy, dx), TURN_RATE * dt);
      }
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchRadius) {
        state.over = true;
        events.value |= EVENT_CAUGHT;
      }
    } else if (guard.state === 'search') {
      const dx = guard.lastSeenX - guard.x;
      const dy = guard.lastSeenY - guard.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const step = Math.min(d, GUARD.searchSpeed * dt);
        const moved = moveCircle(guard.x, guard.y, GUARD.radius, (dx / d) * step, (dy / d) * step, level.blockers);
        guard.x = moved.x;
        guard.y = moved.y;
        guard.facing = turnToward(guard.facing, Math.atan2(dy, dx), TURN_RATE * dt);
      } else {
        guard.searchLeft -= dt;
        guard.searchAngle += dt * 1.6;
        guard.facing = guard.searchAngle;
        if (guard.searchLeft <= 0) {
          guard.state = 'patrol';
          guard.detection = 0.2;
        }
      }
    }
  }

  /**
   * Advance the world one fixed step. `input` is { mx, my, sneak, sprint }
   * with mx/my a unit-ish direction. Returns an EVENT_* bitmask.
   */
  function step(dt, input) {
    const events = { value: EVENT_NONE };
    if (state.over || state.won) return events.value;
    state.time += dt;

    const player = state.player;
    const speed = input.sneak ? PLAYER.sneakSpeed : input.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const mag = Math.hypot(input.mx, input.my);
    player.moving = mag > 0.01;
    player.sneak = !!input.sneak;
    player.sprint = !!input.sprint;
    if (player.moving) {
      const nx = input.mx / Math.max(1, mag);
      const ny = input.my / Math.max(1, mag);
      const moved = moveCircle(player.x, player.y, PLAYER.radius, nx * speed * dt, ny * speed * dt, level.blockers);
      player.x = moved.x;
      player.y = moved.y;
      player.facing = Math.atan2(ny, nx);
    }

    for (let i = 0; i < level.chips.length; i += 1) {
      const chip = level.chips[i];
      if (!chip.taken && Math.hypot(player.x - chip.x, player.y - chip.y) < 24) {
        chip.taken = true;
        state.chipsTaken += 1;
        state.score += SCORE.chip;
        events.value |= EVENT_CHIP;
      }
    }

    for (let i = 0; i < state.guards.length; i += 1) stepGuard(state.guards[i], dt, events);

    let alert = 'calm';
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      if (g.state === 'chase') alert = 'alerted';
      else if (alert !== 'alerted' && (g.state === 'suspicious' || g.state === 'search' || g.detection > 0.35)) {
        alert = 'suspicious';
      }
    }
    state.alertLevel = alert;

    const exit = level.exit;
    if (
      player.x > exit.x &&
      player.x < exit.x + exit.w &&
      player.y > exit.y &&
      player.y < exit.y + exit.h
    ) {
      state.won = true;
      events.value |= EVENT_EXIT;
    }
    return events.value;
  }

  return { level, state, step, reset, stepSeconds: STEP };
}
