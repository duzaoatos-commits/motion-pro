# Padrão profissional de motion

Estas regras definem o "padrão profissional" da skill. Use-as quando o usuário escolher a sugestão recomendada, disser "decide você" ou "decide o resto", e também para revisar qualquer peça antes de entregar.

## Índice
1. Função do movimento
2. Nível de referência: grandes marcas
3. Famílias de estilo
4. Tempo e ritmo
5. Easing
6. Hierarquia e coreografia
7. Composição e zonas seguras
8. Tipografia
9. Cor
10. Transições
11. Acabamento
12. Checklist anti-genérico

---

## 1. Função do movimento

Cada movimento precisa ter uma função: guiar o olhar, mostrar hierarquia, marcar ritmo ou explicar uma ideia. Se um movimento não faz nenhuma das 4 coisas, corte. Movimento decorativo é o que mais deixa uma peça com cara de template.

Uma ideia por tela. Se a tela tem duas ideias, divida em duas telas.

## 2. Nível de referência: grandes marcas

O alvo de qualidade é o acabamento de anúncios de marcas como Apple, Coca-Cola, Spotify, Nike e Google. Essas empresas contratam os melhores estúdios, então os princípios abaixo resumem o que torna esse trabalho bom.

**Limite de propriedade intelectual:** use só os princípios. Não copie peças, logos, mascotes, slogans, fontes proprietárias (SF Pro, Circular, TCCC Unity etc.) nem elementos de identidade (por exemplo: a onda e a garrafa da Coca-Cola, os gráficos do Spotify Wrapped). Se o usuário pedir "igual ao anúncio X", crie uma peça original com os mesmos princípios e avise isso em 1 linha.

Princípios destilados:

1. **O movimento nasce da forma.** Derive o movimento da geometria do logo ou do produto: curvas viram trajetórias, traços viram linhas que se desenham, ângulos viram cortes de máscara.
2. **Movimento como comportamento.** Use ações físicas ligadas ao produto: abrir, servir, deslizar, tocar, encaixar. Elas são reconhecidas na hora.
3. **Personalidade antes do movimento.** Defina dois eixos antes de animar: preciso ↔ lúdico e premium ↔ caloroso. Os eixos decidem easing, tempo e cor (veja a seção 3).
4. **Contenção.** Poucos elementos, espaço negativo generoso e um movimento principal por vez.
5. **Sistema.** Uma assinatura de movimento (mesma curva, mesma direção, mesmo ritmo) repetida na peça toda. A repetição cria identidade.
6. **Som e movimento juntos.** Os acentos visuais caem nas batidas e nos efeitos sonoros.

## 3. Famílias de estilo

Use esta tabela para escolher o estilo quando o usuário deixar a decisão com você. Diga qual família escolheu e por quê em 1 linha.

| Família | Quando usar | Easing base | Ritmo | Tipografia | Cor |
|---|---|---|---|---|---|
| Premium minimal (nível Apple) | tecnologia, produto premium, lançamento | outExpo e inOutQuint longos | lento, holds longos | sans grande, tracking negativo | preto ou branco + 1 acento |
| Pop vibrante (nível Spotify) | música, lifestyle, público jovem | outQuint curto, snap | rápido, no beat | display enorme, pesos extremos | blocos saturados, 2–3 cores fortes |
| Calor e celebração (nível Coca-Cola) | bebida, comida, família, datas | outCubic, curvas fluidas | alegre, médio-rápido | sans arredondada ou serif suave | quentes (vermelho, laranja, creme) |
| Atitude (nível Nike) | esporte, manifesto, frase forte | cortes secos, inOutExpo | cortes no beat, pausas dramáticas | condensada pesada, caixa alta | preto, branco, 1 cor de choque |
| Tech lúdico (nível Google) | apps, educação, serviços | outBack leve, outQuint | médio | geométrica amigável | primárias limpas sobre fundo claro |
| Corporativo refinado | B2B, institucional, relatórios | inOutCubic, outCubic | médio-lento | grotesca sóbria ou serif editorial | neutros + 1 cor da marca |

Personalidade → parâmetros:

| Eixo | Lado A | Lado B |
|---|---|---|
| preciso ↔ lúdico | sem overshoot, movimentos retos, snap | overshoot de 3–6%, arcos, rotações leves |
| premium ↔ caloroso | durações longas, holds longos, poucas cores | durações médias, cores quentes, mais elementos secundários |

