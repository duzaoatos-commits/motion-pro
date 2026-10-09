import React, {useEffect, useMemo, useState} from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  getInputProps,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
// @ts-ignore - plain ES module shared with the Node scripts
import * as core from './core.mjs';
import specJson from '../spec.json';
import {customComponents} from '../custom/index.generated';
import '../fonts.generated';

// The spec is validated by scripts/validate_spec.mjs before render, so types stay loose here.
type AnyLayer = any;
type Spec = any;

const spec: Spec = specJson;

const BLEND: Record<string, React.CSSProperties['mixBlendMode']> = {
  normal: 'normal',
  add: 'plus-lighter',
  screen: 'screen',
  multiply: 'multiply',
  overlay: 'overlay',
};

const fmt = (n: number) => Math.round(n * 10000) / 10000;
const matrixCss = (m: number[]) => `matrix(${m.map(fmt).join(',')})`;

function fontById(id: string) {
  const f = (spec.fonts || []).find((x: AnyLayer) => x.id === id);
  if (!f) throw new Error(`Fonte "${id}" nao declarada em spec.fonts`);
  return f;
}

// ---------- fonts ----------

function useFontsReady() {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Carregando fontes'));
  useEffect(() => {
    const fonts: AnyLayer[] = spec.fonts || [];
    Promise.all(
      fonts.map(async (f) => {
        const style = f.italic ? 'italic' : 'normal';
        if (f.file) {
          const face = new FontFace(f.family, `url(${staticFile(f.file)})`, {weight: String(f.weight), style});
          await face.load();
          document.fonts.add(face);
        } else {
          await document.fonts.load(`${style} ${f.weight} 64px "${f.family}"`);
        }
        if (!document.fonts.check(`${style} ${f.weight} 64px "${f.family}"`)) {
          console.warn(`Fonte nao carregou: ${f.family} ${f.weight}`);
        }
      }),
    )
      .catch((e) => console.error(e))
      .finally(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
}

const metricsCache = new Map<string, {asc: number; desc: number}>();
function fontMetrics(family: string, weight: number, italic: boolean, size: number) {
  const key = `${family}|${weight}|${italic}|${size}`;
  const hit = metricsCache.get(key);
  if (hit) return hit;
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`;
  const m = ctx.measureText('Hgjpq');
  const res = {asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent};
  metricsCache.set(key, res);
  return res;
}

// ---------- shapes ----------

function shapeElements(layer: AnyLayer, f: number, mono?: string): string {
  const parts: string[] = [];
  let element: {tag: string; attrs: string} | null = null;
  const trim = layer.trim;
  const origin = layer.origin;
  if (layer.type === 'rect') {
    const [w, h] = core.evalProp(layer.size, f, [100, 100], 'vec');
    const r = core.evalProp(layer.roundness, f, 0);
    if (trim) {
      element = {tag: 'path', attrs: `d="${core.shapesToD([core.rectPath(w, h, r, origin)])}"`};
    } else {
      const ox = origin ? origin[0] : 0.5;
      const oy = origin ? origin[1] : 0.5;
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      element = {tag: 'rect', attrs: `x="${fmt(-w * ox)}" y="${fmt(-h * oy)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(rr)}" ry="${fmt(rr)}"`};
    }
  } else if (layer.type === 'ellipse') {
    const [w, h] = core.evalProp(layer.size, f, [100, 100], 'vec');
    if (trim) {
      element = {tag: 'path', attrs: `d="${core.shapesToD([core.ellipsePath(w, h, origin)])}"`};
    } else {
      const ox = origin ? origin[0] : 0.5;
      const oy = origin ? origin[1] : 0.5;
      element = {tag: 'ellipse', attrs: `cx="${fmt(w * (0.5 - ox))}" cy="${fmt(h * (0.5 - oy))}" rx="${fmt(w / 2)}" ry="${fmt(h / 2)}"`};
    }
  } else if (layer.type === 'path') {
    element = {tag: 'path', attrs: `d="${layer.d}"`};
  }
  if (!element) return '';

  if (layer.fill !== undefined && layer.fill !== null) {
    const fillColor = mono || core.colorToCss(core.evalProp(layer.fill, f, '#ffffff', 'color'));
    const fo = core.evalProp(layer.fillOpacity, f, 100) / 100;
    parts.push(`<${element.tag} ${element.attrs} fill="${fillColor}" fill-opacity="${fmt(fo)}" stroke="none"/>`);
  }
  if (layer.stroke) {
    const s = layer.stroke;
    const color = mono || core.colorToCss(core.evalProp(s.color, f, '#ffffff', 'color'));
    const width = core.evalProp(s.width, f, 4);
    const so = core.evalProp(s.opacity, f, 100) / 100;
    let dash = '';
    let skip = false;
    if (trim) {
      const a = core.evalProp(trim.start, f, 0);
      const b = core.evalProp(trim.end, f, 100);
      const off = (core.evalProp(trim.offset, f, 0) / 360) * 100;
      const lo = Math.min(a, b);
      const len = Math.abs(b - a);
      if (len <= 0.0001) skip = true;
      else if (len < 99.9999) dash = ` pathLength="100" stroke-dasharray="${fmt(len)} ${fmt(100 - len)}" stroke-dashoffset="${fmt(-(lo + off))}"`;
    }
    if (!skip && width > 0) {
      parts.push(
        `<${element.tag} ${element.attrs} fill="none" stroke="${color}" stroke-width="${fmt(width)}" stroke-opacity="${fmt(so)}" stroke-linecap="${s.cap || 'butt'}" stroke-linejoin="${s.join || 'miter'}" stroke-miterlimit="4"${dash}/>`,
      );
    }
  }
  return parts.join('');
}

function matteMask(source: AnyLayer, byId: Record<string, AnyLayer>, f: number, mode: string) {
  const {width, height} = spec.comp;
  const m = core.worldMatrixAt(source, byId, spec, f);
  const op = core.opacityAt(source, f) / 100;
  const inverted = mode === 'alphaInverted';
  const fg = inverted ? 'black' : 'white';
  const bg = inverted ? 'white' : 'black';
  const visible = f >= (source.in ?? 0) && f < (source.out ?? spec.comp.duration);
  const inner = visible ? shapeElements(source, f, fg) : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${bg}"/><g transform="${matrixCss(m)}" opacity="${fmt(op)}">${inner}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

// ---------- text ----------

type TextUnit = {text: string; word: number; char: number};

function buildTextStructure(text: string) {
  const lines = String(text).split('\n');
  let word = 0;
  let char = 0;
  return lines.map((line, li) => {
    const tokens = line.split(/(\s+)/).filter((t) => t.length > 0);
    const words = tokens.map((tok) => {
      if (/^\s+$/.test(tok)) return {space: tok, chars: [] as TextUnit[], word: -1};
      const chars = Array.from(tok).map((ch) => ({text: ch, word, char: char++}));
      return {space: '', chars, word: word++};
    });
    return {line: li, words};
  });
}

type UnitFx = {x: number; y: number; opacity: number; scale: number; rotation: number; blur: number};
const NO_FX: UnitFx = {x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, blur: 0};

function unitFx(animators: AnyLayer[], level: string, index: number, totals: Record<string, number>, f: number): UnitFx {
  const fx = {...NO_FX};
  for (const an of animators) {
    if (an.by !== level) continue;
    const a = core.animatorAmount(an, index, totals[level], f);
    const v = an.values || {};
    fx.x += (v.x || 0) * a;
    fx.y += (v.y || 0) * a;
    fx.rotation += (v.rotation || 0) * a;
    fx.blur += (v.blur || 0) * a;
    if (v.opacity !== undefined) fx.opacity *= (100 + (v.opacity - 100) * a) / 100;
    if (v.scale !== undefined) fx.scale *= (100 + (v.scale - 100) * a) / 100;
  }
  return fx;
}

function fxStyle(fx: UnitFx, baseline: number): React.CSSProperties {
  if (fx === NO_FX) return {};
  return {
    display: 'inline-block',
    transformOrigin: `50% ${fmt(baseline)}px`,
    transform: `translate(${fmt(fx.x)}px, ${fmt(fx.y)}px) rotate(${fmt(fx.rotation)}deg) scale(${fmt(fx.scale)})`,
    opacity: Math.max(0, Math.min(1, fx.opacity)),
    filter: fx.blur > 0.01 ? `blur(${fmt(fx.blur)}px)` : undefined,
  };
}

const TextContent: React.FC<{layer: AnyLayer; frame: number}> = ({layer, frame}) => {
  const font = fontById(layer.font);
  const size: number = layer.size;
  const leading: number = layer.leading ?? size * 1.2;
  const align: string = layer.align || 'left';
  const {asc, desc} = fontMetrics(font.family, font.weight, !!font.italic, size);
  const baseline = (leading - (asc + desc)) / 2 + asc;
  const animators: AnyLayer[] = layer.animators || [];
  // counters change on whole frames only, so motion blur samples never mix two numbers
  const text: string = layer.counter ? core.counterTextAt(layer.counter, Math.round(frame)) : layer.text;
  const structure = useMemo(() => buildTextStructure(text), [text]);
  const totals = useMemo(
    () => ({
      lines: structure.length,
      words: structure.reduce((n, l) => n + l.words.filter((w) => w.word >= 0).length, 0),
      chars: structure.reduce((n, l) => n + l.words.reduce((m, w) => m + w.chars.length, 0), 0),
    }),
    [structure],
  );
  const hasLevel = (lvl: string) => animators.some((a) => a.by === lvl);
  const shiftX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  const color = core.colorToCss(core.parseColor(layer.color || '#ffffff'));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate(${shiftX}, ${fmt(-baseline)}px)`,
        whiteSpace: 'pre',
        fontFamily: `"${font.family}"`,
        fontWeight: font.weight,
        fontStyle: font.italic ? 'italic' : 'normal',
        fontSize: size,
        lineHeight: `${leading}px`,
        letterSpacing: `${(layer.tracking || 0) / 1000}em`,
        textTransform: layer.caps ? 'uppercase' : 'none',
        textAlign: align as React.CSSProperties['textAlign'],
        color,
        fontKerning: 'normal',
      }}
    >
      {structure.map((ln) => {
        const lineFx = hasLevel('lines') ? unitFx(animators, 'lines', ln.line, totals, frame) : NO_FX;
        return (
          <div key={ln.line} style={{height: leading, ...fxStyle(lineFx, baseline), display: 'block'}}>
            {ln.words.map((w, wi) => {
              if (w.word < 0) return <React.Fragment key={wi}>{w.space}</React.Fragment>;
              const wordFx = hasLevel('words') ? unitFx(animators, 'words', w.word, totals, frame) : NO_FX;
              const charsEl = hasLevel('chars')
                ? w.chars.map((c) => (
                    <span key={c.char} style={fxStyle(unitFx(animators, 'chars', c.char, totals, frame), baseline)}>
                      {c.text}
                    </span>
                  ))
                : w.chars.map((c) => c.text).join('');
              return (
                <span key={wi} style={fxStyle(wordFx, baseline)}>
                  {charsEl}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ---------- layers ----------

const LayerContent: React.FC<{layer: AnyLayer; frame: number}> = ({layer, frame}) => {
  switch (layer.type) {
    case 'text':
      return <TextContent layer={layer} frame={frame} />;
    case 'rect':
    case 'ellipse':
    case 'path':
      return (
        <svg
          width={1}
          height={1}
          style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}
          dangerouslySetInnerHTML={{__html: shapeElements(layer, frame)}}
        />
      );
    case 'solid': {
      const [w, h] = layer.size || [spec.comp.width, spec.comp.height];
      return <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, backgroundColor: layer.color}} />;
    }
    case 'image':
      return <Img src={staticFile(layer.src)} style={{position: 'absolute', left: 0, top: 0, width: layer.width, height: layer.height}} />;
    case 'video':
      return (
        <OffthreadVideo
          src={staticFile(layer.src)}
          trimBefore={layer.startFrom || 0}
          muted={layer.muted ?? false}
          volume={layer.volume ?? 1}
          style={{position: 'absolute', left: 0, top: 0, width: layer.width, height: layer.height}}
        />
      );
    default:
      return null;
  }
};

const LayerElement: React.FC<{layer: AnyLayer; frame: number; byId: Record<string, AnyLayer>}> = ({layer, frame, byId}) => {
  const m = core.worldMatrixAt(layer, byId, spec, frame);
  const opacity = Math.max(0, Math.min(1, core.opacityAt(layer, frame) / 100));
  const blur = layer.effects && layer.effects.blur !== undefined ? core.evalProp(layer.effects.blur, frame, 0) : 0;
  const wrap: React.CSSProperties = {opacity, mixBlendMode: BLEND[layer.blend || 'normal']};
  if (layer.matte) {
    const src = byId[layer.matte.layer];
    wrap.maskImage = matteMask(src, byId, frame, layer.matte.mode || 'alpha');
    wrap.maskMode = 'luminance';
    wrap.maskSize = '100% 100%';
    wrap.maskRepeat = 'no-repeat';
  }
  if (layer.type === 'custom') {
    const Comp = (customComponents as Record<string, React.FC<any>>)[layer.component];
    if (!Comp) throw new Error(`Componente custom "${layer.component}" nao encontrado em src/custom`);
    return (
      <AbsoluteFill style={wrap}>
        <AbsoluteFill style={{transformOrigin: '0 0', transform: matrixCss(m), filter: blur > 0.01 ? `blur(${fmt(blur)}px)` : undefined}}>
          <Comp frame={frame} {...(layer.props || {})} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={wrap}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: matrixCss(m),
          filter: blur > 0.01 ? `blur(${fmt(blur)}px)` : undefined,
        }}
      >
        <LayerContent layer={layer} frame={frame} />
      </div>
    </AbsoluteFill>
  );
};

const Scene: React.FC<{only: string | null}> = ({only}) => {
  const frame = useCurrentFrame();
  const byId = useMemo(() => Object.fromEntries(spec.layers.map((l: AnyLayer) => [l.id, l])), []);
  const matteSources = useMemo(() => new Set(spec.layers.filter((l: AnyLayer) => l.matte).map((l: AnyLayer) => l.matte.layer)), []);
  const layers: AnyLayer[] = only ? spec.layers.filter((l: AnyLayer) => l.id === only) : spec.layers;

  return (
    <AbsoluteFill style={{backgroundColor: only ? 'transparent' : spec.comp.background || '#000000'}}>
      {layers.map((l) => {
        if (l.type === 'null') return null;
        if (!only && matteSources.has(l.id)) return null;
        const inF = l.in ?? 0;
        const outF = l.out ?? spec.comp.duration;
        if (l.type === 'audio') {
          if (only) return null;
          return (
            <Sequence key={l.id} from={inF} durationInFrames={outF - inF} layout="none">
              <Audio src={staticFile(l.src)} trimBefore={l.startFrom || 0} volume={l.volume ?? 1} />
            </Sequence>
          );
        }
        if (l.type === 'video') {
          return (
            <Sequence key={l.id} from={inF} durationInFrames={outF - inF} layout="none">
              <LayerElement layer={l} frame={frame} byId={byId} />
            </Sequence>
          );
        }
        if (frame < inF || frame >= outF) return null;
        return <LayerElement key={l.id} layer={l} frame={frame} byId={byId} />;
      })}
    </AbsoluteFill>
  );
};

export const SpecComposition: React.FC<{only?: string | null}> = ({only = null}) => {
  const ready = useFontsReady();
  const input = getInputProps() as {fast?: boolean};
  if (!ready) return null;
  const scene = <Scene only={only} />;
  if (spec.comp.motionBlur && !input.fast) {
    return (
      <CameraMotionBlur shutterAngle={spec.comp.shutterAngle ?? 180} samples={spec.comp.samples ?? 6}>
        {scene}
      </CameraMotionBlur>
    );
  }
  return scene;
};
