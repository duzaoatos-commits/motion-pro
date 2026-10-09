# Formato da spec (motion.json)

A spec é a fonte única da peça. O render do Remotion e o JSX do After Effects saem dela, por isso a prévia e a comp do AE ficam iguais. Escreva a spec à mão, camada por camada, como um motion designer montaria a comp.

## Índice
1. Estrutura geral
2. Tempo, keyframes e easing
3. Transformações, parent e mattes
4. Tipos de camada
5. Animators de texto
6. Camadas custom (Three.js e código)
7. Exemplo completo
8. O que não existe na spec

---

## 1. Estrutura geral

```json
{
  "version": 1,
  "meta": {"title": "Nome da peça", "slug": "nome-da-peca", "type": "reels", "style": "pop vibrante",
           "decisions": ["Pop vibrante: público jovem e música.", "Cortes no beat a 128 BPM (14 f)."]},
  "comp": {"width": 1080, "height": 1920, "fps": 30, "duration": 450, "background": "#0B0B0C", "motionBlur": true},
  "fonts": [{"id": "display", "family": "Unbounded", "weight": 800, "pkg": "unbounded"}],
  "markers": [{"t": 0, "label": "gancho"}, {"t": 45, "label": "valor"}],
  "layers": [ ... ]
}
```

- `comp.duration` em frames. Largura e altura pares.
- `comp.motionBlur: true` liga o motion blur no render final e no AE (obturador 180°; mude com `shutterAngle`; amostras do render com `samples`, padrão 6).
- `fonts`: `id` (usado nas camadas de texto), `family` (nome exato do Google Fonts), `weight`, `italic` (opcional) e `pkg` (pacote `@fontsource`) ou `file` (arquivo da marca em `assets/`). Escolha em `fontes.md`.
- `markers`: viram marcadores na comp do AE. Use para batidas e seções.
- `layers`: **ordem de fundo para frente**. A última camada da lista fica por cima (é a camada 1 no AE).
- Arquivos (imagens, vídeos, áudio, fontes da marca) ficam em `assets/` ao lado da spec, e a spec usa o caminho relativo (`"assets/logo.png"`).

## 2. Tempo, keyframes e easing

Todo tempo é em frames da comp. Uma propriedade aceita valor fixo ou lista de keyframes:

```json
"opacity": [{"t": 0, "v": 0, "e": "outQuint"}, {"t": 15, "v": 100}]
```

- `t` = frame, `v` = valor, `e` = easing **do keyframe até o próximo**. O `e` do último keyframe é ignorado.
- `e` aceita um preset (`outExpo`, `outQuint`, `outCubic`, `inQuint`, `inExpo`, `inOutCubic`, `inOutQuart`, `inOutQuint`, `inOutExpo`, `snap`, `outBack`, `inBack`, `linear`, `hold`) ou uma bezier `[x1, y1, x2, y2]` como no CSS (x1 e x2 entre 0 e 1). A tabela com o equivalente no AE está em `padrao.md`.
- Sem `e`, a skill usa `inOutCubic` e o validador avisa. Escolha o easing sempre.
- Overshoot: prefira um keyframe extra (ex.: 100 → 104 → 100) ou `outBack`.
- Cores em keyframes: `"fill": [{"t": 0, "v": "#FF4D2E", "e": "inOutCubic"}, {"t": 20, "v": "#2E6BFF"}]`.

## 3. Transformações, parent e mattes

Campos comuns a todas as camadas:

| Campo | Formato | Padrão |
|---|---|---|
| `id` | letras, números e hífen | obrigatório |
| `name` | nome no AE | o `id` |
| `in`, `out` | frames (out é exclusivo) | 0 e duração da comp |
| `transform.position` | `[x, y]` fixo ou `{"x": prop, "y": prop}` | centro da comp (sem parent) ou `[0, 0]` (com parent) |
| `transform.scale` | número (%) uniforme, `[sx, sy]` ou keyframes de um deles | 100 |
| `transform.rotation` | graus, sentido horário | 0 |
| `transform.opacity` | 0–100 | 100 |
| `transform.anchor` | `[x, y]` fixo, no espaço da camada | `[0, 0]`; centro em solid, image e video |
| `parent` | id de outra camada | — |
| `matte` | `{"layer": "id", "mode": "alpha" ou "alphaInverted"}` | — |
| `blend` | `normal`, `add`, `screen`, `multiply`, `overlay` | `normal` |
| `effects.blur` | raio em px (prop) | — |

