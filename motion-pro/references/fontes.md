# Fontes aprovadas

Use só fontes desta lista. Todas são do Google Fonts: renderizam aqui (pacotes `@fontsource` do npm) e o usuário instala de graça para abrir o JSX no After Effects.

Na spec, cada fonte tem `family` (nome exato abaixo), `weight` (número) e `pkg` (pacote `@fontsource`). O script de render instala o pacote e avisa se o peso não existir.

Nomes de estilo no After Effects por peso: 100 Thin, 200 ExtraLight, 300 Light, 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold, 900 Black.

## Por família de estilo

| Família de estilo | 1ª escolha | Alternativas |
|---|---|---|
| Premium minimal | Inter Tight | Geist, Manrope, Instrument Sans |
| Pop vibrante | Unbounded | Bricolage Grotesque, Syne, Archivo Black |
| Calor e celebração | Figtree | Fraunces, Nunito |
| Atitude | Anton | Barlow Condensed, Oswald |
| Tech lúdico | Space Grotesk | Sora, Outfit, Plus Jakarta Sans |
| Corporativo refinado | Schibsted Grotesk | Instrument Sans, IBM Plex Sans, Newsreader (serif) |

## Lista completa

| family | pkg | Pesos | Caráter |
|---|---|---|---|
| Inter Tight | inter-tight | 100–900 | neutra e compacta, ótima em display grande |
| Geist | geist | 100–900 | tech moderna, limpa |
| Manrope | manrope | 200–800 | tech amigável |
| Instrument Sans | instrument-sans | 400–700 | grotesca elegante |
| Instrument Serif | instrument-serif | 400 (e itálico) | serif editorial fina, ótima em títulos |
| Unbounded | unbounded | 200–900 | larga e lúdica, display de impacto |
| Bricolage Grotesque | bricolage-grotesque | 200–800 | grotesca com personalidade, editorial |
| Syne | syne | 400–800 | artística, larguras variadas |
| Archivo Black | archivo-black | 400 | pesada e larga, só títulos |
| Archivo | archivo | 100–900 | grotesca robusta |
| Figtree | figtree | 300–900 | geométrica calorosa |
| Fraunces | fraunces | 100–900 | serif suave e expressiva |
| Nunito | nunito | 200–900 | arredondada, amigável |
| Anton | anton | 400 | condensada de impacto, caixa alta |
| Barlow Condensed | barlow-condensed | 100–900 | condensada versátil, esportiva |
| Oswald | oswald | 200–700 | condensada clássica |
| Space Grotesk | space-grotesk | 300–700 | tech com detalhes peculiares |
| Sora | sora | 100–800 | geométrica tech |
| Outfit | outfit | 100–900 | geométrica limpa |
| Plus Jakarta Sans | plus-jakarta-sans | 200–800 | moderna de startup |
| Schibsted Grotesk | schibsted-grotesk | 400–900 | grotesca editorial sóbria |
| IBM Plex Sans | ibm-plex-sans | 100–700 | corporativa técnica |
| Newsreader | newsreader | 200–800 | serif de leitura, institucional |
| JetBrains Mono | jetbrains-mono | 100–800 | mono para dados e código |

## Regras

- Evite Inter, Montserrat, Poppins, Bebas Neue e Roboto como 1ª escolha: são as fontes mais associadas a templates.
- Combine no máximo 2 famílias. Pares que funcionam: Instrument Serif + Inter Tight; Fraunces + Figtree; Anton + Barlow Condensed; Unbounded + Space Grotesk.
- Se o usuário enviar fontes da marca (arquivos .ttf ou .otf), use-as: coloque o arquivo em `assets/` e declare na spec com `file` em vez de `pkg`.
