# Dice STL Maker

A browser-based tool for designing and exporting 3D-printable dice. Customize each face with engraved or embossed text and SVG artwork, preview in real time, then download a print-ready STL.

**Live app:** [gamethelag.github.io/OpenDice](https://gamethelag.github.io/OpenDice/)

---

## Features

- **All standard dice** — D2 (coin/prism), D4, D6, D8, D10, D12, D20
- **Per-face engraving / embossing** — cut text into a face or raise it proud of the surface
- **Font support** — six bundled typefaces included; upload any `.ttf` or `.otf` file
- **SVG artwork** — drag-and-drop an SVG onto any face, set scale, position, and depth
- **Decorator support** — optional underline or dot marker per text entry
- **Colour control** — hex picker for die body colour and engraving colour
- **Live 3D preview** — Three.js viewport with orbit controls; near-instant Canvas 2D texture feedback with a full JSCAD CSG rebuild running in the background
- **Dice library** — save/load named configurations with thumbnail previews; export to JSON
- **STL export** — binary STL download at the size you specify (default 25 mm)

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install and run

```bash
git clone https://github.com/gamethelag/dice_stl_maker.git
cd dice_stl_maker
npm install
npm run dev
```

Open [http://localhost:5173/OpenDice/](http://localhost:5173/OpenDice/) in your browser.

### Build for production

```bash
npm run build
# Output goes to ./dist
```

---

## Usage

1. **Pick a die type** from the dropdown at the top of the left panel.
2. **Set the size** with the slider (point-to-point diameter in mm).
3. **Click a face** in the face grid to select it.
4. **Add text** in the Text tab — choose a font, type your label, adjust size/position/depth, and pick Cut (engraved) or Emboss (raised).
5. **Add SVG artwork** in the SVG tab — drop any `.svg` file, then scale and position it.
6. **Wait for the JSCAD rebuild** (the viewport shows a "Building…" overlay while it runs).
7. **Click Export STL** to download the finished model.

### Font formats

Only `.ttf` and `.otf` files are supported. WOFF/WOFF2 files (the default download from the Google Fonts website API) will be rejected with an error message. Free TTF/OTF fonts are available from [Google Fonts](https://fonts.google.com) — use the **Download family** button to get the desktop (TTF) version.

### Printing tips

- The default 25 mm refers to the point-to-point diameter (circumradius × 2).
- A cut depth of 0.4–0.6 mm works well at 25 mm scale.
- Slice with supports off; all dice geometries are self-supporting.

---

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | React 19 + Vite 8 |
| 3D preview | Three.js |
| CSG / STL export | @jscad/modeling + @jscad/stl-serializer |
| Font parsing | opentype.js |
| State management | Zustand |
| Deployment | GitHub Pages via GitHub Actions |

---

## Project Structure

```
src/
├── components/       # React UI components
├── export/           # STL export logic
├── geometry/         # Dice vertex/face tables and SVG path parser
├── hooks/            # React hooks (viewport, solid rebuild, face textures)
├── modeling/         # JSCAD solid builders and text/SVG embossers
├── state/            # Zustand store
├── styles/           # CSS
└── viewport/         # Imperative Three.js scene, mesh builder, face picker
public/
└── fonts/            # Bundled TTF/OTF typefaces
```

---

## Deployment

The app is hosted on GitHub Pages. Any push to the `main` branch automatically triggers a build and deploy via `.github/workflows/deploy.yml`.

To deploy manually from your local machine:

```bash
npm run deploy
```

---

## License

MIT
