/* SW5E Character Sheet Viewer: the dice, drawn in 3D.
 *
 * Each die is a real polyhedron (tetrahedron, cube, octahedron, pentagonal trapezohedron, dodecahedron,
 * icosahedron), built from its vertices, lit face by face and drawn on a <canvas> with plain 2D calls (no
 * libraries: the sheet also runs as a Chrome extension). Its faces carry their numbers. The table is seen from above
 * (the view tipped only a little): at rest a die lies flat on the table with the rolled number's face on top, looking
 * at you, its number upright, the same size on every die and at the same height (the die is shifted so that face's
 * centre is the canvas's centre). A d4 has no top face: it rests on a face, point up, and its number shows at that
 * point (as a real d4's top number).
 *
 * A roll is only shown here (the numbers are rolled before): each die is tossed up toward you (it grows), bounces on
 * the table (its shadow underneath), and tumbles with a spin that slows down until it settles flat. The motion is
 * built backwards from the resting pose, so it always lands on the right number. Colours come from the page (--die-c on the die, --text, --panel-2), so the dice follow
 * the theme and the die's state (a natural 20, a critical die, a dropped one…).
 *
 *   Dice3D.paint(root)          draw every canvas.die-cv under root (after the dock is redrawn)
 *   Dice3D.roll([id…]) → ms     tumble these dice (by die id); how long until they've all settled
 *   Dice3D.enter([id…])         a short roll-in for dice just added (not rolled)
 *   Dice3D.spin(key)            a twirl (a die in the tray, hovered)
 * Canvas: <canvas class="die-cv" data-key data-sides data-value data-label data-size="roll|pick|add">.
 */
'use strict';

