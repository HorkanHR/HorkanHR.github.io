// Intent: interactive rotating 3D "UMAP" on the website. Auto-rotates; drag to spin; hover a point to see its cell type;
// hover a legend entry to highlight a cell type. Data: real Hydractinia Cell Atlas subsample (umap.js); x,y = UMAP, z = pseudotime.
(function () {
  const canvas = document.getElementById('umap');
  if (!canvas || !window.UMAP_POINTS) return;
  const ctx = canvas.getContext('2d');
  const pts = window.UMAP_POINTS, clusters = window.UMAP_CLUSTERS;
  const tip = document.getElementById('umap-tip');
  const legend = document.getElementById('umap-legend');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let yaw = 0.0, pitch = -0.25, dragging = false, lastX = 0, lastY = 0, highlight = -1, mouse = null, W = 0, H = 0, dpr = 1;

  // Build legend buttons
  clusters.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<i style="background:${c.color}"></i>${c.name}`;
    b.addEventListener('mouseenter', () => { highlight = i; });
    b.addEventListener('mouseleave', () => { highlight = -1; });
    b.addEventListener('focus', () => { highlight = i; });
    b.addEventListener('blur', () => { highlight = -1; });
    legend.appendChild(b);
  });

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function project() {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const s = Math.min(W, H) * 0.42, out = [];
    for (const [x, y, z, c] of pts) {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;      // rotate about vertical axis
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;      // tilt
      const persp = 1 / (1.9 - z2 * 0.55);                     // gentle perspective
      out.push({ X: W / 2 + x1 * s * persp * 2.9, Y: H / 2 - y2 * s * persp * 2.9, Z: z2, c });
    }
    return out.sort((a, b) => a.Z - b.Z);                       // painter's order: far first
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const P = project();
    let near = null, best = 60;
    for (const p of P) {
      const col = clusters[p.c].color, depth = (p.Z + 1) / 2;
      const dim = highlight >= 0 && highlight !== p.c;
      const r = (0.8 + depth * 1.5) * (highlight === p.c ? 1.5 : 1);
      ctx.globalAlpha = dim ? 0.05 : 0.25 + depth * 0.6;
      ctx.fillStyle = col;
      
      ctx.fillRect(p.X - r, p.Y - r, r * 2, r * 2);
      if (mouse) { const d = (p.X - mouse.x) ** 2 + (p.Y - mouse.y) ** 2; if (d < best) { best = d; near = p; } }
    }
    ctx.globalAlpha = 1;
    if (near && !dragging) {
      tip.style.display = 'block';
      tip.style.left = near.X + 12 + 'px'; tip.style.top = near.Y - 10 + 'px';
      tip.textContent = clusters[near.c].name;
      tip.style.borderColor = clusters[near.c].color;
    } else tip.style.display = 'none';
  }

  function loop() {
    if (!dragging && !reduce) yaw += 0.0035;
    draw();
    requestAnimationFrame(loop);
  }

  // Pointer interaction: drag to rotate, hover for cell type
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (dragging) {
      yaw += (e.clientX - lastX) * 0.01;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
    }
  });
  loop();
})();
