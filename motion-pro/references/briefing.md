# Briefing

O briefing transforma um pedido vago em uma peça específica. Ele é completo (11 perguntas), mas pula tudo o que o pedido já respondeu.

## Como perguntar

1. Leia o pedido e anote o que ele já responde. Não pergunte o que já foi dito.
2. Faça **uma pergunta por vez**, na ordem abaixo.
3. Cada pergunta tem **4 sugestões**. A 1ª é a sua escolha pelo padrão profissional e leva "(Recomendado)" no fim do rótulo. Escolha as 4 sugestões mais adequadas ao tipo de peça e ao que o pedido já disse; as listas abaixo são o ponto de partida.
4. Com a ferramenta AskUserQuestion disponível, envie 1 pergunta por chamada, com as 4 sugestões como opções. A opção de texto livre fica automática. Sem a ferramenta, escreva a pergunta e as sugestões como A, B, C e D.
5. Na 1ª pergunta, avise uma vez: "Se quiser, escreva 'decide o resto' e eu escolho o restante pelo padrão profissional."
6. Quando o usuário escrever "decide o resto", "decide você", "tanto faz" ou similar, pare de perguntar e use a sugestão recomendada de cada pergunta restante.
7. Se o pedido inicial já disser "decide tudo" ou "faz do seu jeito", não faça as 11 perguntas: vá direto para o resumo e peça confirmação.

## As 11 perguntas

### 1. Tipo de peça
Pergunta: "Que tipo de peça é?"
Sugestões (escolha as 4 mais prováveis pelo pedido): Logo reveal ou vinheta · Tipografia cinética · Reels ou anúncio 9:16 · Explainer ou infográfico · Vídeo 16:9 (YouTube, institucional).

### 2. Objetivo
Pergunta: "O que a pessoa deve sentir ou fazer depois de ver?"
Sugestões: Lembrar da marca · Entender o produto ou a ideia · Clicar ou comprar · Se emocionar e compartilhar.
Recomendado por tipo: logo → lembrar da marca; Reels/anúncio → clicar ou comprar; explainer → entender; tipografia cinética → se emocionar.

### 3. Formato e fps
Pergunta: "Qual formato e onde vai ser publicado?"
Sugestões: 9:16 1080×1920, 30 fps (Reels, TikTok, Shorts) · 16:9 1920×1080, 30 fps (YouTube, apresentações) · 1:1 1080×1080, 30 fps (feed) · 4:5 1080×1350, 30 fps (feed vertical).
Recomendado por tipo: Reels/anúncio → 9:16; explainer, vídeo 16:9 e logo → 16:9; tipografia cinética → pelo canal citado no pedido, senão 9:16.

### 4. Duração
Pergunta: "Qual a duração?"
Sugestões por tipo:
- Logo reveal: 4 s · 3 s · 6 s · 8 s (vinheta)
- Tipografia cinética: 15 s · 10 s · 20 s · 30 s
- Reels/anúncio: 15 s · 6 s · 30 s · 10 s
- Explainer: 45 s · 30 s · 60 s · 90 s
- Vídeo 16:9: depende do elemento; sugira pela necessidade (ex.: abertura 4 s · lower third 5 s · capítulo 3 s · encerramento 6 s)

### 5. Texto
Pergunta: "Qual texto entra na tela?"
Sugestões: Eu escrevo a partir do objetivo · Vou colar o texto · Sem texto (só logo e visual) · Texto + legendas da locução.
Recomendado: "Eu escrevo a partir do objetivo", exceto em logo reveal (recomende "Sem texto" ou só a tagline).
Se o usuário colar o texto, quebre por sentido e mostre a divisão por tela no resumo.

### 6. Estilo
Pergunta: "Qual estilo?"
Sugestões: as 4 famílias de `padrao.md` (seção 3) que mais combinam com o tipo, o objetivo e a marca. Descreva cada uma em até 6 palavras, sem citar marca no rótulo (ex.: "Premium minimal: preciso, espaço, contraste").

### 7. Cores e fontes
Pergunta: "Cores e fontes?"
Sugestões: Eu escolho pelo estilo · Vou enviar as cores e fontes da marca · Preto e branco + 1 cor de acento · Paleta vibrante de 3 cores.
Recomendado: "Eu escolho pelo estilo". Se o usuário já citou uma marca com cores conhecidas, recomende "Vou enviar as cores da marca".

### 8. Ritmo e música
Pergunta: "Qual ritmo?"
Sugestões: Médio, 110–120 BPM · Calmo, 80–95 BPM · Enérgico, 128–140 BPM · Vou enviar a trilha (eu sincronizo pelas batidas).
Recomendado por estilo: premium e corporativo → calmo ou médio; pop e atitude → enérgico; caloroso e tech lúdico → médio.

### 9. Assets
Pergunta: "Tem logo, imagens ou vídeos para usar?"
Sugestões: Só formas e tipografia · Vou enviar o logo (SVG ou PNG) · Vou enviar imagens ou vídeos · Elementos 3D (Three.js).
Recomendado: logo reveal → "Vou enviar o logo"; demais → "Só formas e tipografia".

### 10. Referências
Pergunta: "Alguma referência para esta peça?"
Sugestões: Sem referência, use o padrão profissional · Vou enviar arquivos (MP4, GIF ou imagens) · Estilo de uma marca (eu uso os princípios, sem copiar) · Um trabalho meu anterior.
Com arquivos de vídeo, extraia quadros com ffmpeg e analise tempo, easing, composição e paleta antes de montar.

### 11. Entrega
Pergunta: "Como você quer receber?"
Sugestões: MP4 H.264 · MP4 + projeto Remotion · MOV com transparência (overlay) · MP4 em vários formatos (9:16, 1:1, 16:9).
Recomendado: MP4 H.264. A versão JSX para o After Effects vem depois da aprovação, quando o usuário pedir.

## Resumo antes de montar

Depois da última resposta, mostre um resumo curto e peça confirmação com AskUserQuestion (opções: "Pode montar (Recomendado)" e "Quero ajustar algo"). Formato:

```
**Resumo do briefing**
Tipo: … | Formato: … | Duração: …
Objetivo: …
Texto por tela: 1) … 2) … 3) …
Estilo: … — porque …
Cores: … | Fontes: …
Ritmo: … BPM (1 batida = … f)
Assets: … | Entrega: …
Decisões minhas: (1 linha cada, só as que eu escolhi)
```

Só monte depois do "pode montar", mesmo quando o usuário pediu "decide tudo". O usuário quer ver as decisões antes de qualquer render.
