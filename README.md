# Romp

Romp has **26 games**. The 17 camera-controlled motion games are joined by nine shared-screen Family Adventures.

### Family Adventures

| Game | Play together |
| --- | --- |
| **Snösystrarna** | Find lost things with spoken Swedish clues, help six winter animals, and color their scarves. The two sisters can save their names, coat colors, and clue difficulty. |
| **Mural Studio** | Draw on blank paper or a coloring scene with two brushes. Save up to six pictures locally or download a PNG. |
| **Snow Sled Relay** | Steer through three lanes with gentle leans, the keyboard, or touch. The navigator calls out the route. Swap at the cabin checkpoint. |
| **Bridge Builders** | Add up beam lengths, place supports, and test bridges with a loaded sled. |
| **Robot Post** | Make a program from arrows and repeat cards. Predict where it stops, run it, and debug the route. |
| **Curiosity Lab** | Change one variable, predict the outcome, and compare paired virtual experiments. |
| **Moon Base** | Plan a route, collect two samples, and get the rover home before the battery runs out. |
| **You’re the Teacher** | Give a math, Swedish, pattern, or drawing assignment, offer a hint, and swap roles. |
| **Dad & Daughters Quest** | Rotate through captain, challenger, and coach in a three-person Swedish, drawing, and posing challenge. |

### Workouts
- **Sprint** — run on the spot, knees up. Your pace is your speed. Three heats, flat out.
- **Jack Attack** — every jumping jack fires the cannon.
- **Forge** — hold the squat, then strike when the blade glows.
- **Lumberjack** — wind up and chop across your body.
- **Rocket** — every squat is an engine burn.

### Arcade
- **Run** — endless runner. Lean, jump, duck.
- **Slice** — cut the fruit, dodge the bombs. Arcade, Classic, and Zen modes.
- **Jab** — punch the pads, squat under the bar.
- **Goalie** — get a glove to every shot.
- **Smash** — knock the crate tower down.
- **Wipe** — scrub the screen clean before the grime creeps back.
- **Keepy-Uppy** — headers and kicks keep the balloon up.
- **Leaks** — plug the cracks with your hands, feet, and head.

### Music and Dance
- **Pulse** — neon tunnel, original songs. Swing, clap, duck.
- **Beat** — hit the moves on the beat.
- **Freeze** — dance, then hold dead still.

### Pose
- **Shape Up** — match the shape before it lands.

### Features & Extras
- **Warm-up Routine Mode** — "Daily Warm-up Circuit" chaining cardio, rhythm, and power workouts back-to-back with unified scoring.
- **Custom Audio Support** — upload personal MP3/WAV/OGG music tracks to play during any game with automatic ducking and SFX mixing.
- **Calibration Assistant** — interactive framing tool in the header to ensure ideal room distance and full visibility of head, hands, and feet before starting.

Play solo, together, or take turns. Stars, stages, activity points, daily quests, and profiles are saved on your device.

This repository is the basic demo edition. It uses standard browser-managed camera capture and smoothed body tracking,
without predictive hand positioning, automatic camera exposure tuning, or screen-delay calibration. Tracking quality
and responsiveness depend on your camera, lighting, browser, and display. Development of the full commercial Romp
product is separate from this repository.

## Play it

Romp is a static website. Open it in Chrome on an Android tablet, allow the camera, and optionally connect the tablet
to your TV over USB-C → HDMI. The camera requires **HTTPS** or `localhost`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fharsha20599%2Fromp&project-name=romp-demo&repository-name=romp-demo)

Deploy the repository, open the resulting HTTPS link on your tablet, and use Chrome's **Add to Home screen** option.
Stand back until your whole body is visible. Point at a button and close your fist to press; holding still is also
available under **Tracking → Press with**. Touch, mouse, and keyboard controls remain available.

Use landscape orientation with the camera facing the room. On a TV, enable Game mode and turn motion smoothing off.
Use a well-lit room so the camera can follow your hands.

### Play Family Adventures on a TV

