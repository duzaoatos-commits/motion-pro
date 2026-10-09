// motion-pro core: math shared by the Remotion renderer and the Node scripts
// (validate_spec, spec_to_jsx). Keep this file dependency-free ES module.

export const EASES = {
  linear: 'linear',
  hold: 'hold',
  outCubic: [0.33, 1, 0.68, 1],
  outQuint: [0.22, 1, 0.36, 1],
  outExpo: [0.16, 1, 0.3, 1],
  inCubic: [0.32, 0, 0.67, 0],
  inQuint: [0.64, 0, 0.78, 0],
  inExpo: [0.7, 0, 0.84, 0],
  inOutCubic: [0.65, 0, 0.35, 1],
  inOutQuart: [0.76, 0, 0.24, 1],
  inOutQuint: [0.83, 0, 0.17, 1],
  inOutExpo: [0.87, 0, 0.13, 1],
  snap: [0.9, 0, 0.1, 1],
  outBack: [0.34, 1.56, 0.64, 1],
  inBack: [0.36, 0, 0.66, -0.56],
};

export const DEFAULT_EASE = 'inOutCubic';

/** Resolve an ease spec to 'linear' | 'hold' | [x1, y1, x2, y2]. */
export function resolveEase(e) {
  if (e === undefined || e === null) return EASES[DEFAULT_EASE];
  if (Array.isArray(e)) {
    if (e.length !== 4 || e.some((n) => typeof n !== 'number' || !isFinite(n))) {
      throw new Error('Bezier invalida: ' + JSON.stringify(e));
    }
    if (e[0] < 0 || e[0] > 1 || e[2] < 0 || e[2] > 1) {
      throw new Error('Bezier invalida (x1 e x2 precisam ficar entre 0 e 1): ' + JSON.stringify(e));
    }
    return e;
  }
  if (typeof e === 'string' && Object.prototype.hasOwnProperty.call(EASES, e)) return EASES[e];
  throw new Error('Easing desconhecido: ' + JSON.stringify(e));
}

/** Coefficients of a unit cubic bezier (WebKit UnitBezier). */
export function bezierCoefficients(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return {ax, bx, cx, ay, by, cy};
}

const bezierCache = new Map();

/** Returns y = f(x) for a CSS-style cubic-bezier, x in [0, 1]. */
export function bezier(x1, y1, x2, y2) {
  const key = x1 + ',' + y1 + ',' + x2 + ',' + y2;
  const cached = bezierCache.get(key);
  if (cached) return cached;
  const {ax, bx, cx, ay, by, cy} = bezierCoefficients(x1, y1, x2, y2);
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const solveX = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 60; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-7) return t;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  const fn = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)));
  bezierCache.set(key, fn);
  return fn;
}

/** Eased progress for progress p in [0, 1]. */
export function easeProgress(ease, p) {
  const e = resolveEase(ease);
  if (e === 'linear') return p;
  if (e === 'hold') return p < 1 ? 0 : 1;
  return bezier(e[0], e[1], e[2], e[3])(p);
}

export function isKeyframes(p) {
  return Array.isArray(p) && p.length > 0 && p[0] !== null && typeof p[0] === 'object' && !Array.isArray(p[0]) && 't' in p[0];
}

// ---------- colors ----------

export function parseColor(c) {
  if (Array.isArray(c)) return [c[0], c[1], c[2], c.length > 3 ? c[3] : 1];
  if (typeof c !== 'string') throw new Error('Cor invalida: ' + JSON.stringify(c));
  let h = c.trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  if (h.length !== 6 && h.length !== 8) throw new Error('Cor invalida: ' + c);
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
}

