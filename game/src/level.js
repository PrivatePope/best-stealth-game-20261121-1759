// The three floors of the game, as data: walls are tile rectangles, crates are
// single tiles, guards patrol waypoint lists. buildLevel turns one entry into
// the pixel rectangles and guard objects the world steps. Cover (crates and
// walls) blocks both movement and sight, so every route the player takes has
// to be learned around a patrol.
import { COLS, ROWS, TILE } from './config.js';
import { tileCentre } from './vision.js';

export const LEVELS = [
  {
    name: 'The Vault Floor',
    hint: 'Learn the patrol. Slip through the gaps and reach the green exit.',
    player: [1, 1],
    exit: [20, 13],
    chips: [
      [18, 2],
      [18, 9],
    ],
    walls: [
      // Divider A (x=6), gaps at rows 3, 7 and 11.
      { x: 6, y: 1, w: 1, h: 2 },
      { x: 6, y: 4, w: 1, h: 3 },
      { x: 6, y: 8, w: 1, h: 3 },
      { x: 6, y: 12, w: 1, h: 2 },
      // Divider B (x=13), gap at row 11.
      { x: 13, y: 1, w: 1, h: 10 },
      { x: 13, y: 12, w: 1, h: 2 },
    ],
    crates: [
      [3, 3],
      [3, 6],
      [3, 10],
      [3, 13],
      [9, 2],
      [9, 4],
      [9, 8],
      [9, 11],
      [9, 13],
      [18, 4],
      [18, 8],
      [18, 10],
    ],
    guards: [
      { patrol: [[10, 2], [10, 12]], speed: 72, range: 175, fov: 1.22 },
      { patrol: [[16, 7], [21, 7], [21, 12], [16, 12]], speed: 72, range: 175, fov: 1.22 },
    ],
  },
  {
    name: 'Server Hall',
    hint: 'Three guards now. Sprinting is loud — sneak past the server racks.',
    player: [1, 1],
    exit: [20, 13],
    chips: [
      [10, 2],
      [18, 10],
    ],
    walls: [
      // Divider A (x=6), gap at row 7.
      { x: 6, y: 1, w: 1, h: 6 },
      { x: 6, y: 8, w: 1, h: 6 },
      // Divider B (x=13), gap at row 9.
      { x: 13, y: 1, w: 1, h: 8 },
      { x: 13, y: 10, w: 1, h: 4 },
    ],
    crates: [
      [3, 2],
      [3, 5],
      [3, 8],
      [3, 11],
      [9, 3],
      [9, 9],
      [10, 6],
      [10, 12],
      [17, 3],
      [19, 6],
      [17, 9],
      [19, 12],
    ],
    guards: [
      { patrol: [[2, 2], [2, 12]], speed: 76, range: 180, fov: 1.26 },
      { patrol: [[11, 2], [11, 12]], speed: 76, range: 180, fov: 1.26 },
      { patrol: [[16, 5], [21, 5], [21, 11], [16, 11]], speed: 76, range: 180, fov: 1.26 },
    ],
  },
  {
    name: "The Director's Wing",
    hint: 'Four guards, longer cones, faster patrols. Patience wins this floor.',
    player: [1, 1],
    exit: [20, 13],
    chips: [
      [15, 6],
      [20, 12],
    ],
    walls: [
      // Divider A (x=6), gaps at rows 5 and 9.
      { x: 6, y: 1, w: 1, h: 4 },
      { x: 6, y: 6, w: 1, h: 3 },
      { x: 6, y: 10, w: 1, h: 4 },
      // Divider B (x=12), gaps at rows 3 and 11.
      { x: 12, y: 1, w: 1, h: 2 },
      { x: 12, y: 4, w: 1, h: 7 },
      { x: 12, y: 12, w: 1, h: 2 },
      // Divider C (x=17), gaps at rows 7 and 13.
      { x: 17, y: 1, w: 1, h: 6 },
      { x: 17, y: 8, w: 1, h: 5 },
    ],
    crates: [
      [3, 3],
      [3, 6],
      [3, 9],
      [3, 12],
      [9, 2],
      [9, 5],
      [9, 8],
      [9, 11],
      [14, 4],
      [14, 7],
      [14, 10],
      [14, 13],
      [20, 2],
      [20, 6],
      [20, 10],
    ],
    guards: [
      { patrol: [[2, 2], [2, 12]], speed: 80, range: 190, fov: 1.31 },
      { patrol: [[10, 2], [10, 12]], speed: 80, range: 190, fov: 1.31 },
      { patrol: [[15, 3], [15, 11]], speed: 84, range: 190, fov: 1.31 },
      { patrol: [[19, 3], [21, 3], [21, 11], [19, 11]], speed: 84, range: 190, fov: 1.31 },
    ],
  },
];

/** The perimeter walls, as tile rectangles: top, bottom, left, right. */
function borderWalls() {
  return [
    { x: 0, y: 0, w: COLS, h: 1 },
    { x: 0, y: ROWS - 1, w: COLS, h: 1 },
    { x: 0, y: 0, w: 1, h: ROWS },
    { x: COLS - 1, y: 0, w: 1, h: ROWS },
  ];
}

function toPixels(rect) {
  return { x: rect.x * TILE, y: rect.y * TILE, w: rect.w * TILE, h: rect.h * TILE };
}

/**
 * Build one level into the structures the world steps: pixel rectangles for
 * everything solid (walls and crates both block sight), the chip spots, the
 * player start, the exit rectangle and one guard object per patrol.
 */
export function buildLevel(index) {
  const def = LEVELS[index];
  const walls = borderWalls().concat(def.walls).map(toPixels);
  const crates = def.crates.map(([tx, ty]) => toPixels({ x: tx, y: ty, w: 1, h: 1 }));
  const blockers = walls.concat(crates);
  const start = tileCentre(def.player[0], def.player[1]);
  const exitCentre = tileCentre(def.exit[0], def.exit[1]);
  const exit = {
    x: exitCentre.x - TILE * 0.9,
    y: exitCentre.y - TILE * 0.9,
    w: TILE * 1.8,
    h: TILE * 1.8,
  };
  const guards = def.guards.map((g) => {
    const first = tileCentre(g.patrol[0][0], g.patrol[0][1]);
    const second = tileCentre(g.patrol[1][0], g.patrol[1][1]);
    return {
      x: first.x,
      y: first.y,
      facing: Math.atan2(second.y - first.y, second.x - first.x),
      patrol: g.patrol.map(([tx, ty]) => tileCentre(tx, ty)),
      patrolIndex: 1,
      pauseLeft: 0,
      speed: g.speed,
      range: g.range,
      fov: g.fov,
      state: 'patrol',
      detection: 0,
      lastSeenX: first.x,
      lastSeenY: first.y,
      lostSightFor: 0,
      searchLeft: 0,
      searchAngle: 0,
    };
  });
  return {
    index,
    name: def.name,
    hint: def.hint,
    walls,
    crates,
    blockers,
    chips: def.chips.map(([tx, ty]) => {
      const c = tileCentre(tx, ty);
      return { x: c.x, y: c.y, taken: false };
    }),
    playerStart: start,
    exit,
    guards,
  };
}

/** Is this tile blocked for walking (wall or crate)? */
export function tileBlocked(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;
  for (let i = 0; i < level.blockers.length; i += 1) {
    const b = level.blockers[i];
    if (cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h) return true;
  }
  return false;
}
