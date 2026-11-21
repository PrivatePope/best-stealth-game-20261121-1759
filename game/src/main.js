// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, paused, level clear, all-floors win and caught. Clearing a floor
// banks a time bonus and opens the next; being caught ends the run on that
// floor, which restarts with R.
//
// ?shot=title|play|alert|win (with &seed=N, accepted and ignored) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, SCORE, STEP } from './config.js';
import { LEVELS } from './level.js';
import { createWorld, EVENT_ALARM, EVENT_CAUGHT, EVENT_CHIP, EVENT_EXIT, EVENT_SPOTTED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer,
  SCREEN_CAUGHT,
  SCREEN_CLEAR,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit.
  }
}

function runShot(name) {
  const world = createWorld(0);
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, 0, 0, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let levelIndex = 0;
  let world = createWorld(levelIndex);
  let best = readBest();
  let totalScore = 0;
  let totalTime = 0;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startRun() {
    levelIndex = 0;
    world = createWorld(levelIndex);
    totalScore = 0;
    totalTime = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LEVELS[levelIndex].name}. Reach the exit unseen.`);
  }

  function retryFloor() {
    world = createWorld(levelIndex);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Retrying ${LEVELS[levelIndex].name}.`);
  }

  function nextFloor() {
    levelIndex += 1;
    world = createWorld(levelIndex);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LEVELS[levelIndex].name}.`);
  }

  function levelClearBonus() {
    return SCORE.levelClear + Math.max(0, SCORE.maxTimeBonus - Math.floor(world.state.time) * SCORE.timeBonusPerSecond);
  }

  function endFloor() {
    const bonus = levelClearBonus();
    totalScore += world.state.score + bonus;
    totalTime += world.state.time;
    audio.levelClear();
    if (levelIndex + 1 >= LEVELS.length) {
      screen = SCREEN_WIN;
      if (totalScore > best) {
        best = totalScore;
        saveBest(best);
      }
      announce(`Ghost. All floors clear. Final score ${totalScore}.`);
    } else {
      screen = SCREEN_CLEAR;
      announce(`${LEVELS[levelIndex].name} clear. Bonus ${bonus}.`);
    }
  }

  function endCaught() {
    screen = SCREEN_CAUGHT;
    audio.caught();
    announce(`Compromised. Score ${world.state.score}. Press R to retry.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_CAUGHT || screen === SCREEN_PAUSED)) {
      retryFloor();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) {
      startRun();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_CLEAR) {
      nextFloor();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) {
      startRun();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_CAUGHT) {
      screen = SCREEN_TITLE;
      announce('Shadow Protocol. Press Space or click to start.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title keeps the level alive behind it: guards patrol, cones sweep.
      world.step(STEP, { mx: 0, my: 0, sneak: false, sprint: false });
      return;
    }
    const dir = input.direction(world.state.player, 64);
    const events = world.step(STEP, dir);
    audio.footstep(STEP, world.state.player.sprint, world.state.player.sneak);
    if (events & EVENT_CHIP) audio.pickup();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_ALARM) audio.alarm();
    if (events & EVENT_EXIT) endFloor();
    else if (events & EVENT_CAUGHT) endCaught();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, totalScore, totalTime);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') audio.toggleMute();
  });

  announce('Shadow Protocol. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
