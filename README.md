# motion-pro

Skill para o Claude que cria animações e motion design no padrão profissional.

A skill transforma um pedido curto ou vago em uma peça pronta: logo reveal, vinheta, tipografia cinética, Reels e anúncios 9:16, explainer, infográfico e vídeos 16:9.

## O que a skill faz

1. Faz um briefing: uma pergunta por vez, com 4 sugestões. A 1ª sugestão é a escolha profissional. O usuário pode responder "decide o resto".
2. Escreve uma spec da animação (`motion.json`) com regras profissionais de movimento, ritmo, tipografia e cor.
3. Valida a spec e corrige os erros.
4. Renderiza o MP4 com [Remotion](https://www.remotion.dev/). Cenas 3D usam Three.js.
5. Revisa 8 quadros da peça com um checklist anti-genérico antes de mostrar.
6. Depois da aprovação, renderiza a versão final com motion blur.
7. Se o usuário pedir, gera um script JSX que monta a mesma composição editável no After Effects.

## Estrutura

```
motion-pro/
├── SKILL.md                      instruções principais da skill
├── references/
│   ├── briefing.md               roteiro do briefing
│   ├── padrao.md                 padrão profissional e checklist anti-genérico
│   ├── tipos.md                  regras por tipo de peça
│   ├── fontes.md                 fontes permitidas
│   ├── spec.md                   formato da spec motion.json
│   └── exemplo-motion.json       exemplo de spec completa
├── scripts/
│   ├── validate_spec.mjs         valida e corrige a spec
│   ├── render.mjs                rascunho, still, final e pré-render para o AE
│   ├── spec_to_jsx.mjs           gera o JSX do After Effects
│   └── test_jsx.mjs              testa o JSX em um simulador do AE
└── assets/
    └── remotion-template/        projeto Remotion base
```

## Requisitos

- Node.js 18 ou mais novo.
- npm com acesso à internet. Na 1ª execução, `render.mjs` instala o Remotion (cerca de 1 minuto).
- ffmpeg, para analisar vídeos de referência (opcional).
- After Effects, para abrir a versão JSX (opcional).

## Instalação

### No Claude.ai (app web, desktop ou mobile)

1. Baixe este repositório: clique em **Code > Download ZIP**.
2. Descompacte o ZIP.
3. Compacte somente a pasta `motion-pro/` (a pasta que contém o `SKILL.md`) em um arquivo `motion-pro.zip`.
4. No Claude, abra **Settings > Capabilities**.
5. Confirme que a execução de código e a criação de arquivos estão ligadas.
6. Na seção **Skills**, clique em **Upload skill**.
7. Selecione o arquivo `motion-pro.zip`.
8. Ligue a skill, se ela estiver desligada.

> O nome da pasta no ZIP precisa ser `motion-pro`, igual ao campo `name` do `SKILL.md`.

### No Claude Code

1. Clone o repositório:
   ```bash
   git clone https://github.com/duzaoatos-commits/motion-pro.git
   ```
2. Copie a pasta da skill para a pasta de skills do usuário:
   ```bash
   mkdir -p ~/.claude/skills
   cp -r motion-pro/motion-pro ~/.claude/skills/
   ```
3. Reinicie o Claude Code.

Para usar a skill em um só projeto, copie a pasta para `.claude/skills/` dentro do projeto.

## Como usar

Peça uma animação em linguagem normal. Exemplos:

- "Faz uma vinheta de 5 segundos para o meu canal."
- "Anima o logo em anexo para abrir os vídeos."
- "Cria um Reels 9:16 com o texto: Promoção de outubro, 30% off."
- "Quero a versão JSX para o After Effects."

O Claude ativa a skill sozinho quando o pedido fala de motion, animação, vinheta, abertura, lower third, logo animado, texto animado ou anúncio animado.

## Uso dos scripts sem o Claude

Valide uma spec:

```bash
node motion-pro/scripts/validate_spec.mjs motion.json --fix
```

Renderize um rascunho sem motion blur:

```bash
node motion-pro/scripts/render.mjs --spec motion.json --project ./projeto --out ./saida --fast
```

Renderize um quadro só (frame 45) para conferir:

```bash
node motion-pro/scripts/render.mjs --spec motion.json --project ./projeto --out ./saida --still 45
```

Gere e teste o JSX do After Effects:

```bash
node motion-pro/scripts/spec_to_jsx.mjs --spec motion.json --out ./saida/ae --prerender ./saida/ae/prerender
node motion-pro/scripts/test_jsx.mjs ./saida/ae/<slug>.jsx --spec motion.json
```

No After Effects, abra **File > Scripts > Run Script File** e selecione o `.jsx`. Mantenha a pasta `ae/` inteira junta.

## Limites

- A skill não copia marcas, logos, mascotes, slogans ou fontes proprietárias. Um pedido "igual ao anúncio X" vira uma peça original com os mesmos princípios.
- Logo, trilha, imagens e vídeos de referência vêm do usuário como anexo. A skill não baixa arquivos da internet.
- A skill usa somente as fontes de `references/fontes.md` ou fontes enviadas pelo usuário.
- Camadas `custom` (Three.js, partículas) entram no After Effects como vídeo com transparência. Essas camadas não ficam editáveis.
