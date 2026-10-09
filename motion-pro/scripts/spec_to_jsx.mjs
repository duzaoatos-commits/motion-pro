#!/usr/bin/env node
// Convert a motion-pro spec into an After Effects ExtendScript (.jsx) that builds an editable comp.
//
// Usage:
//   node spec_to_jsx.mjs --spec <motion.json> --out <dir> [--prerender <dir>]
//
// --prerender points to the folder made by `render.mjs --ae` (out/ae/prerender). Custom layers
// (Three.js or other code) are imported from there as PNG sequences with alpha.
//
// Output in <dir>: <slug>.jsx, assets/ (copied media), LEIA-ME.txt. Zip the folder to deliver.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const core = await import(pathToFileURL(path.join(here, '..', 'assets', 'remotion-template', 'src', 'engine', 'core.mjs')).href);
const {validateSpec} = await import(pathToFileURL(path.join(here, 'validate_spec.mjs')).href);

function arg(name, def = undefined) {
  const i = process.argv.indexOf(name);
  if (i < 0) return def;
  return process.argv[i + 1];
}

const BLUR_FACTOR = 2; // CSS blur radius -> AE Gaussian Blur "Blurriness" (approximation)
const AE_TEXT_BASED_ON = {chars: 2, words: 3, lines: 4}; // Characters Excluding Spaces, Words, Lines
const AE_ANCHOR_GROUPING = {chars: 1, words: 2, lines: 3};
const CAP = {butt: 1, round: 2, square: 3};
const JOIN = {miter: 1, round: 2, bevel: 3};