1. Open the game in Chrome on the device with the camera. Choose **Play without camera** for Family Adventures, or **Start with camera** for motion play. In **Snow Sled Relay**, choose **Enable camera for leaning** from the briefing if you started without it.
2. On desktop Chrome, open **⋮ → Cast, save and share → Cast**, then select your TV. Use the **Fullscreen** and **Keep screen awake** controls in Romp. Keep the game tab visible during a round. [Google’s Chrome casting guide](https://support.google.com/chrome/answer/3228332)
3. In **Snow Sled Relay**, open **Latency stats** to see the local render rate and, with the camera on, tracking speed. Use **Camera preview** when you want the live view included next to the race. If the local screen responds well and the TV feels delayed, try a wired HDMI or USB-C display connection for motion games. If the local camera controls also feel slow, try the **Lite** model under **Tracking** and calibrate in good light.

The story, drawing, and puzzle games use the tab’s touch, mouse, or pen input. On a multitouch tablet, two touches can draw with separate brushes in Mural Studio. On a laptop, switch brushes between turns. The games include prerecorded Swedish clues as tab audio, so they can play on devices without a Swedish system voice.

## Build and develop

Requires Node.js 22+ and Git.

```bash
git clone https://github.com/harsha20599/romp.git
cd romp
npm install
npm run dev       # http://localhost:5180; add ?sim for mouse/keyboard play without a camera
npm run check     # input, progression, and demo checks, then TypeScript
npm run build     # creates dist/
npm run play      # serves dist/ on your network, port 4173
```

Any static host with HTTPS can serve `dist/`, including Vercel, Netlify, Cloudflare Pages, or GitHub Pages at a domain
root. A plain HTTP LAN address will not have camera access unless the browser explicitly trusts that origin;
prefer HTTPS for playing on another device.

In `?sim` mode, move the mouse to control a hand, use the arrow keys to lean/jump/duck, A/D to raise hands, and F to
close a fist. Click or tap during a round to pause; Escape also pauses.

## Code map

- `src/main.tsx` — menus, the 26-game catalog, profiles, and results.
- `src/games/` — the 17 games (Run, Slice, Sprint, Jack Attack, Forge, Lumberjack, Rocket, Pulse, Beat, Freeze, Shape Up, Jab, Goalie, Smash, Wipe, Keepy-Uppy, Leaks).
- `src/family/` — the nine Family Adventures, their shared controls, and the Swedish clue text.
- `src/pose.ts`, `src/pose.worker.ts` — camera input and MediaPipe tracking, including two-player support.
- `src/engine.ts` — the persistent PlayCanvas renderer and shared scene tools.
- `src/kit.ts`, `src/stage.tsx` — round timing, hands, hit testing, and the game shell.
- `src/meta.ts`, `src/stats.ts` — progression and local saved sessions. Existing saves are preserved.
- `src/audio.ts` — sound effects and procedural background music.

React draws menus, puzzle boards, and HUDs. Motion arcade games use the shared PlayCanvas renderer. The family drawing
and sled games use small 2D canvases. Each game loads on demand, and camera analysis pauses during story, drawing, and puzzle rounds.
Camera processing and family saves stay on the device.

## Assets

Third-party assets retain their own licenses. See `CREDITS.md` and `public/assets/CREDITS.md` for attribution.
`tools/models.mjs` can search and import CC0/CC-BY models with source and license records.
To regenerate the Swedish recordings after editing clues, run `node tools/family-voice.mjs <path-to-espeak-ng.js>`
with the JS and data files from the extracted [eSpeak NG Emscripten package](https://github.com/echogarden-project/espeak-ng-emscripten).

## License

**Free for personal use.** Play it, change it, build on it, and tinker however you like.
**Sharing publicly** (a fork, a hosted copy, a video, or a post) needs a visible credit to **@yem.cube on Instagram**.
**Commercial use** needs written approval first. Ask [@yem.cube on Instagram](https://www.instagram.com/yem.cube).
This covers every version, including older Romp releases. Third-party parts keep their own licenses.
Full terms: [LICENSE](LICENSE).
