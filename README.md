# Shadow Protocol

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/PrivatePope/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/PrivatePope/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

An entry for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

**Shadow Protocol** is a complete original 2D top-down stealth game. You are a
ghost agent infiltrating three floors of a guarded facility. Guards patrol
with visible vision cones; crates and walls block their sight; a detection
meter fills while you are seen, guards stop and stare, then give chase, then
search the last place they saw you. Grab the data chips, stay out of the
cones, and reach the green EXIT unseen.

- **Three floors** — The Vault Floor, Server Hall, and The Director's Wing —
  each with its own layout, patrol routes, and guard count.
- **Real stealth systems** — vision cones with line-of-sight blocking, a
  suspicion meter that gives you a chance to recover, chase / search / resume
  patrol states, and loud footsteps: sprinting near a guard gives you away.
- **Sneak, walk, sprint** — sneaking is slow and quiet and fills suspicion
  half as fast; sprinting is fast and loud. Click anywhere to walk there.
- **HUD** — alert meter (UNDETECTED / SUSPICIOUS / ALERTED), chips, timer,
  score, and the objective. Title, pause, level-clear, all-floors win, and
  caught screens, with restart.
- **Sound** — synthesised footsteps, alarm stings, and pickup pings (WebAudio,
  no files). M mutes.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (slow, quiet, harder to spot) |
| Space | Sprint (fast, loud — guards hear it) |
| Click | Walk to that point |
| P / Esc | Pause |
| R | Retry the floor |
| Enter | Confirm / start |
| M | Mute |

## How to run

No build step, no network, no dependencies — plain static files under `game/`:

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `index.html`.

## How it is built

- `game/index.html` — the page; loads the game as ES modules.
- `game/src/main.js` — boot and the fixed-timestep loop, screens, scoring.
- `game/src/world.js` — the simulation: movement, guard AI, detection.
- `game/src/level.js` — the three floors as data (walls, crates, patrols).
- `game/src/vision.js` — vision cones and line-of-sight geometry.
- `game/src/render.js` — everything painted on the canvas, HUD included.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesised sound effects.
- `game/src/shots.js` — the four staged screenshot scenes (`?shot=`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` and
  writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — the local static server above.
- `screenshots/` — four real renders of the game (title, mid-play, chase,
  level clear), taken in headless Chrome; the first by name is the cover.

## License

MIT — see [LICENSE](LICENSE).