- Position usa **dimensões separadas** (X e Y com keyframes próprios), como um animador faria no AE.
- **Espaço da camada:** formas e texto desenham em volta da origem (0, 0) da camada; a position coloca essa origem na comp. Com `parent`, a position do filho é relativa à origem do pai.
- **Null:** a origem do null é o próprio ponto de pivô. Use nulls para mover grupos e criar parallax.
- **Matte:** a camada de matte precisa ser `rect`, `ellipse` ou `path`, e deve vir **logo depois** da camada alvo na lista. A camada de matte fica invisível e recorta o alvo. Use para reveals por máscara.
- Opacidade não passa do pai para o filho (como no AE).

## 4. Tipos de camada

### rect e ellipse
```json
{"id": "barra", "type": "rect", "size": [600, 12], "origin": [0, 0.5], "roundness": 6,
 "fill": "#FF4D2E", "fillOpacity": 100,
 "stroke": {"color": "#FFFFFF", "width": 4, "opacity": 100, "cap": "round", "join": "round"},
 "trim": {"start": 0, "end": [{"t": 0, "v": 0, "e": "outExpo"}, {"t": 20, "v": 100}], "offset": 0},
 "transform": {"position": [120, 560]}}
```
- `size` `[w, h]` (fixo ou keyframes de `[w, h]`). `origin` = ponto da caixa preso à origem da camada (`[0.5, 0.5]` centro, `[0, 0.5]` meio da esquerda). Para crescer a partir da borda, use `origin` na borda e anime `size`.
- `roundness` (só rect) em px.
- `trim` só afeta o `stroke`. Com `trim`, o `size` precisa ser fixo. O contorno começa no canto superior esquerdo (rect) ou às 12 horas (ellipse), no sentido horário.

### path
```json
{"id": "traco", "type": "path", "d": "M0 0 C 80 -60 160 60 240 0", "stroke": {"color": "#F4F4F0", "width": 6, "cap": "round"},
 "trim": {"end": [{"t": 10, "v": 0, "e": "outExpo"}, {"t": 40, "v": 100}]}}
```
- `d` aceita só comandos absolutos `M`, `L`, `H`, `V`, `C` e `Z`. Para logos em SVG, converta o desenho para esses comandos (coordenadas no espaço da camada) e use várias camadas `path` quando precisar de animações separadas.

### text
```json
{"id": "titulo", "type": "text", "text": "Acorde\nsuas ideias.", "font": "display", "size": 112,
 "color": "#F4F4F0", "align": "left", "leading": 110, "tracking": -30, "caps": false,
 "transform": {"position": [120, 700]}, "animators": [ ... ]}
```
- A origem da camada é a **linha de base da 1ª linha**, no ponto de alinhamento (esquerda, centro ou direita), igual ao texto de ponto do AE.
- `leading` = entrelinha em px (padrão: 1,2 × size). `tracking` em unidades do AE (1/1000 em).
- Quebre linhas com `\n`.
- Cada linha que entra por máscara pede sua própria camada de texto e seu próprio `matte` (como no AE).

### text com contador
```json
{"id": "numero", "type": "text", "font": "display", "size": 200, "align": "center", "color": "#F4F4F0",
 "counter": {"from": 0, "to": 37, "start": 90, "duration": 36, "ease": "outExpo", "decimals": 0, "prefix": "", "suffix": "%", "locale": "pt-BR"}}
```
- O número conta de `from` até `to` com o easing indicado. Formato brasileiro por padrão (1.250 / 37,5). `text` não é usado.
- No AE vira uma expressão no Source Text (o texto continua editável).

### solid
```json
{"id": "fundo-acento", "type": "solid", "color": "#FF4D2E", "size": [1080, 1920]}
```
Tamanho padrão = comp. Pivô no centro.

