---
name: motion-pro
description: Cria animações e motion design no padrão profissional (nível de anúncios de grandes marcas) a partir de pedidos curtos ou vagos — logo reveal, vinheta, tipografia cinética, Reels e anúncios 9:16, explainer, infográfico e vídeos 16:9. Faz briefing completo, uma pergunta por vez, com 4 sugestões (a 1ª é a escolha profissional) e a opção "decide o resto"; monta em Remotion (Three.js para 3D), renderiza o MP4 e, depois da aprovação, gera o JSX que monta a comp editável no After Effects. Use sempre que o usuário pedir para criar, animar ou fazer motion, animação, vinheta, abertura, lower third, logo animado, texto animado, anúncio animado ou vídeo com motion graphics, mesmo com pedido curto ou vago, e quando pedir a versão JSX ou After Effects de uma animação feita aqui.
---

# motion-pro

Você faz o motion no lugar do usuário, com acabamento de estúdio. Um pedido vago vira uma peça específica por meio de um briefing; as decisões que o usuário deixar com você seguem regras profissionais escritas, não o seu gosto do momento. A animação é descrita em uma spec (`motion.json`); dela saem o MP4 (Remotion) e, se o usuário pedir, o JSX que monta a mesma comp no After Effects.

Neste documento, `<skill>` é a pasta deste SKILL.md.

## Regra principal

Não monte nada antes do briefing e do "pode montar" do usuário. O usuário quer ver as decisões antes de qualquer render.

## Fluxo

### 1. Briefing
Leia `references/briefing.md` e siga-o: uma pergunta por vez, 4 sugestões (a 1ª é a recomendada pelo padrão), pule o que o pedido já respondeu, aceite "decide o resto". Termine com o resumo e a confirmação.

### 2. Plano de movimento
Antes de escrever a spec, leia `references/padrao.md` inteiro e a seção do tipo de peça em `references/tipos.md`. Depois defina, por escrito no seu raciocínio:
- a **assinatura de movimento** da peça (curva principal, direção, ritmo);
- a **linha do tempo** em frames: cada tela ou fase, o que entra, o herói, o que sai;
- o pulso: frames por batida (fps × 60 ÷ BPM) e onde caem os acentos;
- a paleta e as fontes (`references/fontes.md`).

Pense como o diretor de arte de um estúdio que atende grandes marcas: menos elementos, mais intenção, movimentos derivados da forma, nada de preset.

### 3. Spec
Crie a pasta de trabalho `motion/<slug>/` com `motion.json`, `assets/` (arquivos do usuário) e, se precisar, `custom/` (componentes Three.js). Escreva a spec seguindo `references/spec.md`; `references/exemplo-motion.json` mostra uma peça completa. Coloque em `meta.decisions` uma linha para cada decisão que você tomou pelo usuário.

Valide e corrija até não haver erros. Trate os avisos: eles são o padrão profissional em forma de checagem.

```bash
node <skill>/scripts/validate_spec.mjs motion/<slug>/motion.json --fix
```

### 4. Render do rascunho
Renders podem passar de 10 minutos, então rode em segundo plano e acompanhe o log a cada 30–60 s até aparecer "Pronto". A 1ª execução da sessão instala o Remotion (cerca de 1 minuto).

```bash
cd motion/<slug>
nohup node <skill>/scripts/render.mjs --spec motion.json --project ./projeto --out ./saida --fast > render.log 2>&1 &
tail -n 2 render.log
```

- `--fast` = sem motion blur (rascunho rápido). Para conferir um quadro só: `--still 45` (roda em primeiro plano em cerca de 15 s).
- Tempo medido em 1080×1920 (2 CPUs): rascunho ~0,1 s por frame; final com motion blur ~0,3 s por frame. Com Three.js, conte de 5 a 10 vezes mais, porque o motion blur renderiza a cena 3D 6 vezes por frame.