## 4. Tempo e ritmo

Valores a 30 fps. Para outro fps, converta pelo tempo em segundos.

| Movimento | Duração |
|---|---|
| Micro (ícone, detalhe) | 6–10 frames |
| Entrada padrão | 12–20 frames |
| Movimento grande ou de câmera | 18–30 frames |
| Reveal de logo | 20–40 frames |
| Transição entre cenas | 12–20 frames |

- **Saídas** duram cerca de 70% da entrada correspondente. A atenção já está no próximo elemento.
- **Stagger** (atraso entre elementos): letras 1–2 f, palavras 2–4 f, blocos 4–8 f.
- **Overlap:** comece o próximo movimento quando o anterior estiver entre 60% e 80% concluído. Movimentos em fila parecem robóticos.
- **Respiro:** depois de um movimento forte, segure 8–12 f antes do próximo.
- **Leitura:** um texto fica parado no mínimo 0,3 s por palavra + 0,5 s, e nunca menos de 1 s. Exemplo: 5 palavras = 2 s parado.
- **Música:** frames por batida = fps × 60 ÷ BPM. A 120 BPM e 30 fps, 1 batida = 15 f e 1 compasso (4 batidas) = 60 f. Coloque os acentos fortes no início dos compassos.
- **fps:** 30 para social e web; 24 para look de cinema ou premium; 29,97 para TV no Brasil; 60 só para UI e games.

## 5. Easing

Regras:
- Não use linear em posição, escala ou rotação. Exceção: rotação contínua, letreiro rolando e loops mecânicos.
- Não use o Easy Ease padrão do After Effects (33%). Ele é o sinal mais claro de trabalho genérico.
- Entradas usam curvas "out" (chegam rápido e assentam longo). Saídas usam curvas "in". Movimento de A para B na tela usa "inOut" ou snap.
- Overshoot (outBack ou keyframe extra em 103–106%) só nos estilos lúdicos. Nunca no premium.
- Antecipação (inBack) só para elementos com peso ou personagem.

Presets da skill (bezier = cubic-bezier do CSS; o equivalente no After Effects vale para propriedades de 1 dimensão ou dimensões separadas):

| Preset | Bezier | Saída do keyframe inicial (AE) | Entrada do keyframe final (AE) | Uso |
|---|---|---|---|---|
| outExpo | 0.16, 1, 0.3, 1 | influência 16%, velocidade 6,25× a média | influência 70%, velocidade 0 | entrada premium, chegada longa |
| outQuint | 0.22, 1, 0.36, 1 | 22%, 4,5× | 64%, 0 | entrada padrão |
| outCubic | 0.33, 1, 0.68, 1 | 33%, 3× | 32%, 0 | entrada suave, calorosa |
| inQuint | 0.64, 0, 0.78, 0 | 64%, 0 | 22%, 4,5× | saída |
| inExpo | 0.7, 0, 0.84, 0 | 70%, 0 | 16%, 6,25× | saída rápida |
| inOutCubic | 0.65, 0, 0.35, 1 | 65%, 0 | 65%, 0 | A→B suave |
| inOutQuart | 0.76, 0, 0.24, 1 | 76%, 0 | 76%, 0 | A→B padrão |
| inOutQuint | 0.83, 0, 0.17, 1 | 83%, 0 | 83%, 0 | A→B premium |
| inOutExpo | 0.87, 0, 0.13, 1 | 87%, 0 | 87%, 0 | corte seco, atitude |
| snap | 0.9, 0, 0.1, 1 | 90%, 0 | 90%, 0 | transição de impacto |
| outBack | 0.34, 1.56, 0.64, 1 | 34%, 4,59× | 36%, 0 | entrada com overshoot (lúdico) |
| inBack | 0.36, 0, 0.66, -0.56 | 36%, 0 | 34%, 4,59× | antecipação |

## 6. Hierarquia e coreografia

- **Um herói por vez.** Os elementos secundários entram 6–10 f depois do herói, com deslocamento menor (cerca de metade).
- **Direção consistente.** Um elemento sai na direção em que o próximo entra. Isso cria continuidade entre telas.
- **Parallax.** Camadas de fundo se movem com 30–60% da velocidade das camadas da frente.
- **Escala de texto.** Evite texto saindo de 0% de escala. Prefira 85–92% → 100% com opacidade, deslocamento curto ou máscara.
- **Deslocamento.** Entradas de texto deslocam 40–120 px (em 1080 de largura). Deslocamentos maiores pedem motion blur.
- **Máscaras em vez de fades.** Reveal por máscara (texto subindo de dentro de uma caixa, por exemplo) parece mais acabado que fade simples.

