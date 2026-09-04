(() => {
  const canvas = document.getElementById("sheet");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const el = {
    shape: document.getElementById("shape"),
    layout: document.getElementById("layout"),
    size: document.getElementById("size"),
    sizeVal: document.getElementById("sizeVal"),
    spacing: document.getElementById("spacing"),
    spacingVal: document.getElementById("spacingVal"),
    rotation: document.getElementById("rotation"),
    rotationVal: document.getElementById("rotationVal"),
    randomRotation: document.getElementById("randomRotation"),
    varySize: document.getElementById("varySize"),
    randomColors: document.getElementById("randomColors"),
    bgColor: document.getElementById("bgColor"),
    palette: document.getElementById("palette"),
    addColor: document.getElementById("addColor"),
    addColorPopover: document.getElementById("addColorPopover"),
    newColorInput: document.getElementById("newColorInput"),
    newColorHex: document.getElementById("newColorHex"),
    newColorTexture: document.getElementById("newColorTexture"),
    confirmAddColor: document.getElementById("confirmAddColor"),
    cancelAddColor: document.getElementById("cancelAddColor"),
    ribbonColor: document.getElementById("ribbonColor"),
    randomizeBtn: document.getElementById("randomizeBtn"),
    exportPng: document.getElementById("exportPng"),
    exportSvg: document.getElementById("exportSvg"),
    boxTop: document.getElementById("boxTop"),
    boxFront: document.getElementById("boxFront"),
  };

  let palette = ["#ff3d6e", "#ffd166", "#06d6a0", "#118ab2", "#f4f1ff"].map((color) => ({
    color,
    texture: "solid",
  }));

  // Normalized shape paths live in a -1..1 box, drawn/traversed the same
  // way for both canvas rendering and SVG symbol export.
  const SHAPES = {
    circle: { kind: "circle" },
    square: {
      kind: "polygon",
      points: [[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]],
    },
    triangle: {
      kind: "polygon",
      points: polyAt(3, 1, -90),
    },
    hexagon: {
      kind: "polygon",
      points: polyAt(6, 1, 0),
    },
    star: {
      kind: "polygon",
      points: starPoints(5, 1, 0.45, -90),
    },
    heart: {
      kind: "path",
      d: "M0,0.75 C-1,0 -1,-0.6 -0.4,-0.85 C-0.05,-1 0,-0.7 0,-0.55 C0,-0.7 0.05,-1 0.4,-0.85 C1,-0.6 1,0 0,0.75 Z",
    },
  };

  function polyAt(n, r, offsetDeg) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ((360 / n) * i + offsetDeg) * (Math.PI / 180);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  function starPoints(n, outerR, innerR, offsetDeg) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = ((360 / (n * 2)) * i + offsetDeg) * (Math.PI / 180);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function shadeColor(hex, percent) {
    const f = parseInt(hex.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const R = f >> 16, G = (f >> 8) & 0x00ff, B = f & 0x0000ff;
    return (
      "#" +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    );
  }

  // Every texture draws into a -1..1 box that's already clipped to the
  // current shape, so it works the same for a shape fill or a swatch preview.
  const TEXTURES = {
    solid: {
      label: "Solid",
      draw(c, color) {
        c.fillStyle = color;
        c.fillRect(-1, -1, 2, 2);
      },
    },
    stripes: {
      label: "Stripes",
      draw(c, color) {
        c.fillStyle = color;
        c.fillRect(-1, -1, 2, 2);
        c.strokeStyle = shadeColor(color, 0.35);
        c.lineWidth = 0.3;
        for (let x = -3; x < 3; x += 0.5) {
          c.beginPath();
          c.moveTo(x, -3);
          c.lineTo(x + 3, 3);
          c.stroke();
        }
      },
    },
    dots: {
      label: "Dots",
      draw(c, color) {
        c.fillStyle = color;
        c.fillRect(-1, -1, 2, 2);
        c.fillStyle = shadeColor(color, 0.4);
        for (let y = -0.75; y <= 0.75; y += 0.5) {
          for (let x = -0.75; x <= 0.75; x += 0.5) {
            c.beginPath();
            c.arc(x, y, 0.13, 0, Math.PI * 2);
            c.fill();
          }
        }
      },
    },
    gradient: {
      label: "Gradient",
      draw(c, color) {
        const g = c.createLinearGradient(-1, -1, 1, 1);
        g.addColorStop(0, shadeColor(color, 0.5));
        g.addColorStop(1, shadeColor(color, -0.35));
        c.fillStyle = g;
        c.fillRect(-1, -1, 2, 2);
      },
    },
    glitter: {
      label: "Glitter",
      draw(c, color) {
        c.fillStyle = color;
        c.fillRect(-1, -1, 2, 2);
        c.fillStyle = "#ffffff";
        for (let i = 0; i < 22; i++) {
          c.globalAlpha = rand(0.25, 1);
          c.beginPath();
          c.arc(rand(-1, 1), rand(-1, 1), rand(0.02, 0.08), 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
      },
    },
    crosshatch: {
      label: "Crosshatch",
      draw(c, color) {
        c.fillStyle = color;
        c.fillRect(-1, -1, 2, 2);
        c.strokeStyle = shadeColor(color, 0.3);
        c.lineWidth = 0.1;
        for (let x = -3; x < 3; x += 0.4) {
          c.beginPath();
          c.moveTo(x, -3);
          c.lineTo(x + 3, 3);
          c.stroke();
          c.beginPath();
          c.moveTo(x, 3);
          c.lineTo(x + 3, -3);
          c.stroke();
        }
      },
    },
  };

  function paintTexturePreview(canvasEl, color, textureKey) {
    const pctx = canvasEl.getContext("2d");
    const w = canvasEl.width, h = canvasEl.height;
    pctx.save();
    pctx.clearRect(0, 0, w, h);
    pctx.translate(w / 2, h / 2);
    pctx.scale(w / 2, h / 2);
    pctx.beginPath();
    pctx.rect(-1, -1, 2, 2);
    pctx.clip();
    (TEXTURES[textureKey] || TEXTURES.solid).draw(pctx, color);
    pctx.restore();
  }

  function populateTextureSelect(select, selected) {
    select.innerHTML = "";
    Object.entries(TEXTURES).forEach(([key, t]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = t.label;
      if (key === selected) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // --- Palette UI ---
  function renderPalette() {
    el.palette.innerHTML = "";
    palette.forEach((entry, i) => {
      const card = document.createElement("div");
      card.className = "swatch-card";

      const swatch = document.createElement("div");
      swatch.className = "swatch";

      const preview = document.createElement("canvas");
      preview.width = 40;
      preview.height = 40;
      paintTexturePreview(preview, entry.color, entry.texture);
      swatch.appendChild(preview);

      const input = document.createElement("input");
      input.type = "color";
      input.value = entry.color;
      input.title = "Edit color";
      input.addEventListener("input", (e) => {
        palette[i].color = e.target.value;
        paintTexturePreview(preview, palette[i].color, palette[i].texture);
        render();
      });
      swatch.appendChild(input);

      if (palette.length > 1) {
        const remove = document.createElement("div");
        remove.className = "remove";
        remove.textContent = "×";
        remove.title = "Remove color";
        remove.addEventListener("click", (e) => {
          e.stopPropagation();
          palette.splice(i, 1);
          renderPalette();
          render();
        });
        swatch.appendChild(remove);
      }

      card.appendChild(swatch);

      const textureSelect = document.createElement("select");
      textureSelect.className = "texture-select";
      textureSelect.title = "Texture";
      populateTextureSelect(textureSelect, entry.texture);
      textureSelect.addEventListener("change", (e) => {
        palette[i].texture = e.target.value;
        paintTexturePreview(preview, palette[i].color, palette[i].texture);
        render();
      });
      card.appendChild(textureSelect);

      el.palette.appendChild(card);
    });
  }

  // --- Add-color popover ---
  populateTextureSelect(el.newColorTexture, "solid");

  function openAddColorPopover() {
    el.newColorInput.value = "#ffffff";
    el.newColorHex.value = "#ffffff";
    populateTextureSelect(el.newColorTexture, "solid");
    el.addColorPopover.classList.remove("hidden");
  }

  function closeAddColorPopover() {
    el.addColorPopover.classList.add("hidden");
  }

  el.addColor.addEventListener("click", () => {
    if (palette.length >= 8) return;
    openAddColorPopover();
  });

  el.newColorInput.addEventListener("input", (e) => {
    el.newColorHex.value = e.target.value;
  });

  el.newColorHex.addEventListener("input", (e) => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      el.newColorInput.value = v;
    }
  });

  el.confirmAddColor.addEventListener("click", () => {
    if (palette.length >= 8) {
      closeAddColorPopover();
      return;
    }
    palette.push({ color: el.newColorInput.value, texture: el.newColorTexture.value });
    renderPalette();
    render();
    closeAddColorPopover();
  });

  el.cancelAddColor.addEventListener("click", closeAddColorPopover);

  document.addEventListener("click", (e) => {
    if (
      !el.addColorPopover.classList.contains("hidden") &&
      !el.addColorPopover.contains(e.target) &&
      e.target !== el.addColor
    ) {
      closeAddColorPopover();
    }
  });

  // --- Layout generation ---
  function currentSettings() {
    return {
      shape: el.shape.value,
      layout: el.layout.value,
      size: Number(el.size.value),
      spacing: Number(el.spacing.value),
      rotation: Number(el.rotation.value),
      randomRotation: el.randomRotation.checked,
      varySize: el.varySize.checked,
      randomColors: el.randomColors.checked,
      bg: el.bgColor.value,
      ribbon: el.ribbonColor.value,
    };
  }

  function buildInstances(s) {
    const instances = [];
    const cell = s.size * 2 + s.spacing;
    if (cell <= 2) return instances;

    const cols = Math.ceil(W / cell) + 2;
    const rows = Math.ceil(H / cell) + 2;
    const offsetX = (W - cols * cell) / 2;
    const offsetY = (H - rows * cell) / 2;

    let idx = 0;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        let x = offsetX + col * cell + cell / 2;
        let y = offsetY + row * cell + cell / 2;

        if (s.layout === "brick" && row % 2 !== 0) {
          x += cell / 2;
        }

        let size = s.size;
        let rot = s.rotation;

        if (s.layout === "scatter") {
          x += rand(-cell * 0.35, cell * 0.35);
          y += rand(-cell * 0.35, cell * 0.35);
          rot = rand(0, 360);
        } else if (s.randomRotation) {
          rot = rand(0, 360);
        }

        if (s.varySize) {
          size = size * rand(0.65, 1.25);
        }

        if (x < -size - 4 || x > W + size + 4 || y < -size - 4 || y > H + size + 4) {
          continue;
        }

        const paletteIndex = s.randomColors
          ? Math.floor(rand(0, palette.length))
          : idx % palette.length;
        const swatch = palette[paletteIndex];

        instances.push({ x, y, size, rot, color: swatch.color, texture: swatch.texture, paletteIndex });
        idx++;
      }
    }
    return instances;
  }

  let lastInstances = [];
  let lastSettings = null;

  function render() {
    const s = currentSettings();
    lastSettings = s;
    lastInstances = buildInstances(s);

    el.sizeVal.textContent = s.size;
    el.spacingVal.textContent = s.spacing;
    el.rotationVal.textContent = s.rotation + "°";

    drawToCanvas(ctx, W, H, s, lastInstances);

    // Update box preview faces from the freshly rendered sheet.
    const dataUrl = canvas.toDataURL("image/png");
    el.boxTop.style.backgroundImage = `url(${dataUrl})`;
    el.boxFront.style.backgroundImage = `url(${dataUrl})`;
    document.documentElement.style.setProperty("--ribbon-color", s.ribbon);
  }

  function buildShapePath(shapeDef) {
    if (shapeDef.kind === "path") {
      return new Path2D(shapeDef.d);
    }
    const path = new Path2D();
    if (shapeDef.kind === "circle") {
      path.arc(0, 0, 1, 0, Math.PI * 2);
    } else if (shapeDef.kind === "polygon") {
      shapeDef.points.forEach(([px, py], i) => {
        if (i === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      });
      path.closePath();
    }
    return path;
  }

  function drawShapeNormalized(context, shapeDef, color, textureKey) {
    const path = buildShapePath(shapeDef);
    context.save();
    context.clip(path);
    (TEXTURES[textureKey] || TEXTURES.solid).draw(context, color);
    context.restore();
  }

  function drawToCanvas(context, w, h, s, instances) {
    context.clearRect(0, 0, w, h);
    context.fillStyle = s.bg;
    context.fillRect(0, 0, w, h);

    const shapeDef = SHAPES[s.shape];

    instances.forEach((inst) => {
      context.save();
      context.translate(inst.x, inst.y);
      context.rotate((inst.rot * Math.PI) / 180);
      context.scale(inst.size, inst.size);
      drawShapeNormalized(context, shapeDef, inst.color, inst.texture);
      context.restore();
    });
  }

  // --- Export ---
  function exportPng() {
    const scale = 2;
    const off = document.createElement("canvas");
    off.width = W * scale;
    off.height = H * scale;
    const offCtx = off.getContext("2d");
    offCtx.scale(scale, scale);
    drawToCanvas(offCtx, W, H, lastSettings, lastInstances);

    const link = document.createElement("a");
    link.download = "gift-wrap.png";
    link.href = off.toDataURL("image/png");
    link.click();
  }

  function shapeToSvgEl(shapeDef, id) {
    if (shapeDef.kind === "circle") {
      return `<circle id="${id}" cx="0" cy="0" r="1" />`;
    }
    if (shapeDef.kind === "polygon") {
      const pts = shapeDef.points.map((p) => p.join(",")).join(" ");
      return `<polygon id="${id}" points="${pts}" />`;
    }
    if (shapeDef.kind === "path") {
      return `<path id="${id}" d="${shapeDef.d}" />`;
    }
    return "";
  }

  function svgFillDefs(pal) {
    return pal
      .map((entry, i) => {
        const id = `fill-${i}`;
        const { color, texture } = entry;
        const light = shadeColor(color, 0.35);
        const light2 = shadeColor(color, 0.5);
        const dark = shadeColor(color, -0.35);

        switch (texture) {
          case "stripes":
            return `<pattern id="${id}" width="0.3" height="0.3" patternUnits="objectBoundingBox" patternTransform="rotate(45)">
      <rect width="0.3" height="0.3" fill="${color}" />
      <rect width="0.12" height="0.3" fill="${light}" />
    </pattern>`;
          case "dots":
            return `<pattern id="${id}" width="0.4" height="0.4" patternUnits="objectBoundingBox">
      <rect width="0.4" height="0.4" fill="${color}" />
      <circle cx="0.2" cy="0.2" r="0.12" fill="${light}" />
    </pattern>`;
          case "crosshatch":
            return `<pattern id="${id}" width="0.3" height="0.3" patternUnits="objectBoundingBox">
      <rect width="0.3" height="0.3" fill="${color}" />
      <path d="M0,0 L0.3,0.3 M0.3,0 L0,0.3" stroke="${light}" stroke-width="0.03" />
    </pattern>`;
          case "glitter":
            return `<pattern id="${id}" width="0.25" height="0.25" patternUnits="objectBoundingBox">
      <rect width="0.25" height="0.25" fill="${color}" />
      <circle cx="0.06" cy="0.08" r="0.02" fill="#fff" opacity="0.9" />
      <circle cx="0.18" cy="0.16" r="0.015" fill="#fff" opacity="0.7" />
      <circle cx="0.12" cy="0.2" r="0.02" fill="#fff" opacity="0.85" />
    </pattern>`;
          case "gradient":
            return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light2}" />
      <stop offset="1" stop-color="${dark}" />
    </linearGradient>`;
          default:
            return "";
        }
      })
      .join("\n    ");
  }

  function fillRef(paletteIndex) {
    const entry = palette[paletteIndex];
    return entry.texture === "solid" ? entry.color : `url(#fill-${paletteIndex})`;
  }

  function exportSvg() {
    const s = lastSettings;
    const shapeDef = SHAPES[s.shape];
    const symbolId = "shape-" + s.shape;

    const uses = lastInstances
      .map(
        (inst) =>
          `<use href="#${symbolId}" transform="translate(${inst.x.toFixed(2)},${inst.y.toFixed(2)}) rotate(${inst.rot.toFixed(1)}) scale(${inst.size.toFixed(2)})" fill="${fillRef(inst.paletteIndex)}" />`
      )
      .join("\n    ");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <symbol id="${symbolId}" viewBox="-1 -1 2 2">${shapeToSvgEl(shapeDef, symbolId + "-def")}</symbol>
    ${svgFillDefs(palette)}
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="${s.bg}" />
  <g>
    ${uses}
  </g>
</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "gift-wrap.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- Wire up events ---
  [el.shape, el.layout].forEach((n) => n.addEventListener("change", render));
  [el.size, el.spacing, el.rotation].forEach((n) => n.addEventListener("input", render));
  [el.randomRotation, el.varySize, el.randomColors].forEach((n) =>
    n.addEventListener("change", render)
  );
  el.bgColor.addEventListener("input", render);
  el.ribbonColor.addEventListener("input", render);
  el.randomizeBtn.addEventListener("click", render);
  el.exportPng.addEventListener("click", exportPng);
  el.exportSvg.addEventListener("click", exportSvg);

  renderPalette();
  render();
})();
