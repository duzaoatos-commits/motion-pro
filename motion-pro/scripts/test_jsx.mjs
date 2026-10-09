#!/usr/bin/env node
// Run a generated .jsx against a mock of the After Effects object model (no After Effects needed).
// Catches JavaScript errors, unknown match names and bad keyframe indexes, and checks that the
// After Effects easing (speed/influence) reproduces the spec curves.
//
// Usage: node test_jsx.mjs <file.jsx> [--spec motion.json]

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const core = await import(pathToFileURL(path.join(here, '..', 'assets', 'remotion-template', 'src', 'engine', 'core.mjs')).href);

const MATCH = new Set([
  'ADBE Transform Group', 'ADBE Anchor Point', 'ADBE Position', 'ADBE Position_0', 'ADBE Position_1', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity',
  'ADBE Text Properties', 'ADBE Text Document', 'ADBE Text Animators', 'ADBE Text Animator', 'ADBE Text Animator Properties',
  'ADBE Text Position 3D', 'ADBE Text Scale 3D', 'ADBE Text Rotation', 'ADBE Text Opacity', 'ADBE Text Blur',
  'ADBE Text Selectors', 'ADBE Text Expressible Selector', 'ADBE Text Range Type2', 'ADBE Text Expressible Amount',
  'ADBE Text More Options', 'ADBE Text Anchor Point Option',
  'ADBE Root Vectors Group', 'ADBE Vector Group', 'ADBE Vectors Group',
  'ADBE Vector Shape - Rect', 'ADBE Vector Rect Size', 'ADBE Vector Rect Position', 'ADBE Vector Rect Roundness',
  'ADBE Vector Shape - Ellipse', 'ADBE Vector Ellipse Size', 'ADBE Vector Ellipse Position',
  'ADBE Vector Shape - Group', 'ADBE Vector Shape',
  'ADBE Vector Filter - Trim', 'ADBE Vector Trim Start', 'ADBE Vector Trim End', 'ADBE Vector Trim Offset',
  'ADBE Vector Graphic - Stroke', 'ADBE Vector Stroke Color', 'ADBE Vector Stroke Width', 'ADBE Vector Stroke Opacity', 'ADBE Vector Stroke Line Cap', 'ADBE Vector Stroke Line Join',
  'ADBE Vector Graphic - Fill', 'ADBE Vector Fill Color', 'ADBE Vector Fill Opacity',
  'ADBE Effect Parade', 'ADBE Gaussian Blur 2', 'ADBE Gaussian Blur 2-0001',
  'ADBE Audio Group', 'ADBE Audio Levels',
]);
const DIMS = {
  'ADBE Anchor Point': 2, 'ADBE Position_0': 1, 'ADBE Position_1': 1, 'ADBE Scale': 3, 'ADBE Rotate Z': 1, 'ADBE Opacity': 1,
  'ADBE Vector Rect Size': 2, 'ADBE Vector Rect Position': 2, 'ADBE Vector Rect Roundness': 1, 'ADBE Vector Ellipse Size': 2, 'ADBE Vector Ellipse Position': 2,
  'ADBE Vector Trim Start': 1, 'ADBE Vector Trim End': 1, 'ADBE Vector Trim Offset': 1,
  'ADBE Vector Stroke Color': 4, 'ADBE Vector Stroke Width': 1, 'ADBE Vector Stroke Opacity': 1, 'ADBE Vector Fill Color': 4, 'ADBE Vector Fill Opacity': 1,
  'ADBE Gaussian Blur 2-0001': 1,
};
const problems = [];