## 7. Composição e zonas seguras

- Alinhe tudo a um grid: 4 colunas em 9:16, 12 colunas em 16:9. As margens do grid são as zonas seguras.
- Estilo premium: espaço negativo de pelo menos 40% da tela.
- Herói nos terços; logo final no centro óptico (um pouco acima do centro geométrico).

**Zona segura 9:16 (1080×1920), usada para Reels, TikTok e Shorts ao mesmo tempo:**

| Borda | Margem | Motivo |
|---|---|---|
| Topo | 270 px (14%) | nome da conta e ícones |
| Base | 670 px (35%) | legenda, botões e CTA da plataforma |
| Esquerda | 120 px | margem do TikTok |
| Direita | 120 px; 300 px abaixo de y = 840 | coluna de botões do TikTok |

Área útil para texto e logo: x de 120 a 960, y de 270 a 1250 (e x até 780 abaixo de y = 840). As plataformas mudam as interfaces; o Ads Manager da Meta e o TikTok Ads mostram a sobreposição atual.

**Zona segura 16:9 (EBU R95):** área de ação = 3,5% por lado; área gráfica (texto e logos) = 5% por lado. Em 1920×1080: texto entre x 96–1824 e y 54–1026.

## 8. Tipografia

- No máximo 2 famílias. O ideal é 1 família com 2 ou 3 pesos.
- Use só as fontes de `references/fontes.md`. Elas são gratuitas, renderizam aqui e podem ser instaladas no After Effects.
- Display (texto acima de 80 px em 1080 de largura): tracking de −20 a −40 (unidades do AE) e entrelinha de 0,9 a 1,05 vez o tamanho.
- Texto de apoio: tracking 0 a +20, entrelinha de 1,2 a 1,35 vez o tamanho.
- Social 9:16: no máximo 7 palavras por tela e tamanho mínimo de 48 px.
- Quebre linhas por sentido. Não deixe uma palavra sozinha na última linha.
- Contraste mínimo de 4,5:1 entre texto e fundo.
- Caixa alta só em frases curtas (até 4 palavras) e com tracking positivo em textos pequenos.

## 9. Cor

- Proporção 60-30-10: cor dominante, cor secundária, acento.
- O acento marca só o que importa: palavra-chave, número, CTA.
- Fundo escuro: use #0B0B0C a #161618 em vez de #000000. Fundo claro: #F4F4F0 a #FAFAF7 em vez de #FFFFFF.
- Evite o gradiente genérico roxo-azul. Prefira cores sólidas ou gradientes de 2 tons vizinhos.
- Com cores da marca, use os códigos exatos. Sem cores da marca, escolha pela família de estilo.

## 10. Transições

Use transições motivadas:
- máscara que continua o movimento do elemento que sai;
- match cut por forma, cor ou posição;
- empurrão (push) com a mesma velocidade nos dois lados do corte;
- zoom através de um elemento (o elemento vira a próxima cena).

Não use como padrão: dissolve cruzado (só para passagem de tempo), wipes de preset, zoom com blur genérico, glitch sem motivo.

## 11. Acabamento

- Motion blur ligado em tudo que se move rápido (obturador de 180°).
- A primeira tela já tem movimento ou uma frase forte. Exceção: logo reveal com build-up.
- O último frame fica limpo e parado. Ele vira thumbnail.
- Em social, faça o fim encaixar no início quando der (loop).
- Sem trilha, mantenha um pulso implícito de 120 BPM (15 f a 30 fps) para os acentos.

## 12. Checklist anti-genérico

Rode antes de cada entrega. Corrija o que falhar.

1. A peça tem uma assinatura de movimento (curva + direção + ritmo) que se repete?
2. Algum movimento usa linear ou easing padrão sem motivo?
3. Mais de 1 herói se move ao mesmo tempo?
4. Algum texto fica parado menos que o tempo mínimo de leitura?
5. Algum texto ou logo está fora da zona segura?
6. Alguma transição é de preset (dissolve, wipe genérico)?
7. Fontes e cores combinam com a família de estilo escolhida?
8. Em social: o primeiro segundo prende a atenção?
9. O último frame está limpo?
10. Cada decisão tem 1 linha de justificativa no resumo para o usuário?