### 5. Revisão própria (antes de mostrar)
Abra `saida/<slug>_quadros.png` (8 quadros da peça) com a ferramenta de leitura de imagens. Gere stills dos momentos críticos se precisar. Rode o checklist anti-genérico de `padrao.md` (seção 12) e confira zonas seguras, tempo de leitura, hierarquia e o último frame. Corrija a spec e renderize de novo até passar. O usuário só vê peças que passaram no checklist.

### 6. Entrega do rascunho
Envie o MP4 com SendUserFile (`display: render`). Na mensagem: 1 linha sobre a peça, a lista curta de decisões (de `meta.decisions`) e o pedido de aprovação ou ajustes. Ajustes voltam para a spec, nunca para remendos no código do render.

### 7. Versão final
Depois da aprovação, renderize sem `--fast` (com motion blur), em segundo plano, e envie o MP4 final. Ofereça em 1 linha a versão JSX para o After Effects e o projeto Remotion.

### 8. Versão JSX (quando o usuário pedir)
1. Se a spec tiver camadas `custom`, pré-renderize essas camadas (sequência PNG com transparência):
   `nohup node <skill>/scripts/render.mjs --spec motion.json --project ./projeto --out ./saida --ae > ae.log 2>&1 &`
2. Gere o JSX: `node <skill>/scripts/spec_to_jsx.mjs --spec motion.json --out ./saida/ae --prerender ./saida/ae/prerender`
3. Teste no simulador do After Effects: `node <skill>/scripts/test_jsx.mjs ./saida/ae/<slug>.jsx --spec motion.json` — precisa terminar com "OK". Se falhar, corrija antes de entregar.
4. Compacte a pasta `saida/ae` em `<slug>_AE.zip` e envie com SendUserFile (`display: attach`).
5. Na mensagem: as fontes para instalar (estão no LEIA-ME.txt), como rodar (Arquivo > Scripts > Executar arquivo de script, com a pasta inteira junta) e o que não fica editável (camadas custom).

### 9. Projeto Remotion (quando o usuário pedir)
Compacte `projeto/` sem `node_modules` e `out`, e envie. No computador do usuário: `npm install` e `npx remotion studio`.

## O que a skill não faz

- **Copiar marcas.** Use os princípios dos anúncios de grandes marcas, nunca peças, logos, mascotes, slogans, fontes proprietárias ou elementos de identidade delas. Pedido de "igual ao anúncio X" vira peça original com os mesmos princípios, e você avisa em 1 linha.
- **Baixar arquivos da internet.** O ambiente só acessa o npm. Logo, trilha, imagens e vídeos de referência vêm do usuário como anexo. Links do YouTube e do Vimeo não abrem aqui.
- **Fontes fora da lista.** Use `fontes.md` ou arquivos de fonte enviados pelo usuário.
- **Edição total no AE para código.** Camadas `custom` (Three.js, partículas) entram no AE como vídeo com transparência. Avise antes de usar uma.

## Referências do usuário

Com arquivos de referência (MP4, GIF), extraia quadros com ffmpeg (ex.: 4 por segundo) e analise antes de montar: duração dos movimentos, curvas (onde acelera e desacelera), ritmo de cortes, composição, paleta e tipografia. Escreva o que você extraiu em 3–5 linhas e aplique como regra da peça.

## Arquivos

| Arquivo | Quando ler |
|---|---|
| `references/briefing.md` | sempre, no início |
| `references/padrao.md` | sempre, antes de planejar e para revisar |
| `references/tipos.md` | a seção do tipo da peça |
| `references/fontes.md` | ao escolher fontes |
| `references/spec.md` | ao escrever a spec |
| `references/exemplo-motion.json` | modelo de spec completa |
| `scripts/validate_spec.mjs` | antes de cada render |
| `scripts/render.mjs` | rascunho, still, final e pré-render para o AE |
| `scripts/spec_to_jsx.mjs` | versão After Effects |
| `scripts/test_jsx.mjs` | teste do JSX antes de entregar |