class Prop {
  constructor(matchName, parent = null) {
    this.matchName = matchName;
    this.name = matchName;
    this.parentProp = parent;
    this.children = [];
    this.keys = [];
    this.value = undefined;
    this.expression = '';
    this.dimensionsSeparated = false;
  }
  get numProperties() {
    return this.children.length;
  }
  get propertyIndex() {
    return this.parentProp ? this.parentProp.children.indexOf(this) + 1 : 1;
  }
  get numKeys() {
    return this.keys.length;
  }
  property(id) {
    if (typeof id === 'number') {
      const c = this.children[id - 1];
      if (!c) throw new Error(`property(${id}) inexistente em ${this.matchName}`);
      return c;
    }
    if (!MATCH.has(id)) problems.push(`matchName desconhecido: "${id}" (em ${this.matchName})`);
    let c = this.children.find((x) => x.matchName === id);
    if (!c) {
      c = new Prop(id, this);
      this.children.push(c);
    }
    return c;
  }
  addProperty(id) {
    if (!MATCH.has(id)) problems.push(`addProperty com matchName desconhecido: "${id}"`);
    const c = new Prop(id, this);
    this.children.push(c);
    return c;
  }
  checkDims(v) {
    const want = DIMS[this.matchName];
    if (!want) return;
    const got = Array.isArray(v) ? v.length : 1;
    if (got !== want && !(this.matchName === 'ADBE Anchor Point' && got === 3)) problems.push(`${this.matchName}: valor com ${got} dimensao(oes), esperado ${want}`);
  }
  setValue(v) {
    if (this.keys.length) problems.push(`${this.matchName}: setValue com keyframes existentes`);
    this.checkDims(v);
    this.value = v;
  }
  setValuesAtTimes(times, values) {
    if (times.length !== values.length) problems.push(`${this.matchName}: times e values com tamanhos diferentes`);
    times.forEach((t, i) => {
      this.checkDims(values[i]);
      this.keys.push({t, v: values[i], inT: 'B', outT: 'B', inE: null, outE: null});
    });
    this.keys.sort((a, b) => a.t - b.t);
  }
  setTemporalEaseAtKey(i, inE, outE) {
    const k = this.keys[i - 1];
    if (!k) throw new Error(`${this.matchName}: keyframe ${i} inexistente`);
    const dims = Array.isArray(k.v) ? k.v.length : 1;
    if (inE.length !== dims || outE.length !== dims) throw new Error(`${this.matchName}: ease com ${inE.length}/${outE.length} itens, esperado ${dims}`);
    for (const e of [...inE, ...outE]) {
      if (!(e.influence >= 0.1 && e.influence <= 100)) problems.push(`${this.matchName}: influencia fora de 0.1..100 (${e.influence})`);
      if (!isFinite(e.speed)) problems.push(`${this.matchName}: velocidade invalida`);
    }
    k.inE = inE;
    k.outE = outE;
  }
  setInterpolationTypeAtKey(i, inT, outT) {
    const k = this.keys[i - 1];
    if (!k) throw new Error(`${this.matchName}: keyframe ${i} inexistente`);
    k.inT = inT;
    k.outT = outT;
  }
  /** Value at time t, using After Effects temporal bezier semantics. */
  valueAt(t) {
    if (!this.keys.length) return this.value;
    const ks = this.keys;
    if (t <= ks[0].t) return ks[0].v;
    if (t >= ks[ks.length - 1].t) return ks[ks.length - 1].v;
    let i = 0;
    while (!(t >= ks[i].t && t < ks[i + 1].t)) i++;
    const a = ks[i];
    const b = ks[i + 1];
    const dt = b.t - a.t;
    if (a.outT === 'H') return a.v;
    const va = Array.isArray(a.v) ? a.v : [a.v];
    const vb = Array.isArray(b.v) ? b.v : [b.v];
    const res = va.map((v0, d) => {
      const v1 = vb[d];
      if (a.outT === 'L' && b.inT === 'L') return v0 + ((v1 - v0) * (t - a.t)) / dt;
      const oe = a.outE ? a.outE[d] : {speed: 0, influence: 33.333};
      const ie = b.inE ? b.inE[d] : {speed: 0, influence: 33.333};
      const lin = (v1 - v0) / dt;
      const p1t = a.outT === 'L' ? dt / 3 : (oe.influence / 100) * dt;
      const p1v = a.outT === 'L' ? v0 + (lin * dt) / 3 : v0 + oe.speed * (oe.influence / 100) * dt;
      const p2t = b.inT === 'L' ? (2 * dt) / 3 : dt - (ie.influence / 100) * dt;
      const p2v = b.inT === 'L' ? v1 - (lin * dt) / 3 : v1 - ie.speed * (ie.influence / 100) * dt;
      const x = (t - a.t) / dt;
      if (Math.abs(v1 - v0) < 1e-9) {
        // flat segment: evaluate the value bezier directly through the time parameter
        const s = solveS(p1t / dt, p2t / dt, x);
        return (1 - s) ** 3 * v0 + 3 * (1 - s) ** 2 * s * p1v + 3 * (1 - s) * s ** 2 * p2v + s ** 3 * v1;
      }
      const yN = core.bezier(p1t / dt, (p1v - v0) / (v1 - v0), p2t / dt, (p2v - v0) / (v1 - v0))(x);
      return v0 + (v1 - v0) * yN;
    });
    return Array.isArray(a.v) ? res : res[0];
  }
}

