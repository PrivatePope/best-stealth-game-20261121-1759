// Keyboard and mouse input: WASD or arrows to move, Shift to sneak, Space to
// sprint, click to walk to a point, P or Escape to pause, R to restart, Enter
// or click to confirm on the menu screens. Actions are edge-triggered and
// consumed once, so a held key never double-fires a menu.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const KEY_DIRS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let moveTarget = null;

  function onKeyDown(event) {
    if (event.code in KEY_DIRS || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    moveTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    actions |= ACTION_CONFIRM;
  }

  function onBlur() {
    held.clear();
    moveTarget = null;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  /** The current movement direction, from keys or from a click target. */
  function direction(player, hudHeight) {
    let mx = 0;
    let my = 0;
    held.forEach((code) => {
      const dir = KEY_DIRS[code];
      if (dir) {
        mx += dir[0];
        my += dir[1];
      }
    });
    if (mx !== 0 || my !== 0) {
      moveTarget = null;
      return { mx, my, sneak: held.has('ShiftLeft') || held.has('ShiftRight'), sprint: held.has('Space') };
    }
    if (moveTarget) {
      const dx = moveTarget.x - player.x;
      const dy = moveTarget.y - (player.y + (hudHeight || 0));
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        moveTarget = null;
        return { mx: 0, my: 0, sneak: false, sprint: false };
      }
      return { mx: dx / d, my: dy / d, sneak: held.has('ShiftLeft') || held.has('ShiftRight'), sprint: false };
    }
    return { mx: 0, my: 0, sneak: held.has('ShiftLeft') || held.has('ShiftRight'), sprint: held.has('Space') };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  return { direction, takeActions };
}
