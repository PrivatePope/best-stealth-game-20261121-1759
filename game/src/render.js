// The renderer: everything the player sees, painted on one canvas. Draw order
// matters: floor, exit glow and chips, then vision cones, then walls and
// crates on top of the cones (so cover really hides the light), then guards,
// the player, the HUD bar and finally the menu overlays. The title screen
// keeps the level alive behind it, so the first frame already shows guards
// patrolling under their cones.
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLORS, FIELD_HEIGHT, FIELD_WIDTH, HUD_HEIGHT, TILE } from './config.js';
import { conePoints } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

function fmtTime(seconds) {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  function drawFloor(level, time) {
    ctx.fillStyle = COLORS.floorA;
    ctx.fillRect(0, HUD_HEIGHT, FIELD_WIDTH, FIELD_HEIGHT);
    for (let ty = 0; ty < FIELD_HEIGHT / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD_WIDTH / TILE; tx += 1) {
        if ((tx + ty) % 2 === 0) {
          ctx.fillStyle = COLORS.floorB;
          ctx.fillRect(tx * TILE, HUD_HEIGHT + ty * TILE, TILE, TILE);
        }
      }
    }
    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= FIELD_WIDTH; x += TILE) {
      ctx.moveTo(x, HUD_HEIGHT);
      ctx.lineTo(x, HUD_HEIGHT + FIELD_HEIGHT);
    }
    for (let y = 0; y <= FIELD_HEIGHT; y += TILE) {
      ctx.moveTo(0, HUD_HEIGHT + y);
      ctx.lineTo(FIELD_WIDTH, HUD_HEIGHT + y);
    }
    ctx.stroke();
    void level;
    void time;
  }

  function drawExit(exit, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    const cx = exit.x + exit.w / 2;
    const cy = exit.y + exit.h / 2;
    const glow = ctx.createRadialGradient(cx, HUD_HEIGHT + cy, 8, cx, HUD_HEIGHT + cy, 90);
    glow.addColorStop(0, `rgba(52, 211, 153, ${0.35 + 0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(exit.x - 50, HUD_HEIGHT + exit.y - 50, exit.w + 100, exit.h + 100);
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(exit.x + 6, HUD_HEIGHT + exit.y + 6, exit.w - 12, exit.h - 12);
    ctx.fillStyle = '#06281c';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', cx, HUD_HEIGHT + cy - 8);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('»', cx, HUD_HEIGHT + cy + 14);
  }

  function drawChips(chips, time) {
    for (let i = 0; i < chips.length; i += 1) {
      const chip = chips[i];
      if (chip.taken) continue;
      const r = 8 + 2 * Math.sin(time * 4 + i * 2);
      const y = HUD_HEIGHT + chip.y;
      ctx.save();
      ctx.translate(chip.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.chip;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
  }

  function drawCones(guards) {
    for (let i = 0; i < guards.length; i += 1) {
      const guard = guards[i];
      const points = conePoints(guard, 20);
      const fill =
        guard.state === 'chase'
          ? COLORS.coneChase
          : guard.state === 'suspicious' || guard.state === 'search'
            ? COLORS.coneSuspicious
            : COLORS.coneCalm;
      ctx.beginPath();
      ctx.moveTo(points[0].x, HUD_HEIGHT + points[0].y);
      for (let j = 1; j < points.length; j += 1) ctx.lineTo(points[j].x, HUD_HEIGHT + points[j].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = guard.state === 'chase' ? 'rgba(239, 68, 68, 0.7)' : COLORS.coneEdgeCalm;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawCover(level) {
    for (let i = 0; i < level.walls.length; i += 1) {
      const w = level.walls[i];
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(w.x, HUD_HEIGHT + w.y, w.w, w.h);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(w.x, HUD_HEIGHT + w.y, w.w, 4);
      ctx.strokeStyle = COLORS.wallEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 1, HUD_HEIGHT + w.y + 1, w.w - 2, w.h - 2);
    }
    for (let i = 0; i < level.crates.length; i += 1) {
      const c = level.crates[i];
      ctx.fillStyle = COLORS.crate;
      ctx.fillRect(c.x + 3, HUD_HEIGHT + c.y + 3, c.w - 6, c.h - 6);
      ctx.fillStyle = COLORS.crateTop;
      ctx.fillRect(c.x + 3, HUD_HEIGHT + c.y + 3, c.w - 6, 5);
      ctx.strokeStyle = COLORS.crateEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 3, HUD_HEIGHT + c.y + 3, c.w - 6, c.h - 6);
      ctx.beginPath();
      ctx.moveTo(c.x + 6, HUD_HEIGHT + c.y + c.h - 6);
      ctx.lineTo(c.x + c.w - 6, HUD_HEIGHT + c.y + 6);
      ctx.strokeStyle = 'rgba(74, 52, 16, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawGuards(guards, time) {
    for (let i = 0; i < guards.length; i += 1) {
      const guard = guards[i];
      const y = HUD_HEIGHT + guard.y;
      ctx.beginPath();
      ctx.arc(guard.x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = guard.state === 'chase' ? '#ef4444' : COLORS.guard;
      ctx.fill();
      ctx.strokeStyle = COLORS.guardDark;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Facing tick: the guard's eyes look where it looks.
      ctx.beginPath();
      ctx.moveTo(guard.x, y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, y + Math.sin(guard.facing) * 20);
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Suspicion ring: fills as the guard grows sure it saw something.
      if (guard.detection > 0.03) {
        ctx.beginPath();
        ctx.arc(guard.x, y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.detection);
        ctx.strokeStyle = guard.detection >= 0.55 ? '#fbbf24' : '#fde68a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      const mark = guard.state === 'chase' ? '!' : guard.state === 'suspicious' || guard.state === 'search' ? '?' : '';
      if (mark) {
        const bob = Math.sin(time * 6) * 2;
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = guard.state === 'chase' ? '#ef4444' : '#fbbf24';
        ctx.fillText(mark, guard.x, y - 28 + bob);
      }
    }
  }

  function drawPlayer(player, time) {
    const y = HUD_HEIGHT + player.y;
    // Soft light pool around the agent, so the eye finds the player first.
    const glow = ctx.createRadialGradient(player.x, y, 6, player.x, y, 90);
    glow.addColorStop(0, 'rgba(45, 212, 191, 0.20)');
    glow.addColorStop(1, 'rgba(45, 212, 191, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(player.x - 90, y - 90, 180, 180);
    if (player.sneak) {
      ctx.beginPath();
      ctx.arc(player.x, y, 19, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(230, 255, 250, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(player.x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.player;
    ctx.fill();
    ctx.strokeStyle = COLORS.playerRing;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x, y);
    ctx.lineTo(player.x + Math.cos(player.facing) * 18, y + Math.sin(player.facing) * 18);
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 3;
    ctx.stroke();
    void time;
  }

  function drawHud(worldState, levelName) {
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, FIELD_WIDTH, HUD_HEIGHT);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(0, HUD_HEIGHT - 3, FIELD_WIDTH, 3);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.title;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('SHADOW PROTOCOL', 14, 20);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${levelName}  ·  Reach the green EXIT unseen`, 14, 44);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`◆ ${worldState.chipsTaken}/${worldState.chipsTotal}`, 470, 20);
    ctx.fillText(fmtTime(worldState.time), 560, 20);
    ctx.fillText(`SCORE ${worldState.score}`, 660, 20);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('WASD move · SHIFT sneak · SPACE sprint · CLICK walk-to · P pause', 565, 44);
    // Alert meter, right side.
    const label = worldState.alertLevel === 'alerted' ? 'ALERTED' : worldState.alertLevel === 'suspicious' ? 'SUSPICIOUS' : 'UNDETECTED';
    const color =
      worldState.alertLevel === 'alerted'
        ? COLORS.alertChase
        : worldState.alertLevel === 'suspicious'
          ? COLORS.alertSuspicious
          : COLORS.alertCalm;
    let fill = 0;
    for (let i = 0; i < worldState.guards.length; i += 1) fill = Math.max(fill, worldState.guards[i].detection);
    if (worldState.alertLevel === 'alerted') fill = 1;
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(label, FIELD_WIDTH - 14, 20);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(FIELD_WIDTH - 154, 34, 140, 10);
    ctx.fillStyle = color;
    ctx.fillRect(FIELD_WIDTH - 154, 34, 140 * fill, 10);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(FIELD_WIDTH - 154, 34, 140, 10);
  }

  function dimOverlay(alpha) {
    ctx.fillStyle = `rgba(4, 7, 13, ${alpha})`;
    ctx.fillRect(0, 0, FIELD_WIDTH, CANVAS_HEIGHT);
  }

  function centreText(lines) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, FIELD_WIDTH / 2, line.y);
    }
  }

  function drawTitle(worldState, best) {
    dimOverlay(0.62);
    centreText([
      { text: 'SHADOW PROTOCOL', font: 'bold 52px system-ui, sans-serif', color: COLORS.title, y: 190 },
      { text: 'A top-down stealth game — slip past the guards, stay out of the cones,', font: '19px system-ui, sans-serif', color: COLORS.hudText, y: 252 },
      { text: 'grab the data chips and reach the green EXIT unseen.', font: '19px system-ui, sans-serif', color: COLORS.hudText, y: 280 },
      { text: 'WASD / arrows — move      SHIFT — sneak      SPACE — sprint (loud!)', font: '16px system-ui, sans-serif', color: COLORS.accent, y: 330 },
      { text: 'Click — walk to a point      P — pause      M — mute', font: '16px system-ui, sans-serif', color: COLORS.accent, y: 356 },
      { text: 'ENTER or CLICK to infiltrate', font: 'bold 24px system-ui, sans-serif', color: '#fbbf24', y: 420 },
      { text: best > 0 ? `Best score: ${best}` : 'Three floors. One ghost. No alarms.', font: '15px system-ui, sans-serif', color: COLORS.hudDim, y: 470 },
    ]);
    void worldState;
  }

  function drawPaused() {
    dimOverlay(0.55);
    centreText([
      { text: 'PAUSED', font: 'bold 44px system-ui, sans-serif', color: COLORS.title, y: 300 },
      { text: 'P or ENTER to keep sneaking', font: '18px system-ui, sans-serif', color: COLORS.hudText, y: 350 },
    ]);
  }

  function drawClear(worldState, levelName) {
    dimOverlay(0.6);
    centreText([
      { text: 'LEVEL CLEAR', font: 'bold 48px system-ui, sans-serif', color: COLORS.exit, y: 250 },
      { text: `${levelName} — cleared. The next floor waits.`, font: '20px system-ui, sans-serif', color: COLORS.hudText, y: 305 },
      { text: `Chips ${worldState.chipsTaken}/${worldState.chipsTotal}   ·   Time ${fmtTime(worldState.time)}   ·   Score ${worldState.score}`, font: '18px system-ui, sans-serif', color: COLORS.accent, y: 345 },
      { text: 'ENTER or CLICK — next floor', font: 'bold 22px system-ui, sans-serif', color: '#fbbf24', y: 405 },
    ]);
  }

  function drawWin(totalScore, totalTime) {
    dimOverlay(0.66);
    centreText([
      { text: 'GHOST', font: 'bold 56px system-ui, sans-serif', color: COLORS.exit, y: 240 },
      { text: 'All three floors cleared. No guard ever laid a hand on you.', font: '20px system-ui, sans-serif', color: COLORS.hudText, y: 300 },
      { text: `Final score ${totalScore}   ·   Total time ${fmtTime(totalTime)}`, font: '19px system-ui, sans-serif', color: COLORS.accent, y: 340 },
      { text: 'ENTER or CLICK — run it again', font: 'bold 22px system-ui, sans-serif', color: '#fbbf24', y: 400 },
    ]);
  }

  function drawCaught(worldState) {
    dimOverlay(0.6);
    centreText([
      { text: 'COMPROMISED', font: 'bold 48px system-ui, sans-serif', color: '#ef4444', y: 250 },
      { text: 'A guard caught you in the open.', font: '20px system-ui, sans-serif', color: COLORS.hudText, y: 305 },
      { text: `Score ${worldState.score}   ·   Time ${fmtTime(worldState.time)}`, font: '18px system-ui, sans-serif', color: COLORS.accent, y: 345 },
      { text: 'R — retry the floor      ENTER — back to title', font: 'bold 22px system-ui, sans-serif', color: '#fbbf24', y: 405 },
    ]);
  }

  function draw(world, screen, best, totalScore, totalTime) {
    const state = world.state;
    drawFloor(world.level, state.time);
    drawExit(world.level.exit, state.time);
    drawChips(world.level.chips, state.time);
    drawCones(state.guards);
    drawCover(world.level);
    drawGuards(state.guards, state.time);
    drawPlayer(state.player, state.time);
    drawHud(state, world.level.name);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_CLEAR) drawClear(state, world.level.name);
    else if (screen === SCREEN_WIN) drawWin(totalScore, totalTime);
    else if (screen === SCREEN_CAUGHT) drawCaught(state);
  }

  return { draw };
}