export function colorToCss(rgba) {
  const r = Math.round(Math.max(0, Math.min(1, rgba[0])) * 255);
  const g = Math.round(Math.max(0, Math.min(1, rgba[1])) * 255);
  const b = Math.round(Math.max(0, Math.min(1, rgba[2])) * 255);
  const a = Math.max(0, Math.min(1, rgba[3] === undefined ? 1 : rgba[3]));
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(4)})`;
}

// ---------- keyframe evaluation ----------

function lerp(a, b, k) {
  if (Array.isArray(a)) return a.map((av, i) => av + (b[i] - av) * k);
  return a + (b - a) * k;
}

/**
 * Evaluate a property at frame f.
 * kind: 'number' | 'vec' | 'color'. Static values pass through.
 * Keyframes: [{t, v, e}] where e is the ease from this key to the next one.
 */
export function evalProp(p, f, def, kind = 'number') {
  if (p === undefined || p === null) return def;
  if (!isKeyframes(p)) return kind === 'color' ? parseColor(p) : p;
  const conv = (v) => (kind === 'color' ? parseColor(v) : v);
  if (f <= p[0].t) return conv(p[0].v);
  const last = p[p.length - 1];
  if (f >= last.t) return conv(last.v);
  let i = 0;
  while (i < p.length - 1 && !(f >= p[i].t && f < p[i + 1].t)) i++;
  const k0 = p[i];
  const k1 = p[i + 1];
  const prog = (f - k0.t) / (k1.t - k0.t);
  const k = easeProgress(k0.e, prog);
  return lerp(conv(k0.v), conv(k1.v), k);
}

// ---------- transforms (CSS matrix [a, b, c, d, e, f]) ----------

export const IDENTITY = [1, 0, 0, 1, 0, 0];

export function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** M = T(position) * R(rotation) * S(scale) * T(-anchor). Rotation in degrees, clockwise. */
export function localMatrix(px, py, rotDeg, sx, sy, ax, ay) {
  const r = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const a = cos * sx;
  const b = sin * sx;
  const c = -sin * sy;
  const d = cos * sy;
  return [a, b, c, d, px - (a * ax + c * ay), py - (b * ax + d * ay)];
}

// ---------- spec defaults ----------

export function layerSize(layer, spec) {
  if (layer.type === 'solid') return layer.size || [spec.comp.width, spec.comp.height];
  if (layer.type === 'image' || layer.type === 'video') return [layer.width, layer.height];
  return null;
}

export function defaultAnchor(layer, spec) {
  const s = layerSize(layer, spec);
  return s ? [s[0] / 2, s[1] / 2] : [0, 0];
}

export function defaultPosition(layer, spec) {
  if (layer.type === 'custom') return [0, 0];
  if (layer.parent) return [0, 0];
  return [spec.comp.width / 2, spec.comp.height / 2];
}

/** Returns {x, y} props for a layer's position (static numbers or keyframes). */
export function positionProps(layer, spec) {
  const pos = layer.transform && layer.transform.position;
  const def = defaultPosition(layer, spec);
  if (pos === undefined) return {x: def[0], y: def[1]};
  if (Array.isArray(pos) && !isKeyframes(pos)) return {x: pos[0], y: pos[1]};
  if (pos && typeof pos === 'object' && !Array.isArray(pos)) {
    return {x: pos.x === undefined ? def[0] : pos.x, y: pos.y === undefined ? def[1] : pos.y};
  }
  throw new Error(`Camada ${layer.id}: position deve ser [x, y] ou {x, y}`);
}

export function scaleAt(layer, f) {
  const s = layer.transform && layer.transform.scale;
  if (s === undefined) return [100, 100];
  if (typeof s === 'number') return [s, s];
  if (isKeyframes(s)) {
    const v = evalProp(s, f, 100, typeof s[0].v === 'number' ? 'number' : 'vec');
    return typeof v === 'number' ? [v, v] : v;
  }
  if (Array.isArray(s)) return s;
  throw new Error(`Camada ${layer.id}: scale invalido`);
}

export function localMatrixAt(layer, spec, f) {
  const t = layer.transform || {};
  const anchor = t.anchor || defaultAnchor(layer, spec);
  const pos = positionProps(layer, spec);
  const px = evalProp(pos.x, f, 0);
  const py = evalProp(pos.y, f, 0);
  const rot = evalProp(t.rotation, f, 0);
  const [sx, sy] = scaleAt(layer, f);
  return localMatrix(px, py, rot, sx / 100, sy / 100, anchor[0], anchor[1]);
}

export function worldMatrixAt(layer, byId, spec, f, depth = 0) {
  if (depth > 32) throw new Error('Ciclo de parent detectado em ' + layer.id);
  const local = localMatrixAt(layer, spec, f);
  if (!layer.parent) return local;
  const parent = byId[layer.parent];
  if (!parent) throw new Error(`Camada ${layer.id}: parent "${layer.parent}" nao existe`);
  return mul(worldMatrixAt(parent, byId, spec, f, depth + 1), local);
}

export function opacityAt(layer, f) {
  return evalProp(layer.transform && layer.transform.opacity, f, 100);
}

// ---------- geometry (shared with the After Effects export) ----------

const KAPPA = 0.5522847498;

/**
 * Closed bezier path for a rectangle centered according to origin (fractions of the box
 * placed at the layer origin). Starts at the top-left corner (after rounding) and goes clockwise.
 * Returns {vertices, inTangents, outTangents, closed}; tangents are relative to their vertex.
 */
export function rectPath(w, h, roundness, origin) {
  const ox = origin ? origin[0] : 0.5;
  const oy = origin ? origin[1] : 0.5;
  const left = -w * ox;
  const top = -h * oy;
  const right = left + w;
  const bottom = top + h;
  const r = Math.max(0, Math.min(roundness || 0, w / 2, h / 2));
  if (r <= 0.0001) {
    return {
      vertices: [[left, top], [right, top], [right, bottom], [left, bottom]],
      inTangents: [[0, 0], [0, 0], [0, 0], [0, 0]],
      outTangents: [[0, 0], [0, 0], [0, 0], [0, 0]],
      closed: true,
    };
  }
  const k = r * KAPPA;
  return {
    vertices: [
      [left + r, top], [right - r, top],
      [right, top + r], [right, bottom - r],
      [right - r, bottom], [left + r, bottom],
      [left, bottom - r], [left, top + r],
    ],
    inTangents: [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]],
    outTangents: [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]],
    closed: true,
  };
}

/** Closed path for an ellipse, starting at 12 o'clock and going clockwise. */
export function ellipsePath(w, h, origin) {
  const ox = origin ? origin[0] : 0.5;
  const oy = origin ? origin[1] : 0.5;
  const cx = w * (0.5 - ox);
  const cy = h * (0.5 - oy);
  const rx = w / 2;
  const ry = h / 2;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return {
    vertices: [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]],
    inTangents: [[-kx, 0], [0, -ky], [kx, 0], [0, ky]],
    outTangents: [[kx, 0], [0, ky], [-kx, 0], [0, -ky]],
    closed: true,
  };
}

/**
 * Parse an SVG path string with absolute M, L, H, V, C, Z commands into AE-style shapes.
 * Returns an array of {vertices, inTangents, outTangents, closed}.
 */
export function parsePathD(d) {
  const tokens = String(d).match(/[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens) throw new Error('Path vazio');
  const shapes = [];
  let cur = null;
  let i = 0;
  let cmd = null;
  let px = 0;
  let py = 0;
  const num = () => {
    const v = parseFloat(tokens[i++]);
    if (!isFinite(v)) throw new Error('Path invalido: ' + d);
    return v;
  };
  const startShape = (x, y) => {
    cur = {vertices: [[x, y]], inTangents: [[0, 0]], outTangents: [[0, 0]], closed: false};
    shapes.push(cur);
  };
  while (i < tokens.length) {
    const tk = tokens[i];
    if (/[A-Za-z]/.test(tk)) {
      cmd = tk;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        if (cur) {
          cur.closed = true;
          const n = cur.vertices.length;
          const first = cur.vertices[0];
          const lastV = cur.vertices[n - 1];
          if (n > 1 && Math.abs(first[0] - lastV[0]) < 1e-6 && Math.abs(first[1] - lastV[1]) < 1e-6) {
            cur.inTangents[0] = cur.inTangents[n - 1];
            cur.vertices.pop();
            cur.inTangents.pop();
            cur.outTangents.pop();
          }
          px = cur.vertices[0][0];
          py = cur.vertices[0][1];
        }
        cur = null;
        continue;
      }
      if (cmd !== cmd.toUpperCase()) throw new Error('Use so comandos absolutos (M, L, H, V, C, Z) no path: ' + d);
    }
    if (cmd === 'M') {
      px = num();
      py = num();
      startShape(px, py);
      cmd = 'L';
    } else if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      if (cmd === 'L') { px = num(); py = num(); }
      else if (cmd === 'H') { px = num(); }
      else { py = num(); }
      if (!cur) startShape(px, py);
      else { cur.vertices.push([px, py]); cur.inTangents.push([0, 0]); cur.outTangents.push([0, 0]); }
    } else if (cmd === 'C') {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      if (!cur) startShape(px, py);
      const n = cur.vertices.length - 1;
      const prev = cur.vertices[n];
      cur.outTangents[n] = [x1 - prev[0], y1 - prev[1]];
      cur.vertices.push([x, y]);
      cur.inTangents.push([x2 - x, y2 - y]);
      cur.outTangents.push([0, 0]);
      px = x;
      py = y;
    } else {
      throw new Error('Comando de path nao suportado: ' + cmd);
    }
  }
  return shapes;
}

/** Convert AE-style shapes back to an SVG path string (used for rect/ellipse with trim). */
export function shapesToD(shapes) {
  const f = (n) => Math.round(n * 1000) / 1000;
  return shapes
    .map((s) => {
      const v = s.vertices;
      let d = `M${f(v[0][0])} ${f(v[0][1])}`;
      const seg = (a, b) => {
        const o = s.outTangents[a];
        const inn = s.inTangents[b];
        const p = v[a];
        const q = v[b];
        if (o[0] === 0 && o[1] === 0 && inn[0] === 0 && inn[1] === 0) return `L${f(q[0])} ${f(q[1])}`;
        return `C${f(p[0] + o[0])} ${f(p[1] + o[1])} ${f(q[0] + inn[0])} ${f(q[1] + inn[1])} ${f(q[0])} ${f(q[1])}`;
      };
      for (let k = 1; k < v.length; k++) d += seg(k - 1, k);
      if (s.closed) d += seg(v.length - 1, 0) + 'Z';
      return d;
    })
    .join('');
}

// ---------- text animators ----------

/** Unit index used for timing, mirrors the After Effects expression. */
export function animatorOrderIndex(order, n, total) {
  if (order === 'reverse') return total - 1 - n;
  if (order === 'center') return Math.abs(n - (total - 1) / 2);
  return n;
}

/** Amount (0..1, can overshoot) of an animator for unit n of total at frame f. */
export function animatorAmount(an, n, total, f) {
  const i = animatorOrderIndex(an.order, n, total);
  const start = an.start + i * (an.stagger || 0);
  let p = (f - start) / Math.max(an.duration, 0.0001);
  p = p < 0 ? 0 : p > 1 ? 1 : p;
  const e = easeProgress(an.ease, p);
  return an.phase === 'out' ? e : 1 - e;
}

/** Split text into units for an animator. Returns lines -> tokens with unit indices. */
export function splitUnits(text, by) {
  const lines = String(text).split('\n');
  let counter = 0;
  const out = lines.map((line, li) => {
    if (by === 'lines') return [{text: line, unit: counter++}];
    if (by === 'words') {
      const parts = line.split(/(\s+)/).filter((p) => p.length > 0);
      return parts.map((p) => (/^\s+$/.test(p) ? {text: p, unit: -1} : {text: p, unit: counter++}));
    }
    return Array.from(line).map((ch) => (/\s/.test(ch) ? {text: ch, unit: -1} : {text: ch, unit: counter++}));
  });
  return {lines: out, total: counter};
}

// ---------- counters (animated numbers) ----------

const SEPARATORS = {'pt-BR': ['.', ','], 'en-US': [',', '.']};

/** Format like the After Effects expression: fixed decimals, thousands separator, decimal separator. */
export function formatNumber(v, decimals = 0, locale = 'pt-BR') {
  const [ts, ds] = SEPARATORS[locale] || SEPARATORS['pt-BR'];
  const neg = v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -decimals);
  const s = Math.abs(v).toFixed(decimals);
  const [ip, dp] = s.split('.');
  let out = '';
  for (let i = ip.length; i > 0; i -= 3) {
    const st = Math.max(0, i - 3);
    out = ip.substring(st, i) + (out ? ts + out : '');
  }
  return (neg ? '-' : '') + out + (decimals > 0 ? ds + dp : '');
}

export function counterTextAt(c, f) {
  let p = (f - c.start) / Math.max(c.duration, 0.0001);
  p = p < 0 ? 0 : p > 1 ? 1 : p;
  const v = c.from + (c.to - c.from) * easeProgress(c.ease, p);
  return (c.prefix || '') + formatNumber(v, c.decimals || 0, c.locale || 'pt-BR') + (c.suffix || '');
}

export function fontStyleName(weight, italic) {
  const names = {100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black'};
  const base = names[weight] || 'Regular';
  if (!italic) return base;
  return base === 'Regular' ? 'Italic' : base + ' Italic';
}