### image e video
```json
{"id": "produto", "type": "image", "src": "assets/produto.png", "width": 1200, "height": 1200,
 "transform": {"position": [540, 960], "scale": 60}}
{"id": "broll", "type": "video", "src": "assets/broll.mp4", "width": 1920, "height": 1080, "startFrom": 30, "muted": true}
```
- Pivô no centro. Redimensione com `scale` (a camada mantém o tamanho original, como no AE).
- `width` e `height` são preenchidos sozinhos pelo validador (`--fix`) se faltarem.
- `startFrom` = frames cortados do início do arquivo.

### audio
```json
{"id": "trilha", "type": "audio", "src": "assets/trilha.mp3", "volume": 0.8}
```

### null
```json
{"id": "grupo", "type": "null", "transform": {"position": {"x": 540, "y": [{"t": 0, "v": 1000, "e": "outQuint"}, {"t": 30, "v": 960}]}}}
```

## 5. Animators de texto

Animam o texto por letra, palavra ou linha, com atraso entre as unidades. No AE viram Text Animators com Expression Selector (texto continua editável).

```json
"animators": [
  {"phase": "in", "by": "words", "start": 8, "duration": 20, "stagger": 3, "ease": "outExpo", "order": "forward",
   "values": {"y": 120, "opacity": 0}},
  {"phase": "out", "by": "lines", "start": 110, "duration": 12, "stagger": 3, "ease": "inQuint",
   "values": {"y": -80, "opacity": 0}}
]
```

- `phase: "in"`: cada unidade começa nos `values` e chega ao estado normal. `phase: "out"`: sai do estado normal para os `values`.
- `by`: `chars` (letras, sem espaços), `words` ou `lines`.
- `start`, `duration`, `stagger` em frames. A unidade `i` começa em `start + i × stagger`.
- `order`: `forward`, `reverse` ou `center` (do meio para as pontas).
- `values`: `x`, `y` (deslocamento em px), `opacity` (0–100), `scale` (%), `rotation` (graus), `blur` (px).
- Escala e rotação giram em volta da linha de base de cada unidade (como o padrão do AE).
- Reveal por máscara: coloque um `rect` como `matte` do texto e use `y` igual à altura da linha.

## 6. Camadas custom (Three.js e código)

Use só quando a ideia não cabe nos tipos acima (3D, partículas, efeitos generativos). Elas aparecem no render, mas no AE entram como sequência PNG com transparência (não editável).

```json
{"id": "objeto3d", "type": "custom", "component": "Scene3D", "three": true, "in": 10, "props": {"color": "#FF4D2E"}}
```

Crie `custom/Scene3D.tsx` ao lado da spec, com `export default`. O componente recebe `frame` (frame absoluto da comp) e os `props`, e ocupa a tela inteira:

```tsx
import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {interpolate, Easing, useVideoConfig} from 'remotion';

const Scene3D: React.FC<{frame: number; color?: string}> = ({frame, color = '#FF4D2E'}) => {
  const {width, height} = useVideoConfig();
  const s = interpolate(frame, [10, 40], [0, 1], {easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <ThreeCanvas width={width} height={height} camera={{position: [0, 0, 9], fov: 40}}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <mesh rotation={[frame * 0.03, frame * 0.045, 0]} scale={s}>
        <torusGeometry args={[0.9, 0.32, 48, 128]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </ThreeCanvas>
  );
};
export default Scene3D;
```

- Anime pelo `frame` (determinístico). Não use `useFrame`, relógios ou `Math.random()` sem semente.
- `"three": true` liga o WebGL por software no render.
- Use as mesmas curvas de easing do padrão (`Easing.bezier`).

## 7. Exemplo completo

`exemplo-motion.json` (nesta pasta) é um Reels 9:16 de 10 s no estilo premium minimal, com 3 telas: título por letras subindo de máscaras, barra de acento, anel de progresso com trim sincronizado a um contador, null com escala, legenda por letras com blur e uma assinatura de marca com ícone desenhado. Ele passa no validador sem avisos. Use como modelo de estrutura, tempos e nomes.

## 8. O que não existe na spec

Não há: máscaras desenhadas em camadas (use matte com `path`), keyframes de path (morph), efeitos além de blur, câmera 3D do AE, precomps e expressões livres. Quando a ideia precisar disso, use uma camada `custom` e avise o usuário que essa parte não fica editável no AE.