const Dice3D = (() => {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mulv = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => mulv(a, 1 / (len(a) || 1));
  // 3 × 3 matrices as arrays of rows.
  const mxv = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
  const mxm = (a, b) => a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
  /** A turn of `ang` radians about `axis` (a unit vector). */
  function rot(axis, ang) {
    const [x, y, z] = axis;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const t = 1 - c;
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
  }
  const DEG = Math.PI / 180;
  // The view: from above the table, tipped a little (a sliver of the dice's near sides shows, so they read as solids).
  const TILT = rot([1, 0, 0], -9 * DEG);
  const tiltOf = () => TILT;
  const LIGHT = unit([-0.5, 0.75, 0.65]);
  const HALF = unit(addv(LIGHT, [0, 0, 1]));
  const PERSP = 7; // the eye's distance, in die radii

  // ----------------------------------------------------------- geometry
  function vertsFor(sides) {
    const s = [-1, 1];
    const out = [];
    switch (sides) {
      case 4: return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
      case 6: for (const x of s) for (const y of s) for (const z of s) out.push([x, y, z]); return out;
      case 8: return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      case 10: {
        // Two rings of five, a half step apart, and two poles high enough that each kite is flat.
        const a = 0.105;
        const ring = (k, z, off) => [Math.cos((72 * k + off) * DEG), Math.sin((72 * k + off) * DEG), z];
        const n = cross(sub(ring(0, -a, 36), ring(0, a, 0)), sub(ring(1, a, 0), ring(0, a, 0)));
        const h = a + n[0] / n[2];
        for (let k = 0; k < 5; k++) out.push(ring(k, a, 0), ring(k, -a, 36));
        out.push([0, 0, h], [0, 0, -h]);
        return out;
      }
      case 12: {
        for (const x of s) for (const y of s) for (const z of s) out.push([x, y, z]);
        for (const a of s) for (const b of s) out.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]);
        return out;
      }
      default: // 20
        for (const a of s) for (const b of s) out.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
        return out;
    }
  }
  /** The faces of a convex polyhedron: { idx (vertices, counter-clockwise from outside), n (outward normal) }. */
  function hull(vs) {
    const faces = [];
    for (let i = 0; i < vs.length; i++) {
      for (let j = i + 1; j < vs.length; j++) {
        for (let k = j + 1; k < vs.length; k++) {
          let n = cross(sub(vs[j], vs[i]), sub(vs[k], vs[i]));
          if (len(n) < 1e-9) continue;
          n = unit(n);
          let d = dot(n, vs[i]);
          let pos = 0;
          let neg = 0;
          for (const v of vs) { const e = dot(n, v) - d; if (e > 1e-6) pos++; else if (e < -1e-6) neg++; }
          if (pos && neg) continue;
          if (pos) { n = mulv(n, -1); d = -d; }
          if (faces.some((f) => dot(f.n, n) > 1 - 1e-6)) continue;
          const idx = vs.map((v, m) => m).filter((m) => Math.abs(dot(n, vs[m]) - d) < 1e-5);
          const c = mulv(idx.reduce((t, m) => addv(t, vs[m]), [0, 0, 0]), 1 / idx.length);
          const u = unit(sub(vs[idx[0]], c));
          const w = cross(n, u);
          idx.sort((p, q) => Math.atan2(dot(sub(vs[p], c), w), dot(sub(vs[p], c), u)) - Math.atan2(dot(sub(vs[q], c), w), dot(sub(vs[q], c), u)));
          faces.push({ idx, n, c });
        }
      }
    }
    return faces;
  }
  const GEO = {};
  /** A die's solid, its faces' numbers and frames (any size other than the six: the d10's shape). */
  function geo(sides) {
    const shape = [4, 6, 8, 10, 12, 20].includes(sides) ? sides : 10;
    if (GEO[shape]) return GEO[shape];
    const raw = vertsFor(shape);
    const r = Math.max(...raw.map(len));
    const vs = raw.map((v) => mulv(v, 1 / r));
    const faces = hull(vs);
    for (const f of faces) {
      const p = f.idx.map((m) => vs[m]);
      // Which way is up on the face: toward a corner (triangles, pentagons, the d10's kite: its pole), or an edge (squares).
      let up;
      if (p.length === 4 && shape === 10) up = p.reduce((b, q) => (len(sub(q, f.c)) > len(sub(b, f.c)) ? q : b));
      else if (p.length === 4) up = mulv(addv(p[0], p[1]), 0.5);
      else up = p[0];
      const V = unit(sub(sub(up, f.c), mulv(f.n, dot(sub(up, f.c), f.n))));
      f.V = V;
      f.U = cross(V, f.n);
      f.M = [f.U, f.V, f.n]; // turns the die so this face looks at you (on top), upright
      f.anchor = f.c; // where its number shows at rest
      if (shape === 4) {
        // A d4 lies on another face, its point (the corner opposite this face) up: the number shows at the point.
        const apex = vs.find((v, m) => !f.idx.includes(m));
        const n = unit(apex);
        const V4 = unit(sub(p[0], mulv(n, dot(p[0], n))));
        f.M = [cross(V4, n), V4, n];
        f.anchor = apex;
      }
      f.rest = mxm(tiltOf(shape), f.M);
      f.tilt = tiltOf(shape);
      // The face's inner radius (how big a number fits on it).
      f.inr = Math.min(...p.map((a, i) => {
        const b = p[(i + 1) % p.length];
        const e = unit(sub(b, a));
        const q = sub(f.c, a);
        return len(sub(q, mulv(e, dot(q, e))));
      }));
    }
    // Numbers: opposite faces add up to sides + 1 (a d4 has none opposite).
    const n = faces.length;
    let k = 1;
    for (const f of faces) {
      if (f.value) continue;
      f.value = k;
      const o = faces.find((g) => !g.value && dot(g.n, f.n) < -0.999);
      if (o) o.value = n + 1 - k;
      k++;
    }
    const edges = new Map();
    faces.forEach((f, fi) => f.idx.forEach((a, i) => {
      const b = f.idx[(i + 1) % f.idx.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edges.has(key)) edges.set(key, { a, b, f: [] });
      edges.get(key).f.push(fi);
    }));
    GEO[shape] = { shape, vs, faces, edges: [...edges.values()], byValue: Object.fromEntries(faces.map((f, i) => [f.value, i])) };
    return GEO[shape];
  }
  // How big each die looks (its radius, as a share of the canvas's die box): balanced so they read the same size.
  const SCALE = { 4: 0.62, 6: 0.5, 8: 0.53, 10: 0.52, 12: 0.5, 20: 0.53 };

  // ----------------------------------------------------------- colours
  const colorCache = new Map();
  let probeCtx = null;
  /** [r, g, b, a] (0–255, a 0–1) for any CSS colour the page computed. */
  function rgba(str) {
    if (colorCache.has(str)) return colorCache.get(str);
    let out = null;
    let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(str);
    if (m) out = [+m[1], +m[2], +m[3], m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
    else if ((m = /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(str))) {
      out = [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
    } else {
      try {
        if (!probeCtx) { const c = document.createElement('canvas'); c.width = c.height = 1; probeCtx = c.getContext('2d', { willReadFrequently: true }); }
        probeCtx.clearRect(0, 0, 1, 1);
        probeCtx.fillStyle = '#888';
        probeCtx.fillStyle = str;
        probeCtx.fillRect(0, 0, 1, 1);
        const d = probeCtx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      } catch (e) { out = [136, 136, 136, 1]; }
    }
    colorCache.set(str, out);
    return out;
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${Math.round(Math.max(0, Math.min(255, c[0])))},${Math.round(Math.max(0, Math.min(255, c[1])))},${Math.round(Math.max(0, Math.min(255, c[2])))},${a})`;
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  /** The page's colours, read once per theme: a hidden probe takes each custom property as its colour. */
  let themeKey = '';
  let theme = null;
  function themeColors() {
    const de = document.documentElement;
    const key = `${de.getAttribute('data-theme')}|${de.getAttribute('data-style')}|${de.className}`;
    if (theme && key === themeKey) return theme;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    (document.getElementById('dice') || document.body).appendChild(probe);
    const read = (v) => { probe.style.color = `var(${v})`; return rgba(getComputedStyle(probe).color); };
    theme = { text: read('--text'), panel: read('--panel-2'), font: getComputedStyle(document.body).fontFamily || 'sans-serif' };
    probe.remove();
    themeKey = key;
    return theme;
  }

  // ----------------------------------------------------------- drawing
  const FONT_REF = 32; // numbers are laid out at this size, then scaled
  const ascentCache = {};
  function ascent(ctx, font) {
    if (ascentCache[font] == null) {
      ctx.font = font;
      const mm = ctx.measureText('0123456789');
      ascentCache[font] = mm.actualBoundingBoxAscent || FONT_REF * 0.72;
    }
    return ascentCache[font];
  }
  /**
   * One frame of a die. o: { sides, R (body → view), front (face index), text (the front's number or label),
   * cx, cy (die centre, css px), S (px per radius), lift (px above its rest), drift (px sideways), upright (0–1: the
   * front number from on its face to flat on the screen), fontPx, die, dashed, dropped, numbers (side numbers), shadow }.
   */
  function drawDie(ctx, dpr, o, colors) {
    const g = geo(o.sides);
    const { R, S } = o;
    const front = g.faces[o.front];
    // Shift the die so its number's place (at rest) is the canvas's centre: every number at the same height.
    const restC = mxv(front.rest, front.anchor);
    const kc = PERSP / (PERSP - restC[2]);
    const ox = -restC[0] * kc * S;
    const oy = restC[1] * kc * S;
    // Seen from above, a die off the table is nearer: larger, and a little up the screen (the view is tipped).
    const near = 1 + o.lift / (S * 5.5);
    const dx = o.cx + ox + o.drift[0];
    const dy = o.cy + oy + o.drift[1] - o.lift * 0.2;
    const px = (v) => {
      const p = mxv(R, v);
      const k = (PERSP / (PERSP - p[2])) * S * near;
      return [dx + p[0] * k, dy - p[1] * k, p[2]];
    };
    const pts = g.vs.map(px);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A soft shadow on the table under the die (the light is above, to the upper left): it slides off to the lower
    // right and fades as the die rises.
    if (o.shadow) {
      const up = Math.min(1, o.lift / (S * 1.2));
      const r = S * (0.86 + 0.2 * up);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, `rgba(0,0,0,${0.3 * (1 - 0.65 * up)})`);
      grad.addColorStop(0.6, `rgba(0,0,0,${0.18 * (1 - 0.65 * up)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(o.cx + o.drift[0] + S * 0.1 + o.lift * 0.35, o.cy + o.drift[1] + S * 0.16 + o.lift * 0.3);
      ctx.scale(r, r * 0.93);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const die = o.die;
    // The die's colour, softened toward the panel (more on a light page, so the dark numbers read).
    const base = mix(die, colors.panel, lum(colors.panel) > 0.5 ? 0.5 : 0.22);
    const vis = g.faces.map((f) => mxv(R, f.n));
    const shown = [];
    g.faces.forEach((f, i) => { if (vis[i][2] > 1e-3) shown.push(i); });
    // (Convex: the faces turned toward you never overlap, so no sorting is needed.)
    ctx.lineJoin = 'round';
    for (const i of shown) {
      const n = vis[i];
      const diffuse = Math.max(0, dot(n, LIGHT));
      const spec = Math.pow(Math.max(0, dot(n, HALF)), 28);
      let c = mulv(base, 0.52 + 0.6 * diffuse);
      c = mix(c, [255, 255, 255], 0.42 * spec);
      ctx.beginPath();
      g.faces[i].idx.forEach((m, j) => (j ? ctx.lineTo(pts[m][0], pts[m][1]) : ctx.moveTo(pts[m][0], pts[m][1])));
      ctx.closePath();
      ctx.fillStyle = css(c);
      ctx.fill();
      ctx.strokeStyle = css(mix(die, c, 0.35), 0.75);
      ctx.lineWidth = 1;
      ctx.stroke();
      g.faces[i].shade = c;
    }
    // The outline: edges between a face turned toward you and one turned away.
    ctx.beginPath();
    for (const e of g.edges) {
      const [f1, f2] = e.f;
      if ((vis[f1][2] > 1e-3) === (vis[f2][2] > 1e-3)) continue;
      ctx.moveTo(pts[e.a][0], pts[e.a][1]);
      ctx.lineTo(pts[e.b][0], pts[e.b][1]);
    }
    ctx.strokeStyle = css(die);
    ctx.lineWidth = o.small ? 1.2 : 1.8;
    ctx.lineCap = 'round';
    if (o.dashed) ctx.setLineDash([5, 3.5]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Numbers: on every face turned toward you (fading as it turns away); the front one upright at the end.
    const font = `700 ${FONT_REF}px ${colors.font}`;
    ctx.font = font;
    ctx.textAlign = 'center';
    const asc = ascent(ctx, font);
    const label = (i, text, a, fl, upright, color) => {
      const f = g.faces[i];
      const p0 = px(f.c);
      const e = 0.25;
      const pu = px(addv(f.c, mulv(f.U, e)));
      const pv = px(addv(f.c, mulv(f.V, e)));
      const k = fl / S / FONT_REF; // text px → the face's units (fl: its size in px at rest)
      let m = [(pu[0] - p0[0]) / e * k, (pu[1] - p0[1]) / e * k, -(pv[0] - p0[0]) / e * k, -(pv[1] - p0[1]) / e * k, p0[0], p0[1]];
      if (upright > 0) {
        const s = o.fontPx / FONT_REF;
        const flat = [s, 0, 0, s, o.cx, o.cy];
        m = m.map((x, j) => x + (flat[j] - x) * upright);
      }
      ctx.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr);
      ctx.globalAlpha = a;
      // A thin rim in the face's own colour keeps the number clear of the edges.
      ctx.lineWidth = FONT_REF * 0.14;
      ctx.strokeStyle = css(f.shade || base);
      ctx.strokeText(text, 0, asc / 2);
      ctx.fillStyle = css(color);
      ctx.fillText(text, 0, asc / 2);
      if (o.dropped && i === o.front && text) {
        const w = ctx.measureText(text).width;
        ctx.fillRect(-w / 2 - 3, -FONT_REF * 0.04, w + 6, FONT_REF * 0.09);
      }
      // 6 and 9 underlined (which way up they are).
      if ((text === '6' || text === '9') && i !== o.front && g.faces.length > 6) ctx.fillRect(-FONT_REF * 0.24, asc / 2 + FONT_REF * 0.1, FONT_REF * 0.48, FONT_REF * 0.07);
      ctx.globalAlpha = 1;
    };
    const fit = (f) => Math.min(o.fontPx / S, f.inr * 1.05) * S;
    if (o.numbers) {
      for (const i of shown) {
        if (i === o.front) continue;
        const a = Math.max(0, Math.min(1, (vis[i][2] - 0.22) / 0.4));
        if (a > 0.02) label(i, String(g.faces[i].value), a * 0.7, fit(g.faces[i]), 0, colors.text);
      }
    }
    // A d4's number: at its point, once it settles (its face lies on the table).
    if (g.shape === 4) {
      if (o.text && o.upright > 0) label(o.front, o.text, o.upright, o.fontPx, 1, o.textColor || colors.text);
    } else if (vis[o.front][2] > 1e-3 && o.text) {
      const a = Math.max(o.upright, Math.min(1, (vis[o.front][2] - 0.22) / 0.4));
      const color = o.textColor || colors.text;
      label(o.front, o.text, a, o.upright >= 1 ? o.fontPx : fit(front), o.upright, color);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ----------------------------------------------------------- canvases, motion
  const anims = new Map(); // key → { start, T, kind, … }
  let raf = 0;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const now = () => (window.performance ? performance.now() : Date.now());
  const rand = (a, b) => a + Math.random() * (b - a);
  const randAxis = (bias) => unit([rand(-1, 1) * bias[0], rand(-1, 1) * bias[1], rand(-1, 1) * bias[2]]);
  /** A drop: falls from `h0`, bounces with restitution e until it rests by `tEnd` (s → px above the table). */
  function bounceCurve(h0, t1, e) {
    const g = (2 * h0) / (t1 * t1);
    const hops = [];
    let v = g * t1;
    let t = t1;
    for (let i = 0; i < 4 && v * e > 0.05 * g * t1; i++) {
      v *= e;
      const d = (2 * v) / g;
      hops.push({ t0: t, d, v });
      t += d;
    }
    return (s) => {
      if (s < t1) return h0 - 0.5 * g * s * s;
      for (const hp of hops) if (s < hp.t0 + hp.d) { const x = s - hp.t0; return hp.v * x - 0.5 * g * x * x; }
      return 0;
    };
  }
  function newRoll(kind) {
    const T = kind === 'roll' ? rand(0.95, 1.25) : kind === 'enter' ? 0.55 : 0.7;
    const a = {
      kind, start: now(), T,
      ax1: randAxis([1, 0.35, 0.7]), A1: kind === 'roll' ? Math.PI * 2 * rand(1.3, 2.3) * (Math.random() < 0.5 ? -1 : 1) : kind === 'enter' ? Math.PI * rand(0.8, 1.2) : 0,
      ax2: randAxis([0.4, 1, 0.4]), A2: kind === 'roll' ? Math.PI * 2 * rand(0.25, 0.6) : kind === 'spin' ? Math.PI * 2 : 0,
      drift: kind === 'roll' ? [rand(-14, 14), rand(-10, 10)] : kind === 'enter' ? [-26, 0] : [0, 0],
      lift: kind === 'roll' ? bounceCurve(rand(20, 28), 0.3, 0.42) : kind === 'enter' ? bounceCurve(10, 0.18, 0.35) : () => 0,
    };
    return a;
  }
  /** Where a die is now: its rotation, height, sideways drift and how upright its number is. */
  function poseAt(a, face, t) {
    if (!a) return { R: face.rest, lift: 0, drift: [0, 0], upright: 1, done: true };
    const u = Math.min(1, (t - a.start) / 1000 / a.T);
    // Spin built backwards from the rest pose: the turn left shrinks to nothing, so the die slows and settles.
    const s1 = a.A1 * Math.pow(1 - u, 3);
    const s2 = a.A2 * Math.pow(1 - u, a.kind === 'spin' ? 3 : 2);
    const spin = mxm(rot(a.ax1, s1), rot(a.kind === 'spin' ? [0, 1, 0] : a.ax2, s2));
    const R = mxm(face.tilt, mxm(spin, face.M));
    const up = u < 0.8 ? 0 : (u - 0.8) / 0.2;
    return { R, lift: Math.max(0, a.lift((t - a.start) / 1000)), drift: a.drift.map((d) => d * Math.pow(1 - u, 2.5)), upright: up * up * (3 - 2 * up), done: u >= 1 };
  }
  /** Size a canvas to its box (sharp at any zoom). */
  function fitCanvas(cv) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = cv.clientWidth || num0(cv.getAttribute('width'));
    const h = cv.clientHeight || w;
    if (!w || !h) return null;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return { w, h, dpr };
  }
  const num0 = (v) => Number(v) || 0;
  function drawCanvas(cv, t) {
    if (!cv.getContext) return true;
    const box = fitCanvas(cv);
    if (!box) return true;
    const ctx = cv.getContext('2d');
    if (!ctx) return true;
    const sides = num0(cv.dataset.sides) || 20;
    const g = geo(sides);
    const value = cv.dataset.value === '' || cv.dataset.value == null ? null : num0(cv.dataset.value);
    const known = value != null && g.byValue[value] != null && g.shape === sides;
    const max = g.faces.length;
    const front = known ? g.byValue[value] : g.byValue[max];
    const size = cv.dataset.size || 'roll';
    const dieEl = cv.closest('.die, .die-pick') || cv;
    const colors = themeColors();
    const dieColor = rgba(getComputedStyle(cv).color);
    const a = anims.get(cv.dataset.key);
    const pose = poseAt(a, g.faces[front], t);
    // The die's box: a roll's die sits in the middle of a larger canvas (room to bounce); the tray's fills its own.
    const boxPx = size === 'roll' ? num0(cv.dataset.box) || 60 : box.w;
    const S = boxPx * (SCALE[g.shape] || 0.52);
    const unrolled = value == null && size === 'roll';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawDie(ctx, box.dpr, {
      sides, R: pose.R, front, S, cx: box.w / 2, cy: box.h / 2, lift: pose.lift, drift: pose.drift, upright: pose.upright,
      text: size === 'add' ? '' : unrolled ? cv.dataset.label || `d${sides}` : String(value != null ? value : max),
      fontPx: size === 'roll' ? (unrolled ? 12.5 : 18) : Math.round(box.w * 0.27),
      textColor: unrolled ? mix(colors.text, colors.panel, 0.25) : null,
      die: dieColor, dashed: dieEl.classList.contains('critd'), dropped: dieEl.classList.contains('dropped'),
      numbers: size !== 'add' && g.shape === sides && g.shape !== 4, small: size !== 'roll', shadow: size === 'roll',
    }, colors);
    if (a && pose.done) anims.delete(cv.dataset.key);
    return !a || pose.done;
  }
  const canvases = (root) => [...(root || document).querySelectorAll('canvas.die-cv')];
  function frame() {
    raf = 0;
    const t = now();
    const live = new Set();
    for (const cv of canvases(document.getElementById('dice'))) {
      if (!anims.has(cv.dataset.key)) continue;
      live.add(cv.dataset.key);
      drawCanvas(cv, t);
    }
    // A die whose canvas is gone (the dock closed) stops; one waiting for its canvas a moment keeps going.
    for (const [k, a] of anims) if (!live.has(k) && t - a.start > a.T * 1000 + 200) anims.delete(k);
    if (anims.size) raf = requestAnimationFrame(frame);
  }
  const loop = () => { if (!raf && anims.size && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame); };
  function start(keys, kind) {
    if (reduced() || typeof document === 'undefined') return 0;
    let longest = 0;
    for (const k of keys) {
      const a = newRoll(kind);
      anims.set(k, a);
      longest = Math.max(longest, a.T);
    }
    loop();
    return Math.ceil(longest * 1000);
  }
  function paint(root) {
    if (typeof document === 'undefined' || !root || !root.querySelectorAll) return;
    const t = now();
    for (const cv of canvases(root)) drawCanvas(cv, t);
    loop();
  }
  // A theme switch: draw them again in the new colours.
  try {
    new MutationObserver(() => { theme = null; paint(document.getElementById('dice')); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-style', 'class'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { theme = null; paint(document.getElementById('dice')); });
  } catch (e) { /* headless */ }
  return {
    paint,
    roll: (ids) => start(ids.map((id) => `die:${id}`), 'roll'),
    enter: (ids) => start(ids.map((id) => `die:${id}`), 'enter'),
    spin: (key) => { if (!anims.has(key)) start([key], 'spin'); },
    geo,
  };
})();