function solveS(x1, x2, x) {
  const {ax, bx, cx} = core.bezierCoefficients(x1, 0, x2, 1);
  let lo = 0;
  let hi = 1;
  let s = x;
  for (let k = 0; k < 80; k++) {
    const v = ((ax * s + bx) * s + cx) * s;
    if (Math.abs(v - x) < 1e-9) return s;
    if (x > v) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return s;
}

class Layer extends Prop {
  constructor(kind, name) {
    super('layer');
    this.kind = kind;
    this.name = name;
    this.inPoint = 0;
    this.outPoint = 10;
    this.startTime = 0;
    this.enabled = true;
    this.motionBlur = false;
    this.parent = null;
    this.matte = null;
    this.property('ADBE Transform Group');
    if (kind === 'text') this.property('ADBE Text Properties').property('ADBE Text Document').value = new TextDocument(name);
  }
  setParentWithJump(p) {
    this.parent = p;
  }
  setTrackMatte(layer, type) {
    this.matte = {layer, type};
  }
  moveBefore() {}
}

class TextDocument {
  constructor(text) {
    this.text = text;
  }
  resetCharStyle() {}
  resetParagraphStyle() {}
}

const jsxFile = process.argv[2];
const specArgIdx = process.argv.indexOf('--spec');
const specFile = specArgIdx > 0 ? process.argv[specArgIdx + 1] : null;
if (!jsxFile) {
  console.error('Uso: node test_jsx.mjs arquivo.jsx [--spec motion.json]');
  process.exit(2);
}
const code = fs.readFileSync(jsxFile, 'utf8');
if (/[^\x00-\x7f]/.test(code)) problems.push('O .jsx tem caracteres fora do ASCII (use \\u escapes)');

const comps = [];
const alerts = [];
const ctx = {
  $: {fileName: path.resolve(jsxFile)},
  alert: (m) => alerts.push(String(m)),
  KeyframeEase: function (speed, influence) {
    this.speed = speed;
    this.influence = influence;
  },
  KeyframeInterpolationType: {BEZIER: 'B', LINEAR: 'L', HOLD: 'H'},
  ParagraphJustification: {LEFT_JUSTIFY: 'L', CENTER_JUSTIFY: 'C', RIGHT_JUSTIFY: 'R'},
  TrackMatteType: {ALPHA: 'alpha', ALPHA_INVERTED: 'alphaInverted'},
  BlendingMode: {ADD: 'add', SCREEN: 'screen', MULTIPLY: 'multiply', OVERLAY: 'overlay', NORMAL: 'normal'},
  Shape: function () {},
  MarkerValue: function (c) {
    this.comment = c;
  },
  ImportOptions: function (f) {
    this.file = f;
  },
  // ExtendScript allows File(path) with or without "new"
  File: function (p) {
    return {fsName: p, exists: fs.existsSync(p), parent: {fsName: path.dirname(p)}};
  },
  app: {
    project: {
      items: {
        addFolder: (n) => ({name: n}),
        addComp: (name, w, h, par, dur, fps) => {
          const layers = [];
          const add = (kind, name) => {
            const l = new Layer(kind, name);
            layers.unshift(l);
            return l;
          };
          const comp = {
            name, width: w, height: h, duration: dur, frameRate: fps, layers: {
              addText: (t) => add('text', t),
              addShape: () => add('shape', 'Shape'),
              addSolid: (c, n) => add('solid', n),
              addNull: () => add('null', 'Null'),
              add: (item) => add('footage', item.name),
            },
            list: layers,
            markerProperty: {markers: [], setValueAtTime(t, m) { this.markers.push([t, m.comment]); }},
            openInViewer() {},
          };
          comps.push(comp);
          return comp;
        },
      },
      importFile: (io) => ({name: path.basename(io.file.fsName), mainSource: {}, parentFolder: null}),
    },
    fonts: {getFontsByFamilyNameAndStyleName: () => []},
    beginUndoGroup() {},
    endUndoGroup() {},
    newProject() {},
  },
};
vm.createContext(ctx);
try {
  vm.runInContext(code, ctx, {filename: path.basename(jsxFile)});
} catch (e) {
  problems.push('Erro de execucao: ' + e.message);
}

const comp = comps[0];
if (!comp) problems.push('Nenhuma comp criada');
for (const a of alerts) if (/Erro/.test(a)) problems.push('Alerta de erro do script: ' + a.split('\n')[0]);

// compare easing against the spec
if (comp && specFile) {
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const fps = spec.comp.fps;
  let checked = 0;
  let worst = 0;
  for (const l of spec.layers) {
    const lyr = comp.list.find((x) => x.name === (l.name || l.id));
    if (!lyr || l.type === 'audio') continue;
    const tr = lyr.property('ADBE Transform Group');
    const pos = core.positionProps(l, spec);
    const off = l.parent && spec.layers.find((p) => p.id === l.parent && p.type === 'null') ? 50 : 0;
    const pairs = [
      [pos.x, tr.property('ADBE Position_0'), (v) => v - off, 'position.x'],
      [pos.y, tr.property('ADBE Position_1'), (v) => v - off, 'position.y'],
      [l.transform && l.transform.rotation, tr.property('ADBE Rotate Z'), (v) => v, 'rotation'],
      [l.transform && l.transform.opacity, tr.property('ADBE Opacity'), (v) => v, 'opacity'],
    ];
    for (const [p, prop, back, label] of pairs) {
      if (!core.isKeyframes(p)) continue;
      for (let f = p[0].t; f <= p[p.length - 1].t; f += 0.5) {
        const want = core.evalProp(p, f, 0);
        const got = back(prop.valueAt(f / fps));
        const vals = p.map((k) => k.v);
        const range = Math.max(1, Math.max(...vals) - Math.min(...vals));
        const err = Math.abs(want - got) / range;
        worst = Math.max(worst, err);
        checked++;
        if (err > 0.002) {
          problems.push(`${l.id} ${label}: diferenca de easing no frame ${f} (spec ${want.toFixed(3)}, AE ${got.toFixed(3)})`);
          break;
        }
      }
    }
  }
  console.log(`Easing conferido em ${checked} amostras; maior diferenca ${(worst * 100).toFixed(3)}% do curso.`);

  // text animator and counter expressions vs. the renderer math
  const m = code.match(/var DATA = (.*);\n/);
  if (m) {
    const DATA = JSON.parse(m[1]);
    let n = 0;
    let worstExpr = 0;
    for (const L of DATA.layers.filter((x) => x.kind === 'text')) {
      const sl = spec.layers.find((x) => x.id === L.id);
      if (!sl) continue;
      const shown = sl.counter ? core.counterTextAt(sl.counter, sl.counter.start + sl.counter.duration) : sl.text;
      (L.anims || []).forEach((a, ai) => {
        const an = sl.animators[ai];
        const total = core.splitUnits(shown, an.by).total;
        const end = an.start + an.duration + (an.stagger || 0) * total + 2;
        for (let f = an.start - 2; f <= end; f += 0.5) {
          for (let idx = 1; idx <= total; idx++) {
            const ctxE = {textIndex: idx, textTotal: total, time: f / fps, thisComp: {frameDuration: 1 / fps}, selectorValue: 100, Math};
            let got;
            try {
              got = vm.runInNewContext(a.expr, ctxE) / 100;
            } catch (e) {
              problems.push(`${L.id}: expressao do animator ${ai + 1} com erro: ${e.message}`);
              return;
            }
            worstExpr = Math.max(worstExpr, Math.abs(got - core.animatorAmount(an, idx - 1, total, f)));
            n++;
          }
        }
      });
      if (L.counterExpr) {
        const c = sl.counter;
        for (let f = c.start - 2; f <= c.start + c.duration + 2; f += 1) {
          const ctxC = {time: f / fps, thisComp: {frameDuration: 1 / fps}, Math};
          let got;
          try {
            got = vm.runInNewContext(L.counterExpr, ctxC);
          } catch (e) {
            problems.push(`${L.id}: expressao do contador com erro: ${e.message}`);
            break;
          }
          const want = core.counterTextAt(c, f);
          if (got !== want) {
            problems.push(`${L.id}: contador difere no frame ${f} (spec "${want}", AE "${got}")`);
            break;
          }
          n++;
        }
      }
    }
    if (worstExpr > 1e-6) problems.push(`Expressoes de texto diferem da previa (maior diferenca ${worstExpr})`);
    console.log(`Expressoes de texto e contadores conferidas em ${n} amostras.`);
  }
}

if (comp) {
  console.log(`Comp "${comp.name}" ${comp.width}x${comp.height} @ ${comp.frameRate} fps, ${comp.duration} s, ${comp.list.length} camadas:`);
  for (const l of [...comp.list].reverse()) {
    const tp = l.property('ADBE Text Properties');
    const anims = l.kind === 'text' ? tp.property('ADBE Text Animators').numProperties : 0;
    console.log(`  - ${l.name} [${l.kind}] ${l.inPoint}-${l.outPoint}s${l.parent ? ' parent=' + l.parent.name : ''}${l.matte ? ' matte=' + l.matte.layer.name : ''}${anims ? ' animators=' + anims : ''}`);
  }
}
for (const a of alerts) console.log('ALERTA DO SCRIPT:\n' + a);
if (problems.length) {
  console.log('\nPROBLEMAS:');
  for (const p of problems) console.log('- ' + p);
  process.exit(1);
}
console.log('\nOK: o JSX rodou no simulador sem erros.');
