# Regras por tipo de peça

Leia só a seção do tipo da peça. Cada seção traz: duração, estrutura em tempo, regras específicas, padrão do "decide você" e erros comuns. As regras gerais de `padrao.md` continuam valendo.

## Índice
1. Logo reveal e vinheta
2. Tipografia cinética
3. Reels e anúncios 9:16
4. Explainer e infográfico
5. Vídeo 16:9 (YouTube, institucional, apresentações)

---

## 1. Logo reveal e vinheta

**Duração:** logo reveal de 3 a 6 s; vinheta de abertura ou encerramento de 5 a 8 s.

**Estrutura (em % da duração):**

| Fase | Tempo | O que acontece |
|---|---|---|
| Build-up | 0–55% | elementos derivados do logo se organizam (traços se desenham, formas se aproximam) |
| Hit | 55–65% | o logo se forma; acento sonoro |
| Assentamento | 65–75% | micro movimento final (settle de 2–4%) |
| Hold | 75–100% | logo completo e parado por no mínimo 1 s; tagline entra 8–12 f depois do hit |

**Regras:**
- Derive o movimento da geometria do logo: curvas viram trajetórias, traços viram linhas com trim, letras entram por máscara.
- Use 1 movimento assinatura. Mais de um enfraquece o hit.
- Escala uniforme sempre. Não distorça o logo.
- Respeite a área de proteção do logo no frame final.
- Use as cores oficiais. Sem cores oficiais, peça ao usuário ou use o logo como foi enviado.
- O logo final fica estático, inteiro e centralizado no centro óptico.

**Assets:** logo em SVG (preferido) ou PNG transparente com pelo menos 2× o tamanho final. Com SVG, converta os traços para camadas `path` na spec. Isso permite animar o desenho e manter tudo editável no After Effects.

**Padrão "decide você":** 1920×1080, 30 fps, 4 s (120 f), premium minimal, fundo #0B0B0C ou a cor principal da marca, hit em 2,2 s.

**Erros comuns:** partículas genéricas sem relação com a marca; brilho (lens flare) de preset; logo chegando com bounce exagerado; hold curto demais.

---

## 2. Tipografia cinética

**Duração:** depende do texto. Some o tempo de leitura de cada tela (0,3 s por palavra + 0,5 s) e as transições. Padrão: 10–20 s.

**Estrutura:** quebre o texto por sentido, com 1 a 5 palavras por tela. Cada tela tem 1 palavra de ênfase no máximo.

**Regras:**
- Anime por palavra (stagger de 2–3 f). Por letra só em palavras curtas de impacto (stagger de 1–2 f).
- Ênfase por contraste: peso, escala (1,3× a 2×), cor de acento ou caixa alta. Use 1 recurso de ênfase por tela.
- A transição carrega momentum: a direção de saída de uma tela é a direção de entrada da próxima.
- Use máscaras: palavras sobem de dentro de uma linha invisível (deslocamento de 100% da altura da linha) em vez de fade.
- Com locução ou música, sincronize as entradas com as sílabas tônicas ou com as batidas. Marque os pontos de sincronia em `markers` na spec.
- Tipografia como imagem: tamanhos grandes, cortes pela borda do quadro, alinhamento forte à esquerda ou centralizado (não misture na mesma peça).

**Padrão "decide você":** 1080×1920 para social ou 1920×1080 para YouTube; 30 fps; família de estilo conforme o tom (pop vibrante para energia, premium minimal para sobriedade); 1 família tipográfica em 2 pesos.

**Erros comuns:** muitas palavras por tela; todas as palavras com a mesma ênfase; entradas iguais em todas as telas sem variação de ritmo; texto pequeno.

---

## 3. Reels e anúncios 9:16

**Duração:** 6, 15 ou 30 s. Padrão: 15 s.

**Estrutura (15 s):**

| Fase | Tempo | O que acontece |
|---|---|---|
| Gancho | 0–1,5 s | frase forte ou movimento já no frame 0, sem fade do preto |
| Valor | 1,5–4 s | o que é e por que importa; marca aparece de forma sutil |
| Desenvolvimento | 4–11 s | 2 ou 3 provas ou benefícios, 1 por tela |
| CTA | 11–15 s | ação clara, logo, fim limpo que encaixa no início (loop) |

**Regras:**
- Respeite a zona segura 9:16 de `padrao.md` (texto entre y 270 e 1250).
- No máximo 7 palavras por tela; tamanho mínimo de 48 px.
- Pense em som desligado: a mensagem funciona só com texto e imagem.
- Com fala, inclua legendas (use a skill de legendas do usuário quando houver arquivo de áudio).
- Ritmo de troca de tela de 1 a 2 s. Telas paradas por mais de 3 s perdem o público.
- Marca visível nos 3 primeiros segundos, sem dominar o gancho.

**Padrão "decide você":** 1080×1920, 30 fps, 15 s, pop vibrante, CTA nos últimos 3 s.

**Erros comuns:** gancho lento; texto na área dos botões; logo grande no início; CTA genérico ("saiba mais") sem contexto.

---

## 4. Explainer e infográfico

**Duração:** 30 a 90 s (padrão 45 s) ou 4 a 8 s por cena.

**Estrutura:** problema → ideia → como funciona (passos) → prova (números) → CTA.

**Regras:**
- Uma ideia por cena. Construa os elementos na ordem de leitura (esquerda → direita, cima → baixo).
- Números contam do zero até o valor com outExpo em 20–36 f (camada de texto com `counter`). Formato brasileiro (1.250 / 37,5%).
- Gráficos crescem a partir da base ou do eixo. Barras com stagger de 3–4 f.
- Rótulos entram 4–6 f depois do elemento que explicam.
- Ícones de um único estilo (traço ou sólido, mesma espessura).
- Mesma transição entre todas as cenas, na mesma direção. A consistência ajuda a entender.
- Destaque o dado principal com a cor de acento; o resto fica neutro.

**Padrão "decide você":** 1920×1080, 30 fps, 45 s, tech lúdico (público geral) ou corporativo refinado (B2B).

**Erros comuns:** muitos dados por cena; números sem unidade; gráficos sem eixo de referência; animações diferentes em cada cena.

---

## 5. Vídeo 16:9 (YouTube, institucional, apresentações)

**Elementos típicos:** abertura curta (3–5 s), lower thirds, títulos de capítulo, callouts, telas de dado, encerramento com CTA.

**Regras:**
- Texto e logos dentro da área gráfica (5% por lado; em 1920×1080, x 96–1824 e y 54–1026).
- Lower third: entrada de 15–20 f, permanência de no mínimo 3 s, saída de 10–12 f, no terço inferior.
- Título de capítulo: 2–3 s, entrada e saída pela mesma direção.
- Ritmo mais calmo que social: holds 30–50% mais longos.
- Um sistema único: todos os elementos usam a mesma família de animação (mesma curva, mesma direção, mesmas durações).

**Padrão "decide você":** 1920×1080, 30 fps (24 para look de cinema), corporativo refinado ou premium minimal.

**Erros comuns:** lower third grande demais; cada elemento com um estilo; textos encostados na borda.
