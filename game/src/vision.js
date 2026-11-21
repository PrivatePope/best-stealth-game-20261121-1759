// Vision geometry: what a guard can see, and what blocks the view.
// Everything here is pure math over rectangles — no DOM, no canvas — so the
// same code drives the game, the screenshot staging and the local tests.
import { TILE } from './config.js';

/** Normalise an angle to (-PI, PI]. */
export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle <= -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  return Math.abs(wrapAngle(a - b));
}

/**
 * Does the segment (x1,y1)-(x2,y2) touch the rectangle? Slab test, so a
 * segment that only grazes a corner still counts as blocked.
 */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** True when no blocker rectangle stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/**
 * Can this guard see the target point? Range, cone angle and line of sight
 * must all pass. A wall or a crate between guard and target hides the player.
 */
export function canGuardSee(guard, tx, ty, blockers) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.range) return false;
  if (dist > 1 && angleDifference(Math.atan2(dy, dx), guard.facing) > guard.fov / 2) return false;
  return hasLineOfSight(guard.x, guard.y, tx, ty, blockers);
}

/** Centre of a tile, in pixels. */
export function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** The vision cone as a list of points, for the renderer to fill. */
export function conePoints(guard, steps) {
  const points = [{ x: guard.x, y: guard.y }];
  const n = steps || 18;
  for (let i = 0; i <= n; i += 1) {
    const a = guard.facing - guard.fov / 2 + (guard.fov * i) / n;
    points.push({ x: guard.x + Math.cos(a) * guard.range, y: guard.y + Math.sin(a) * guard.range });
  }
  return points;
}
