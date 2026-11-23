# TIME LOOP RACING

**Every Lap Creates a New Rival.**

A polished 2D browser racing game built with HTML5 Canvas, CSS3 and vanilla JavaScript (ES modules).
No backend, no build step, no external assets required.

## How to play

- **W / ↑** accelerate
- **S / ↓** brake and reverse
- **A / ←** steer left
- **D / →** steer right
- **SPACE** nitro boost
- **R** restart race
- **ESC** pause

Touch controls appear automatically on touch devices.

### The core mechanic

Every completed lap is recorded as timestamped car frames (position, rotation, speed, nitro).
On the next lap that recording becomes a transparent **ghost** that replays your exact movements at
the exact original speed. Lap 2 has 1 ghost, lap 3 has 2, and so on (up to 8 visible).

In **Time Loop** mode you can also enable **Endless**: the race continues until a lap is slower
than the previous one, at which point you are eliminated.

## Modes

- **Time Loop** — ghosts from every lap; finite (3/5/8) or Endless
- **Time Trial** — pure lap racing against the clock
- **Ghost Battle** — race against ghosts saved from previous sessions
- **Survival Race** — dodge energy mines; one hit ends the run

## Garage & tracks

Four cars (Speedster, Drifter, Balanced, Phantom) with distinct stats, adjustable body and neon
colors. Four tracks unlock progressively: Neon City → Desert Circuit → Space Track → Dark Tunnel.

## Local development

ES modules require an HTTP server (opening `index.html` directly from `file://` will not work).

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Mobile / web

The same build works on desktop and mobile:

- Touch steering/pedals/nitro appear automatically on coarse-pointer devices.
- Landscape is recommended; a dismissible rotate notice appears in portrait.
- Canvas resizes on window, orientation and visual-viewport changes, with device-pixel-ratio scaling.
- Safe-area insets are respected on notched devices, and page scroll/zoom is disabled while playing.
- Graphics quality is automatically reduced one level on touch devices (without changing your saved setting).
- Switching away from the tab clears input and pauses the race.

## Deployment

The project is a static site.

- **Vercel:** import the repository, framework preset "Other", no build command, output root `.`.
- **GitHub Pages:** enable Pages from the `main` branch / root folder.

Progress, records, colors, settings and saved ghosts are stored in `localStorage` under
`tlr.save.v1`. Nothing is sent to a server.

## Project structure

```
index.html
css/style.css, css/game.css
js/config.js, main.js, ui.js, input.js, audio.js, effects.js,
   storage.js, scoring.js, track.js, car.js, ghost.js, racing.js
assets/                (optional future art / audio; screen rendering lives in ui.js)
```
