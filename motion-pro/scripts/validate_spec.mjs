#!/usr/bin/env node
// Validate a motion-pro spec (motion.json). Prints errors and professional-standard warnings.
// Usage: node validate_spec.mjs motion.json [--fix]
//   --fix  fills missing width/height of image and video layers with ffprobe and saves the spec.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const core = await import(pathToFileURL(path.join(here, '..', 'assets', 'remotion-template', 'src', 'engine', 'core.mjs')).href);

const TYPES = ['text', 'rect', 'ellipse', 'path', 'solid', 'image', 'video', 'audio', 'null', 'custom'];
const SHAPES = ['rect', 'ellipse', 'path'];
const BLENDS = ['normal', 'add', 'screen', 'multiply', 'overlay'];

export function probeSize(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
  const [w, h] = out.split(',').map(Number);
  if (!w || !h) throw new Error('ffprobe nao leu o tamanho de ' + file);
  return [w, h];
}

export function validateSpec(spec, {specDir = '.', fix = false} = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!spec || typeof spec !== 'object') return {errors: ['Spec vazia ou invalida'], warnings};
  if (spec.version !== 1) err('version precisa ser 1');
  const c = spec.comp || {};
  for (const k of ['width', 'height', 'fps', 'duration']) {
    if (typeof c[k] !== 'number' || !(c[k] > 0)) err(`comp.${k} precisa ser um numero maior que 0`);
  }
  if (c.width % 2 || c.height % 2) err('comp.width e comp.height precisam ser pares (H.264)');
  const dur = c.duration;
  const fps = c.fps;

  const fonts = spec.fonts || [];
  const fontIds = new Set();
  for (const f of fonts) {
    if (!f.id || !f.family || !f.weight) err('Cada fonte precisa de id, family e weight');
    if (!f.pkg && !f.file) err(`Fonte ${f.id}: informe pkg (@fontsource) ou file (arquivo em assets/)`);
    fontIds.add(f.id);
  }

  const layers = spec.layers;
  if (!Array.isArray(layers)) {
    err('layers precisa ser uma lista');
    return {errors, warnings};
  }
  const byId = {};
  for (const l of layers) {
    if (!l.id || !/^[a-zA-Z0-9-]+$/.test(l.id)) err(`Id de camada invalido: ${JSON.stringify(l.id)} (use letras, numeros e hifen)`);
    if (byId[l.id]) err(`Id repetido: ${l.id}`);
    byId[l.id] = l;
    if (!TYPES.includes(l.type)) err(`Camada ${l.id}: type "${l.type}" invalido`);
  }

  const checkKeys = (label, p, kind = 'number') => {
    if (!core.isKeyframes(p)) return;
    let prev = -Infinity;
    for (const k of p) {
      if (typeof k.t !== 'number') err(`${label}: keyframe sem t`);
      if (k.t < prev) err(`${label}: keyframes fora de ordem (t=${k.t})`);
      if (k.t === prev) err(`${label}: dois keyframes no mesmo frame (t=${k.t})`);
      if (k.t < 0 || k.t > dur) warn(`${label}: keyframe em t=${k.t} fora da duracao da comp`);
      prev = k.t;
      try {
        core.resolveEase(k.e);
      } catch (e) {
        err(`${label}: ${e.message}`);
      }
      if (kind === 'color') {
        try {
          core.parseColor(k.v);
        } catch (e) {
          err(`${label}: ${e.message}`);
        }
      }
    }
    const motion = /position|scale|rotation/.test(label);
    p.slice(0, -1).forEach((k) => {
      if (k.e === undefined) warn(`${label}: keyframe t=${k.t} sem easing (usa ${core.DEFAULT_EASE}). Escolha o easing de proposito.`);
      if (motion && k.e === 'linear') warn(`${label}: easing linear em movimento (t=${k.t}). Use um preset do padrao.`);
    });
  };

  for (const l of layers) {
    const L = `Camada ${l.id}`;
    const inF = l.in ?? 0;
    const outF = l.out ?? dur;
    if (!(outF > inF)) err(`${L}: out precisa ser maior que in`);
    if (l.parent) {
      if (!byId[l.parent]) err(`${L}: parent "${l.parent}" nao existe`);
      let p = l.parent;
      let hops = 0;
      while (p && byId[p] && hops < 40) {
        if (p === l.id) {
          err(`${L}: ciclo de parent`);
          break;
        }
        p = byId[p].parent;
        hops++;
      }
    }
    if (l.blend && !BLENDS.includes(l.blend)) err(`${L}: blend "${l.blend}" invalido (${BLENDS.join(', ')})`);
    const t = l.transform || {};
    try {
      const pos = core.positionProps(l, spec);
      checkKeys(`${L} position.x`, pos.x);
      checkKeys(`${L} position.y`, pos.y);
    } catch (e) {
      err(e.message);
    }
    if (t.anchor && (!Array.isArray(t.anchor) || t.anchor.length !== 2)) err(`${L}: anchor precisa ser [x, y] fixo`);
    checkKeys(`${L} scale`, t.scale);
    checkKeys(`${L} rotation`, t.rotation);
    checkKeys(`${L} opacity`, t.opacity);
    if (l.effects && l.effects.blur !== undefined) checkKeys(`${L} effects.blur`, l.effects.blur);

    if (l.matte) {
      const src = byId[l.matte.layer];
      if (!src) err(`${L}: matte.layer "${l.matte.layer}" nao existe`);
      else {
        if (!SHAPES.includes(src.type)) err(`${L}: a matte precisa ser uma camada rect, ellipse ou path`);
        const iT = layers.indexOf(l);
        const iS = layers.indexOf(src);
        if (iS !== iT + 1) warn(`${L}: coloque a camada de matte "${src.id}" logo depois desta na lista (fica logo acima no AE; exigido no AE anterior a 2023)`);
      }
      if (l.matte.mode && !['alpha', 'alphaInverted'].includes(l.matte.mode)) err(`${L}: matte.mode precisa ser alpha ou alphaInverted`);
    }

    if (SHAPES.includes(l.type)) {
      if (l.fill === undefined && !l.stroke) warn(`${L}: forma sem fill e sem stroke (fica invisivel)`);
      if (l.fill !== undefined && l.fill !== null) {
        if (core.isKeyframes(l.fill)) checkKeys(`${L} fill`, l.fill, 'color');
        else {
          try {
            core.parseColor(l.fill);
          } catch (e) {
            err(`${L}: ${e.message}`);
          }
        }
      }
      if (l.stroke) {
        if (l.stroke.color === undefined) err(`${L}: stroke sem color`);
        checkKeys(`${L} stroke.width`, l.stroke.width);
        if (core.isKeyframes(l.stroke.color)) checkKeys(`${L} stroke.color`, l.stroke.color, 'color');
      }
      if (l.trim) {
        if (!l.stroke) err(`${L}: trim so funciona com stroke (o fill nao e cortado)`);
        checkKeys(`${L} trim.start`, l.trim.start);
        checkKeys(`${L} trim.end`, l.trim.end);
        checkKeys(`${L} trim.offset`, l.trim.offset);
        if ((l.type === 'rect' || l.type === 'ellipse') && core.isKeyframes(l.size)) err(`${L}: com trim, size precisa ser fixo (use scale para animar o tamanho)`);
      }
      if (l.type === 'rect' || l.type === 'ellipse') {
        if (l.size === undefined) err(`${L}: size obrigatorio`);
        checkKeys(`${L} size`, l.size, 'vec');
        checkKeys(`${L} roundness`, l.roundness);
      }
      if (l.type === 'path') {
        try {
          core.parsePathD(l.d);
        } catch (e) {
          err(`${L}: ${e.message}`);
        }
      }
    }

    if (l.type === 'text') {
      if (!l.counter && (typeof l.text !== 'string' || !l.text.length)) err(`${L}: text vazio`);
      if (!fontIds.has(l.font)) err(`${L}: fonte "${l.font}" nao declarada em fonts`);
      if (!(l.size > 0)) err(`${L}: size obrigatorio`);
      try {
        core.parseColor(l.color || '#ffffff');
      } catch (e) {
        err(`${L}: ${e.message}`);
      }
      if (l.counter) {
        const c = l.counter;
        for (const k of ['from', 'to', 'start', 'duration']) if (typeof c[k] !== 'number') err(`${L}: counter.${k} precisa ser numero`);
        if (c.decimals !== undefined && !(c.decimals >= 0 && c.decimals <= 3)) err(`${L}: counter.decimals entre 0 e 3`);
        if (c.locale && !['pt-BR', 'en-US'].includes(c.locale)) err(`${L}: counter.locale precisa ser pt-BR ou en-US`);
        try {
          core.resolveEase(c.ease);
        } catch (e) {
          err(`${L}: ${e.message}`);
        }
        if ((l.animators || []).some((a) => a.by !== 'lines')) warn(`${L}: contador com animator por letra ou palavra; os digitos mudam e as unidades tambem. Prefira by lines.`);
      }
      const ans = l.animators || [];
      const pivotLevels = new Set();
      for (const an of ans) {
        if (!['in', 'out'].includes(an.phase)) err(`${L}: animator.phase precisa ser in ou out`);
        if (!['chars', 'words', 'lines'].includes(an.by)) err(`${L}: animator.by precisa ser chars, words ou lines`);
        if (!(an.duration > 0)) err(`${L}: animator.duration precisa ser maior que 0`);
        if (typeof an.start !== 'number') err(`${L}: animator.start obrigatorio`);
        try {
          core.resolveEase(an.ease);
        } catch (e) {
          err(`${L}: ${e.message}`);
        }
        if (an.order && !['forward', 'reverse', 'center'].includes(an.order)) err(`${L}: animator.order invalido`);
        const v = an.values || {};
        if (v.scale !== undefined || v.rotation !== undefined) pivotLevels.add(an.by);
      }
      if (pivotLevels.size > 1) warn(`${L}: animators com escala ou rotacao em niveis diferentes; no AE o pivô usa o nivel do primeiro`);
      // reading time: fully visible span vs. minimum reading time
      const shownText = String(l.counter ? core.counterTextAt(l.counter, l.counter.start + l.counter.duration) : l.text);
      const words = shownText.split(/\s+/).filter(Boolean).length;
      const lastUnitEnd = (a) => {
        const total = core.splitUnits(shownText, a.by).total;
        const idx = Array.from({length: total}, (_, n) => core.animatorOrderIndex(a.order, n, total));
        const maxIdx = Math.max(0, ...idx);
        return a.start + a.duration + (a.stagger || 0) * maxIdx;
      };
      const inEnd = Math.max(inF, l.counter ? l.counter.start + l.counter.duration : 0, ...ans.filter((a) => a.phase === 'in').map(lastUnitEnd));
      const outStart = Math.min(outF, ...ans.filter((a) => a.phase === 'out').map((a) => a.start));
      const visible = (outStart - inEnd) / fps;
      const need = Math.max(1, 0.3 * words + 0.5);
      if (visible < need - 0.05) warn(`${L}: texto com ${words} palavra(s) fica parado ${visible.toFixed(2)} s; o minimo de leitura e ${need.toFixed(2)} s`);
    }

    if (l.type === 'image' || l.type === 'video') {
      if (!l.src) err(`${L}: src obrigatorio`);
      else {
        const file = path.join(specDir, l.src);
        if (!fs.existsSync(file)) err(`${L}: arquivo nao encontrado: ${l.src}`);
        else if (!(l.width > 0 && l.height > 0)) {
          if (fix) {
            const [w, h] = probeSize(file);
            l.width = w;
            l.height = h;
          } else err(`${L}: width e height obrigatorios (rode com --fix para preencher)`);
        }
      }
    }
    if (l.type === 'audio') {
      if (!l.src || !fs.existsSync(path.join(specDir, l.src))) err(`${L}: arquivo de audio nao encontrado: ${l.src}`);
    }
    if (l.type === 'custom') {
      if (!l.component) err(`${L}: component obrigatorio`);
    }
  }

  // professional checks
  const motionStarts = {};
  for (const l of layers) {
    const pos = (() => {
      try {
        return core.positionProps(l, spec);
      } catch {
        return {};
      }
    })();
    for (const p of [pos.x, pos.y, l.transform && l.transform.scale]) {
      if (core.isKeyframes(p)) motionStarts[p[0].t] = (motionStarts[p[0].t] || new Set()).add(l.id);
    }
  }
  for (const [t, ids] of Object.entries(motionStarts)) {
    if (ids.size > 3) warn(`${ids.size} camadas comecam a se mover juntas no frame ${t} (${[...ids].join(', ')}). Use stagger ou hierarquia.`);
  }
  if (!fonts.length && layers.some((l) => l.type === 'text')) err('Ha texto, mas nenhuma fonte em fonts');
  return {errors, warnings};
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Uso: node validate_spec.mjs motion.json [--fix]');
    process.exit(2);
  }
  const fix = args.includes('--fix');
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const {errors, warnings} = validateSpec(spec, {specDir: path.dirname(path.resolve(file)), fix});
  if (fix && !errors.length) fs.writeFileSync(file, JSON.stringify(spec, null, 2));
  for (const w of warnings) console.log('AVISO: ' + w);
  for (const e of errors) console.log('ERRO: ' + e);
  console.log(errors.length ? `\n${errors.length} erro(s), ${warnings.length} aviso(s).` : `\nSpec valida. ${warnings.length} aviso(s).`);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
