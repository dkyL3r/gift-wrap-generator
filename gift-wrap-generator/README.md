# Gift Wrap Generator

A browser-based tool for designing custom wrapping paper patterns and previewing them on a 3D gift box.

## Features

- Choose a repeating shape (circle, square, triangle, hexagon, star, heart)
- Arrange shapes in a grid, brick, or scatter layout
- Adjust shape size, spacing, and rotation
- Randomize rotation, size, and colors
- Customize the color palette, background, and ribbon color
- Export your design as a PNG or SVG

## Running locally

This is a static site (HTML/CSS/JS) with no build step or dependencies.

**Option 1: PowerShell dev server**

```powershell
./serve.ps1
```

Then open http://localhost:8791/ in your browser.

**Option 2: Any static file server**

Serve the folder with your tool of choice, e.g.:

```bash
npx serve .
```

## Files

- `index.html` — page structure and controls
- `style.css` — styling
- `app.js` — pattern generation, rendering, and export logic
- `serve.ps1` — minimal local dev server (Windows PowerShell)
