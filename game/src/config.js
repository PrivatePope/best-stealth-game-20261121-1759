// Shadow Protocol — tuning constants for the whole game.
// One place holds every number a designer would tweak: field size, speeds,
// guard senses, detection rates and the palette the renderer paints with.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const FIELD_WIDTH = COLS * TILE;
export const FIELD_HEIGHT = ROWS * TILE;
export const HUD_HEIGHT = 64;
export const CANVAS_WIDTH = FIELD_WIDTH;
export const CANVAS_HEIGHT = FIELD_HEIGHT + HUD_HEIGHT;
export const STEP = 1 / 60;
export const BEST_KEY = 'shadow-protocol-best';

export const PLAYER = {
  radius: 13,
  walkSpeed: 150,
  sneakSpeed: 85,
  sprintSpeed: 215,
  // A sprinting agent is loud: guards this close hear the footsteps.
  noiseRadius: 115,
  // A walking agent is only heard very close.
  walkNoiseRadius: 55,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 72,
  chaseSpeed: 168,
  searchSpeed: 105,
  pauseAtWaypoint: 1.0,
  catchRadius: 22,
  // How long a guard keeps chasing after losing sight before searching.
  chaseMemory: 2.5,
  // How long a guard studies the last seen spot before giving up.
  searchTime: 3.0,
};

export const DETECTION = {
  // Base fill rate per second while the player is inside a cone, in the open.
  baseRate: 0.85,
  // Closer is scarier: the rate scales between these two multipliers.
  nearMultiplier: 1.5,
  farMultiplier: 0.55,
  // Sneaking halves how fast a guard's suspicion fills.
  sneakMultiplier: 0.45,
  // How fast suspicion drains while the player is unseen.
  decayRate: 0.22,
  // At this fill the guard stops and stares ("?").
  suspiciousAt: 0.55,
  // At full fill the guard gives chase ("!").
  chaseAt: 1.0,
};

export const SCORE = {
  chip: 500,
  levelClear: 1000,
  timeBonusPerSecond: 8,
  maxTimeBonus: 1200,
};

export const COLORS = {
  floorA: '#161d29',
  floorB: '#1a2230',
  floorLine: '#232f42',
  wall: '#33415c',
  wallTop: '#5a6f92',
  wallEdge: '#141a26',
  crate: '#8a6a2f',
  crateTop: '#b08a3e',
  crateEdge: '#4a3410',
  player: '#2dd4bf',
  playerRing: '#e6fffa',
  guard: '#f87171',
  guardDark: '#7f1d1d',
  coneCalm: 'rgba(251, 191, 36, 0.16)',
  coneEdgeCalm: 'rgba(251, 191, 36, 0.55)',
  coneSuspicious: 'rgba(251, 146, 60, 0.28)',
  coneChase: 'rgba(239, 68, 68, 0.30)',
  exit: '#34d399',
  exitGlow: 'rgba(52, 211, 153, 0.35)',
  chip: '#facc15',
  hudBg: 'rgba(8, 12, 20, 0.92)',
  hudText: '#e2e8f0',
  hudDim: '#94a3b8',
  alertCalm: '#34d399',
  alertSuspicious: '#fbbf24',
  alertChase: '#ef4444',
  title: '#f8fafc',
  accent: '#2dd4bf',
};