export function buildAeData(spec, {prerenderDir = null} = {}) {
  const fps = spec.comp.fps;
  const notes = [];
  const byId = Object.fromEntries(spec.layers.map((l) => [l.id, l]));
  const r4 = (n) => Math.round(n * 10000) / 10000;

  const segType = (e) => {
    const r = core.resolveEase(e);
    return r === 'linear' ? 'L' : r === 'hold' ? 'H' : 'B';
  };
  const asArr = (v) => (Array.isArray(v) ? v : [v]);

  function segEase(v0, v1, dt, b) {
    const [x1, y1, x2, y2] = b;
    const outX = Math.max(x1, 0.001);
    const inX = Math.max(1 - x2, 0.001);
    const out = [];
    const inn = [];
    for (let d = 0; d < v0.length; d++) {
      const avg = (v1[d] - v0[d]) / dt;
      out.push([r4((y1 / outX) * avg), r4(Math.min(100, outX * 100))]);
      inn.push([r4(((1 - y2) / inX) * avg), r4(Math.min(100, inX * 100))]);
    }
    return {out, in: inn};
  }

  /** Convert a spec property into {s} (static) or {k, ty, ez} (keyframes) for the runtime. */
  function anim(p, def, {kind = 'num', map = (v) => v} = {}) {
    const norm = (v) => {
      if (kind === 'color') {
        const c = core.parseColor(v);
        return [r4(c[0]), r4(c[1]), r4(c[2]), 1];
      }
      return v;
    };
    const conv = (v) => {
      const m = map(norm(v));
      return Array.isArray(m) ? m.map(r4) : r4(m);
    };
    if (p === undefined || p === null) return def === undefined ? undefined : {s: conv(def)};
    if (!core.isKeyframes(p)) return {s: conv(p)};
    const k = p.map((kf) => [kf.t / fps, conv(kf.v)]); // exact frame times
    const ty = [];
    const ez = [];
    for (let i = 0; i < p.length; i++) {
      const segIn = i > 0 ? segType(p[i - 1].e) : null;
      const segOut = i < p.length - 1 ? segType(p[i].e) : null;
      ty.push((segIn || segOut || 'L') + (segOut || segIn || 'L'));
      const dims = asArr(k[i][1]).length;
      const dflt = Array.from({length: dims}, () => [0, 33.333]);
      let inE = dflt;
      let outE = dflt;
      if (segIn === 'B') inE = segEase(asArr(k[i - 1][1]), asArr(k[i][1]), k[i][0] - k[i - 1][0], core.resolveEase(p[i - 1].e)).in;
      if (segOut === 'B') outE = segEase(asArr(k[i][1]), asArr(k[i + 1][1]), k[i + 1][0] - k[i][0], core.resolveEase(p[i].e)).out;
      ez.push([inE, outE]);
    }
    return {k, ty, ez};
  }

  const scaleMap = (v) => (typeof v === 'number' ? [v, v, 100] : [v[0], v[1], 100]);

  function transformData(l) {
    const t = l.transform || {};
    const parent = l.parent ? byId[l.parent] : null;
    const off = parent && parent.type === 'null' ? 50 : 0;
    let anchor = t.anchor || core.defaultAnchor(l, spec);
    if (l.type === 'null') anchor = [anchor[0] + 50, anchor[1] + 50];
    const pos = core.positionProps(l, spec);
    return {
      anchor: anchor.map(r4),
      px: anim(pos.x, 0, {map: (v) => v + off}),
      py: anim(pos.y, 0, {map: (v) => v + off}),
      sc: anim(t.scale, 100, {map: scaleMap}),
      rot: anim(t.rotation, 0),
      op: anim(t.opacity, 100),
    };
  }

  function animatorExpression(an) {
    const e = core.resolveEase(an.ease);
    let mode = 0;
    let co = {ax: 0, bx: 0, cx: 0, ay: 0, by: 0, cy: 0};
    if (e === 'linear') mode = 1;
    else if (e === 'hold') mode = 2;
    else co = core.bezierCoefficients(e[0], e[1], e[2], e[3]);
    const ord = an.order === 'reverse' ? 1 : an.order === 'center' ? 2 : 0;
    return [
      `// motion-pro: animator ${an.phase} por ${an.by}`,
      `var S = ${an.start}, D = ${an.duration}, G = ${an.stagger || 0}, MODE = ${mode}, PH = ${an.phase === 'in' ? 1 : 0}, ORD = ${ord};`,
      `var AX = ${co.ax}, BX = ${co.bx}, CX = ${co.cx}, AY = ${co.ay}, BY = ${co.by}, CY = ${co.cy};`,
      'var n = textIndex - 1, N = textTotal;',
      'var i = ORD == 1 ? (N - 1 - n) : (ORD == 2 ? Math.abs(n - (N - 1) / 2) : n);',
      'var fr = time / thisComp.frameDuration;',
      'var p = (fr - (S + i * G)) / D;',
      'p = p < 0 ? 0 : (p > 1 ? 1 : p);',
      'function sx(t) { return ((AX * t + BX) * t + CX) * t; }',
      'function sy(t) { return ((AY * t + BY) * t + CY) * t; }',
      'function dx(t) { return (3 * AX * t + 2 * BX) * t + CX; }',
      'function solve(x) {',
      '  var t = x, k, e, d, lo = 0, hi = 1;',
      '  for (k = 0; k < 8; k++) { e = sx(t) - x; if (Math.abs(e) < 1e-7) return t; d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }',
      '  t = x;',
      '  for (k = 0; k < 60; k++) { e = sx(t); if (Math.abs(e - x) < 1e-7) return t; if (x > e) lo = t; else hi = t; t = (lo + hi) / 2; }',
      '  return t;',
      '}',
      'var ez = MODE == 1 ? p : (MODE == 2 ? (p < 1 ? 0 : 1) : (p <= 0 ? 0 : (p >= 1 ? 1 : sy(solve(p)))));',
      'var a = PH == 1 ? 1 - ez : ez;',
      'selectorValue * a;',
    ].join('\n');
  }

  function counterExpression(c) {
    const e = core.resolveEase(c.ease);
    let mode = 0;
    let co = {ax: 0, bx: 0, cx: 0, ay: 0, by: 0, cy: 0};
    if (e === 'linear') mode = 1;
    else if (e === 'hold') mode = 2;
    else co = core.bezierCoefficients(e[0], e[1], e[2], e[3]);
    const seps = {'pt-BR': ['.', ','], 'en-US': [',', '.']}[c.locale || 'pt-BR'] || ['.', ','];
    const q = (str) => JSON.stringify(String(str || '')).replace(/[\u007f-\uffff]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
    return [
      '// motion-pro: contador',
      `var S = ${c.start}, D = ${c.duration}, A = ${c.from}, B = ${c.to}, DEC = ${c.decimals || 0}, MODE = ${mode};`,
      `var PRE = ${q(c.prefix)}, SUF = ${q(c.suffix)}, TS = ${q(seps[0])}, DS = ${q(seps[1])};`,
      `var AX = ${co.ax}, BX = ${co.bx}, CX = ${co.cx}, AY = ${co.ay}, BY = ${co.by}, CY = ${co.cy};`,
      'function sx(t) { return ((AX * t + BX) * t + CX) * t; }',
      'function sy(t) { return ((AY * t + BY) * t + CY) * t; }',
      'function dx(t) { return (3 * AX * t + 2 * BX) * t + CX; }',
      'function solve(x) {',
      '  var t = x, k, e, d, lo = 0, hi = 1;',
      '  for (k = 0; k < 8; k++) { e = sx(t) - x; if (Math.abs(e) < 1e-7) return t; d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }',
      '  t = x;',
      '  for (k = 0; k < 60; k++) { e = sx(t); if (Math.abs(e - x) < 1e-7) return t; if (x > e) lo = t; else hi = t; t = (lo + hi) / 2; }',
      '  return t;',
      '}',
      'function fmt(v) {',
      '  var neg = v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -DEC);',
      '  var s = Math.abs(v).toFixed(DEC), parts = s.split("."), ip = parts[0], out = "", i, st;',
      '  for (i = ip.length; i > 0; i -= 3) { st = Math.max(0, i - 3); out = ip.substring(st, i) + (out ? TS + out : ""); }',
      '  return (neg ? "-" : "") + out + (DEC > 0 ? DS + parts[1] : "");',
      '}',
      'var p = (Math.round(time / thisComp.frameDuration) - S) / D; // whole frames: no ghosting with motion blur',
      'p = p < 0 ? 0 : (p > 1 ? 1 : p);',
      'var ez = MODE == 1 ? p : (MODE == 2 ? (p < 1 ? 0 : 1) : (p <= 0 ? 0 : (p >= 1 ? 1 : sy(solve(p)))));',
      'PRE + fmt(A + (B - A) * ez) + SUF;',
    ].join('\n');
  }

  function shapeData(l) {
    const items = [];
    const origin = l.origin || [0.5, 0.5];
    const toAE = (s) => ({v: s.vertices.map((p) => p.map(r4)), i: s.inTangents.map((p) => p.map(r4)), o: s.outTangents.map((p) => p.map(r4)), c: s.closed});
    if (l.type === 'rect' || l.type === 'ellipse') {
      if (l.trim) {
        const [w, h] = l.size;
        const shp = l.type === 'rect' ? core.rectPath(w, h, core.evalProp(l.roundness, 0, 0), origin) : core.ellipsePath(w, h, origin);
        items.push({t: 'path', shapes: [toAE(shp)]});
      } else {
        const sizeAnimated = core.isKeyframes(l.size);
        let pos;
        if (!sizeAnimated) pos = {s: [r4(l.size[0] * (0.5 - origin[0])), r4(l.size[1] * (0.5 - origin[1]))]};
        else if (origin[0] === 0.5 && origin[1] === 0.5) pos = {s: [0, 0]};
        else {
          const sizeMatch = l.type === 'rect' ? 'ADBE Vector Rect Size' : 'ADBE Vector Ellipse Size';
          pos = {x: `var s = thisProperty.propertyGroup(1)("${sizeMatch}"); [s[0] * ${r4(0.5 - origin[0])}, s[1] * ${r4(0.5 - origin[1])}]`};
        }
        const item = {t: l.type === 'rect' ? 'rect' : 'ell', size: anim(l.size, [100, 100]), pos};
        if (l.type === 'rect') item.round = anim(l.roundness, 0);
        items.push(item);
      }
    } else if (l.type === 'path') {
      items.push({t: 'path', shapes: core.parsePathD(l.d).map(toAE)});
    }
    const d = {items};
    if (l.trim) d.trim = {start: anim(l.trim.start, 0), end: anim(l.trim.end, 100), offset: anim(l.trim.offset, 0)};
    if (l.stroke) {
      d.stroke = {
        color: anim(l.stroke.color, '#ffffff', {kind: 'color'}),
        width: anim(l.stroke.width, 4),
        opacity: anim(l.stroke.opacity, 100),
        cap: CAP[l.stroke.cap || 'butt'],
        join: JOIN[l.stroke.join || 'miter'],
      };
    }
    if (l.fill !== undefined && l.fill !== null) d.fill = {color: anim(l.fill, '#ffffff', {kind: 'color'}), opacity: anim(l.fillOpacity, 100)};
    return d;
  }

  const fontById = Object.fromEntries((spec.fonts || []).map((f) => [f.id, f]));
  const files = [];
  const layers = [];

  if (spec.comp.background) {
    const c = core.parseColor(spec.comp.background);
    layers.push({
      id: '__bg',
      kind: 'solid',
      name: 'Fundo',
      color: c.slice(0, 3).map(r4),
      w: spec.comp.width,
      h: spec.comp.height,
      ip: 0,
      op: spec.comp.duration / fps,
      tr: {anchor: [spec.comp.width / 2, spec.comp.height / 2], px: {s: spec.comp.width / 2}, py: {s: spec.comp.height / 2}},
      locked: true,
    });
  }

  for (const l of spec.layers) {
    const base = {
      id: l.id,
      name: l.name || l.id,
      ip: (l.in ?? 0) / fps,
      op: (l.out ?? spec.comp.duration) / fps,
      parent: l.parent || null,
      blend: l.blend && l.blend !== 'normal' ? l.blend.toUpperCase() : null,
      mb: !!spec.comp.motionBlur && l.type !== 'audio' && l.type !== 'null',
    };
    if (l.matte) base.matte = {src: l.matte.layer, inv: l.matte.mode === 'alphaInverted'};
    if (l.effects && l.effects.blur !== undefined) {
      base.blur = anim(l.effects.blur, 0, {map: (v) => v * BLUR_FACTOR});
      notes.push(`Blur da camada ${l.id} convertido de forma aproximada (Gaussian Blur = ${BLUR_FACTOR}× o raio CSS). Ajuste no olho.`);
    }
    if (l.type !== 'audio') base.tr = transformData(l);

    if (l.type === 'text') {
      const f = fontById[l.font];
      const style = core.fontStyleName(f.weight, !!f.italic);
      const anims = (l.animators || []).map((an, i) => {
        const v = an.values || {};
        const d = {name: `motion-pro ${an.phase} ${i + 1}`, based: AE_TEXT_BASED_ON[an.by], expr: animatorExpression(an)};
        if (v.x || v.y) d.pos = [v.x || 0, v.y || 0, 0];
        if (v.opacity !== undefined) d.op = v.opacity;
        if (v.scale !== undefined) d.sc = [v.scale, v.scale, 100];
        if (v.rotation) d.rot = v.rotation;
        if (v.blur) d.blur = [v.blur, v.blur];
        return d;
      });
      const pivot = (l.animators || []).find((a) => a.values && (a.values.scale !== undefined || a.values.rotation !== undefined)) || (l.animators || [])[0];
      const c = core.parseColor(l.color || '#ffffff');
      layers.push({
        ...base,
        kind: 'text',
        text: (l.counter ? core.counterTextAt(l.counter, l.counter.start + l.counter.duration) : String(l.text)).replace(/\n/g, '\r'),
        counterExpr: l.counter ? counterExpression(l.counter) : null,
        family: f.family,
        style,
        ps: f.family.replace(/\s+/g, '') + '-' + style.replace(/\s+/g, ''),
        size: l.size,
        color: c.slice(0, 3).map(r4),
        just: l.align === 'center' ? 'C' : l.align === 'right' ? 'R' : 'L',
        tracking: l.tracking || 0,
        leading: r4(l.leading ?? l.size * 1.2),
        caps: !!l.caps,
        anims,
        grouping: pivot ? AE_ANCHOR_GROUPING[pivot.by] : 0,
      });
    } else if (l.type === 'rect' || l.type === 'ellipse' || l.type === 'path') {
      layers.push({...base, kind: 'shape', shape: shapeData(l)});
    } else if (l.type === 'solid') {
      const c = core.parseColor(l.color);
      const [w, h] = l.size || [spec.comp.width, spec.comp.height];
      layers.push({...base, kind: 'solid', color: c.slice(0, 3).map(r4), w: Math.round(w), h: Math.round(h)});
    } else if (l.type === 'null') {
      layers.push({...base, kind: 'null'});
    } else if (l.type === 'image' || l.type === 'video' || l.type === 'audio') {
      files.push(l.src);
      const d = {...base, kind: l.type === 'audio' ? 'audio' : 'footage', file: l.src.replace(/\\/g, '/')};
      if (l.type !== 'image') d.st = ((l.in ?? 0) - (l.startFrom || 0)) / fps;
      const vol = l.volume ?? 1;
      if ((l.type === 'audio' || (l.type === 'video' && !l.muted)) && vol < 0.999) d.db = r4(vol > 0 ? 20 * Math.log10(vol) : -96);
      if (l.type === 'video' && l.muted) d.mute = true;
      layers.push(d);
    } else if (l.type === 'custom') {
      let first = null;
      if (prerenderDir) {
        const dir = path.join(prerenderDir, l.id);
        if (fs.existsSync(dir)) {
          const pngs = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
          if (pngs.length) first = `prerender/${l.id}/${pngs[0]}`;
        }
      }
      if (!first) throw new Error(`Camada custom "${l.id}" sem pre-render. Rode render.mjs com --ae antes.`);
      notes.push(`A camada ${l.id} (código${l.three ? ' Three.js' : ''}) entra como sequência PNG com transparência, não como camadas editáveis.`);
      layers.push({...base, kind: 'footage', file: first, seq: true, st: (l.in ?? 0) / fps});
    }
  }

  return {
    data: {
      title: (spec.meta && spec.meta.title) || 'motion-pro',
      comp: {
        name: (spec.meta && spec.meta.title) || 'Main',
        w: spec.comp.width,
        h: spec.comp.height,
        fps,
        dur: spec.comp.duration / fps,
        bg: core.parseColor(spec.comp.background || '#000000').slice(0, 3).map(r4),
        mb: !!spec.comp.motionBlur,
        shutter: spec.comp.shutterAngle ?? 180,
      },
      markers: (spec.markers || []).map((m) => [m.t / fps, m.label]),
      layers,
      notes,
    },
    files: [...new Set(files)],
    notes,
  };
}

// ExtendScript runtime (ES3). Keep it free of ES5+ features: no Array.indexOf, JSON, forEach, let/const.
const RUNTIME = String.raw`
var MP = {report: [], missingFonts: [], L: {}, items: {}};

MP.ease = function (pair) { return new KeyframeEase(pair[0], pair[1]); };
MP.easeList = function (list) { var a = [], i; for (i = 0; i < list.length; i++) { a.push(MP.ease(list[i])); } return a; };
MP.interp = function (c) {
  if (c === "H") { return KeyframeInterpolationType.HOLD; }
  if (c === "L") { return KeyframeInterpolationType.LINEAR; }
  return KeyframeInterpolationType.BEZIER;
};

MP.apply = function (prop, a) {
  var i, times, vals, ty, ez;
  if (!a || !prop) { return; }
  if (a.x !== undefined) { prop.expression = a.x; return; }
  if (a.s !== undefined) { prop.setValue(a.s); return; }
  times = []; vals = [];
  for (i = 0; i < a.k.length; i++) { times.push(a.k[i][0]); vals.push(a.k[i][1]); }
  prop.setValuesAtTimes(times, vals);
  for (i = 0; i < a.k.length; i++) {
    ty = a.ty[i]; ez = a.ez[i];
    if (ty.charAt(0) === "B" || ty.charAt(1) === "B") {
      try {
        prop.setTemporalEaseAtKey(i + 1, MP.easeList(ez[0]), MP.easeList(ez[1]));
      } catch (e1) {
        try { prop.setTemporalEaseAtKey(i + 1, [MP.ease(ez[0][0])], [MP.ease(ez[1][0])]); }
        catch (e2) { MP.report.push("Easing não aplicado: " + prop.name + " (keyframe " + (i + 1) + ")"); }
      }
    }
    prop.setInterpolationTypeAtKey(i + 1, MP.interp(ty.charAt(0)), MP.interp(ty.charAt(1)));
  }
};

MP.transform = function (lyr, t) {
  var tr = lyr.property("ADBE Transform Group");
  if (!t) { return; }
  if (t.anchor) { tr.property("ADBE Anchor Point").setValue(t.anchor); }
  tr.property("ADBE Position").dimensionsSeparated = true;
  MP.apply(tr.property("ADBE Position_0"), t.px);
  MP.apply(tr.property("ADBE Position_1"), t.py);
  MP.apply(tr.property("ADBE Scale"), t.sc);
  MP.apply(tr.property("ADBE Rotate Z"), t.rot);
  MP.apply(tr.property("ADBE Opacity"), t.op);
};

MP.fontName = function (d) {
  var found, i, known;
  try {
    if (app.fonts && app.fonts.getFontsByFamilyNameAndStyleName) {
      found = app.fonts.getFontsByFamilyNameAndStyleName(d.family, d.style);
      if (found && found.length) { return found[0].postScriptName; }
      known = false;
      for (i = 0; i < MP.missingFonts.length; i++) { if (MP.missingFonts[i] === d.family + " " + d.style) { known = true; } }
      if (!known) { MP.missingFonts.push(d.family + " " + d.style); }
    }
  } catch (e) {}
  return d.ps;
};

MP.text = function (comp, d) {
  var lyr = comp.layers.addText(d.text);
  var sp = lyr.property("ADBE Text Properties").property("ADBE Text Document");
  var td = sp.value;
  try { td.resetCharStyle(); } catch (e1) {}
  try { td.resetParagraphStyle(); } catch (e2) {}
  td.text = d.text;
  sp.setValue(td);
  td = sp.value;
  td.font = MP.fontName(d);
  td.fontSize = d.size;
  td.applyFill = true;
  td.fillColor = d.color;
  td.applyStroke = false;
  if (d.just === "C") { td.justification = ParagraphJustification.CENTER_JUSTIFY; }
  else if (d.just === "R") { td.justification = ParagraphJustification.RIGHT_JUSTIFY; }
  else { td.justification = ParagraphJustification.LEFT_JUSTIFY; }
  td.tracking = d.tracking;
  try { td.autoLeading = false; td.leading = d.leading; } catch (e3) { MP.report.push("Entrelinha não aplicada em " + d.name); }
  try { td.allCaps = d.caps; } catch (e4) {}
  sp.setValue(td);
  return lyr;
};

MP.textAnimators = function (lyr, d) {
  var i, a, ai, added;
  var root = function () { return lyr.property("ADBE Text Properties").property("ADBE Text Animators"); };
  if (d.grouping) {
    try { lyr.property("ADBE Text Properties").property("ADBE Text More Options").property("ADBE Text Anchor Point Option").setValue(d.grouping); }
    catch (e0) { MP.report.push("Defina Anchor Point Grouping manualmente em " + d.name); }
  }
  for (i = 0; i < d.anims.length; i++) {
    a = d.anims[i];
    added = root().addProperty("ADBE Text Animator");
    ai = added.propertyIndex;
    root().property(ai).name = a.name;
    if (a.pos) {
      root().property(ai).property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D");
      root().property(ai).property("ADBE Text Animator Properties").property("ADBE Text Position 3D").setValue(a.pos);
    }
    if (a.op !== undefined) {
      root().property(ai).property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
      root().property(ai).property("ADBE Text Animator Properties").property("ADBE Text Opacity").setValue(a.op);
    }
    if (a.sc) {
      root().property(ai).property("ADBE Text Animator Properties").addProperty("ADBE Text Scale 3D");
      root().property(ai).property("ADBE Text Animator Properties").property("ADBE Text Scale 3D").setValue(a.sc);
    }
    if (a.rot !== undefined) {
      root().property(ai).property("ADBE Text Animator Properties").addProperty("ADBE Text Rotation");
      root().property(ai).property("ADBE Text Animator Properties").property("ADBE Text Rotation").setValue(a.rot);
    }
    if (a.blur) {
      root().property(ai).property("ADBE Text Animator Properties").addProperty("ADBE Text Blur");
      root().property(ai).property("ADBE Text Animator Properties").property("ADBE Text Blur").setValue(a.blur);
    }
    root().property(ai).property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    root().property(ai).property("ADBE Text Selectors").property(1).property("ADBE Text Range Type2").setValue(a.based);
    root().property(ai).property("ADBE Text Selectors").property(1).property("ADBE Text Expressible Amount").expression = a.expr;
  }
};

MP.shape = function (comp, d) {
  var lyr = comp.layers.addShape();
  var i, k, it, idx, sh, s;
  var C = function () { return lyr.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); };
  lyr.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  lyr.property("ADBE Root Vectors Group").property(1).name = "Forma";
  for (i = 0; i < d.items.length; i++) {
    it = d.items[i];
    if (it.t === "rect") {
      C().addProperty("ADBE Vector Shape - Rect"); idx = C().numProperties;
      MP.apply(C().property(idx).property("ADBE Vector Rect Size"), it.size);
      MP.apply(C().property(idx).property("ADBE Vector Rect Position"), it.pos);
      MP.apply(C().property(idx).property("ADBE Vector Rect Roundness"), it.round);
    } else if (it.t === "ell") {
      C().addProperty("ADBE Vector Shape - Ellipse"); idx = C().numProperties;
      MP.apply(C().property(idx).property("ADBE Vector Ellipse Size"), it.size);
      MP.apply(C().property(idx).property("ADBE Vector Ellipse Position"), it.pos);
    } else if (it.t === "path") {
      for (k = 0; k < it.shapes.length; k++) {
        s = it.shapes[k];
        C().addProperty("ADBE Vector Shape - Group"); idx = C().numProperties;
        sh = new Shape();
        sh.vertices = s.v; sh.inTangents = s.i; sh.outTangents = s.o; sh.closed = s.c;
        C().property(idx).property("ADBE Vector Shape").setValue(sh);
      }
    }
  }
  if (d.trim) {
    C().addProperty("ADBE Vector Filter - Trim"); idx = C().numProperties;
    MP.apply(C().property(idx).property("ADBE Vector Trim Start"), d.trim.start);
    MP.apply(C().property(idx).property("ADBE Vector Trim End"), d.trim.end);
    MP.apply(C().property(idx).property("ADBE Vector Trim Offset"), d.trim.offset);
  }
  if (d.stroke) {
    C().addProperty("ADBE Vector Graphic - Stroke"); idx = C().numProperties;
    MP.apply(C().property(idx).property("ADBE Vector Stroke Color"), d.stroke.color);
    MP.apply(C().property(idx).property("ADBE Vector Stroke Width"), d.stroke.width);
    MP.apply(C().property(idx).property("ADBE Vector Stroke Opacity"), d.stroke.opacity);
    C().property(idx).property("ADBE Vector Stroke Line Cap").setValue(d.stroke.cap);
    C().property(idx).property("ADBE Vector Stroke Line Join").setValue(d.stroke.join);
  }
  if (d.fill) {
    C().addProperty("ADBE Vector Graphic - Fill"); idx = C().numProperties;
    MP.apply(C().property(idx).property("ADBE Vector Fill Color"), d.fill.color);
    MP.apply(C().property(idx).property("ADBE Vector Fill Opacity"), d.fill.opacity);
  }
  return lyr;
};

MP.importFile = function (rel, seq, fps) {
  var key = rel + (seq ? "#seq" : ""), f, io, item;
  if (MP.items[key]) { return MP.items[key]; }
  f = new File(MP.base + "/" + rel);
  if (!f.exists) { MP.report.push("Arquivo não encontrado: " + rel + " (mantenha a pasta assets ao lado do .jsx)"); return null; }
  io = new ImportOptions(f);
  if (seq) { io.sequence = true; io.forceAlphabetical = true; }
  item = app.project.importFile(io);
  if (seq && fps) { try { item.mainSource.conformFrameRate = fps; } catch (e) {} }
  item.parentFolder = MP.folder;
  MP.items[key] = item;
  return item;
};

MP.matte = function (target, src, inverted) {
  var type = inverted ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
  try {
    target.setTrackMatte(src, type);
    src.enabled = false;
    return;
  } catch (e) {}
  try {
    src.moveBefore(target);
    target.trackMatteType = type;
  } catch (e2) {
    MP.report.push("Matte não aplicado em " + target.name + ". Defina manualmente com a camada " + src.name);
  }
};

MP.build = function (D) {
  var c = D.comp, comp, i, d, lyr, item, fx, n;
  if (!app.project) { app.newProject(); }
  MP.base = File($.fileName).parent.fsName;
  MP.folder = app.project.items.addFolder(D.title);
  comp = app.project.items.addComp(c.name, c.w, c.h, 1, c.dur, c.fps);
  comp.parentFolder = MP.folder;
  comp.bgColor = c.bg;
  if (c.mb) { comp.motionBlur = true; comp.shutterAngle = c.shutter; comp.shutterPhase = -c.shutter / 2; }

  for (i = 0; i < D.layers.length; i++) {
    d = D.layers[i];
    lyr = null;
    if (d.kind === "text") { lyr = MP.text(comp, d); }
    else if (d.kind === "shape") { lyr = MP.shape(comp, d.shape); }
    else if (d.kind === "solid") { lyr = comp.layers.addSolid(d.color, d.name, d.w, d.h, 1); }
    else if (d.kind === "null") { lyr = comp.layers.addNull(); }
    else if (d.kind === "footage" || d.kind === "audio") {
      item = MP.importFile(d.file, d.seq, c.fps);
      if (item) { lyr = comp.layers.add(item); }
    }
    if (!lyr) { continue; }
    lyr.name = d.name;
    if (d.st !== undefined) { lyr.startTime = d.st; }
    lyr.inPoint = d.ip;
    lyr.outPoint = d.op;
    if (d.kind !== "audio") { MP.transform(lyr, d.tr); }
    if (d.kind === "text" && d.counterExpr) { lyr.property("ADBE Text Properties").property("ADBE Text Document").expression = d.counterExpr; }
    if (d.kind === "text" && d.anims.length) { MP.textAnimators(lyr, d); }
    if (d.blend) { try { lyr.blendingMode = BlendingMode[d.blend]; } catch (eb) {} }
    if (d.mb) { try { lyr.motionBlur = true; } catch (em) {} }
    if (d.blur) {
      lyr.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
      n = lyr.property("ADBE Effect Parade").numProperties;
      MP.apply(lyr.property("ADBE Effect Parade").property(n).property("ADBE Gaussian Blur 2-0001"), d.blur);
    }
    if (d.db !== undefined) { try { lyr.property("ADBE Audio Group").property("ADBE Audio Levels").setValue([d.db, d.db]); } catch (ea) {} }
    if (d.mute) { try { lyr.audioEnabled = false; } catch (eu) {} }
    if (d.locked) { lyr.locked = true; }
    MP.L[d.id] = lyr;
  }

  for (i = 0; i < D.layers.length; i++) {
    d = D.layers[i];
    if (d.parent && MP.L[d.id] && MP.L[d.parent]) {
      try { MP.L[d.id].setParentWithJump(MP.L[d.parent]); }
      catch (ep) { MP.L[d.id].parent = MP.L[d.parent]; }
    }
  }
  for (i = 0; i < D.layers.length; i++) {
    d = D.layers[i];
    if (d.matte && MP.L[d.id] && MP.L[d.matte.src]) { MP.matte(MP.L[d.id], MP.L[d.matte.src], d.matte.inv); }
  }
  for (i = 0; i < D.markers.length; i++) {
    comp.markerProperty.setValueAtTime(D.markers[i][0], new MarkerValue(D.markers[i][1]));
  }
  comp.openInViewer();
  return comp;
};

(function () {
  var msg = [], i;
  app.beginUndoGroup("motion-pro: " + DATA.title);
  try {
    MP.build(DATA);
    msg.push("Comp \"" + DATA.comp.name + "\" criada.");
  } catch (e) {
    msg.push("Erro ao montar a comp: " + e.toString() + (e.line ? " (linha " + e.line + ")" : ""));
  }
  app.endUndoGroup();
  if (MP.missingFonts.length) { msg.push("", "Fontes que faltam (instale e rode de novo):"); for (i = 0; i < MP.missingFonts.length; i++) { msg.push("- " + MP.missingFonts[i]); } }
  for (i = 0; i < DATA.notes.length; i++) { MP.report.push(DATA.notes[i]); }
  if (MP.report.length) { msg.push("", "Observações:"); for (i = 0; i < MP.report.length; i++) { msg.push("- " + MP.report[i]); } }
  alert(msg.join("\n"), "motion-pro");
})();
`;

function asciiJson(obj) {
  return JSON.stringify(obj).replace(/[\u007f-￿]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function generateJsx(spec, opts = {}) {
  const {data, files, notes} = buildAeData(spec, opts);
  const header = [
    '// motion-pro: monta a comp no After Effects.',
    '// Rode em: Arquivo > Scripts > Executar arquivo de script. Mantenha a pasta assets ao lado deste arquivo.',
    '// Gerado a partir de motion.json. Requer After Effects 2023 (23.0) ou mais novo.',
    '',
  ].join('\n');
  // ExtendScript reads the file safest as ASCII: escape every non-ASCII character
  const jsx = (header + 'var DATA = ' + asciiJson(data) + ';\n' + RUNTIME).replace(/[\u007f-\uffff]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
  return {jsx, files, notes, data};
}

function main() {
  const specPath = arg('--spec');
  const outDir = arg('--out');
  const prerender = arg('--prerender');
  if (!specPath || !outDir) {
    console.error('Uso: node spec_to_jsx.mjs --spec motion.json --out ./saida/ae [--prerender ./saida/ae/prerender]');
    process.exit(2);
  }
  const specFile = path.resolve(specPath);
  const specDir = path.dirname(specFile);
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const {errors, warnings} = validateSpec(spec, {specDir});
  if (errors.length) {
    for (const e of errors) console.log('ERRO: ' + e);
    process.exit(1);
  }
  for (const w of warnings) console.log('AVISO: ' + w);
  const out = path.resolve(outDir);
  fs.mkdirSync(out, {recursive: true});
  const prerenderDir = prerender ? path.resolve(prerender) : path.join(out, 'prerender');
  const {jsx, files, notes} = generateJsx(spec, {prerenderDir});
  const slug = (spec.meta && spec.meta.slug) || 'motion';
  fs.writeFileSync(path.join(out, `${slug}.jsx`), jsx);
  for (const rel of files) {
    const to = path.join(out, rel);
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.copyFileSync(path.join(specDir, rel), to);
  }
  if (prerender && path.resolve(prerender) !== path.join(out, 'prerender')) {
    fs.cpSync(path.resolve(prerender), path.join(out, 'prerender'), {recursive: true});
  }
  const fontLines = (spec.fonts || []).map((f) => `- ${f.family} ${core.fontStyleName(f.weight, !!f.italic)}${f.file ? ` (arquivo ${f.file})` : ` — https://fonts.google.com/specimen/${f.family.replace(/\s+/g, '+')}`}`);
  const readme = [
    `${(spec.meta && spec.meta.title) || slug} — versão para After Effects`,
    '',
    '1. Instale as fontes antes de rodar o script:',
    ...(fontLines.length ? fontLines : ['- (sem fontes)']),
    '',
    `2. No After Effects, abra: Arquivo > Scripts > Executar arquivo de script e escolha ${slug}.jsx.`,
    '   Mantenha esta pasta inteira junta: o script procura assets/ e prerender/ ao lado dele.',
    '',
    `3. O script cria a pasta "${(spec.meta && spec.meta.title) || 'motion-pro'}" no painel Projeto, com a comp pronta e editável.`,
    '   Os keyframes usam o mesmo easing da prévia (velocidade e influência calculadas).',
    '   As animações de texto usam Text Animators com Expression Selector: ajuste os valores no animator.',
    '   Contadores usam uma expressão no Source Text.',
    '',
    'Requisitos: After Effects 2023 (23.0) ou mais novo. No AE 2024 (24.0) ou mais novo, o script avisa quais fontes faltam.',
    ...(notes.length ? ['', 'Observações:', ...notes.map((n) => '- ' + n)] : []),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(out, 'LEIA-ME.txt'), readme);
  console.log(`JSX gerado: ${path.join(out, `${slug}.jsx`)}`);
  if (notes.length) console.log('Observações:\n- ' + notes.join('\n- '));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
