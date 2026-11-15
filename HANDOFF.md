# Garage for Tesla — passagem de projeto

Estado em 15/11/2026. O código está no GitHub, no repositório **privado** `diogopires21-alt/garage-for-tesla` (ramo `main`). Num chat novo, o Claude liga o repositório à sessão e trabalha a partir dele — já não é preciso anexar o zip.

## O que é

Cartão personalizado para o Home Assistant, gratuito e público (repo no GitHub, instalado pelo **Marketplace** do HA — o antigo HACS). Painel dedicado ao Tesla com:

- carro em 3D realista, fundo na cor da pintura e chão com reflexo (como o dashboard do K.I.T.T.);
- informação em cima do próprio carro (cadeado no tejadilho, frunk, bagageira, porta de carga com potência/tempo);
- fila de atalhos por baixo do carro e menu de controlos à direita;
- design ao estilo Apple, tema claro e escuro, PT e EN;
- o mais plug&play possível: encontra o carro e as entidades sozinho (Tessie, Teslemetry, Tesla Fleet; Tesla Custom por nome).

**Regras do Diogo**
- Conta do GitHub: a pessoal, `diogopires21-alt`. Repositório criado privado a 15/11/2026. Tornar público só com aprovação explícita e depois de mostrar o mockup.
- Alterações vão para o repositório privado depois de testadas; o Diogo vê o mockup antes.
- Perguntas ("dá para…?", "o que achas?") pedem só resposta. Só avançar com ordem explícita ("faz", "avança", "sim").
- Respostas em PT-PT, curtas, diretas, linguagem simples.

## Modelos 3D

| Chave | Carro | Modelo (Sketchfab) | Licença |
|---|---|---|---|
| `model3_highland` | Model 3 (2024+) | "2024 Tesla Model 3" — RBLXSupercars | CC BY 4.0 |
| `model3_classic` | Model 3 (2017–2023) | "Tesla M3 model" — wintrez | CC BY 4.0 |
| `modely_juniper` | Model Y (2025+) | "2025 Tesla Model Y" — BloxBloger | CC BY-NC 4.0 (só uso não comercial; aviso no README, LICENSE e créditos do cartão) |

- Falta um **Model Y 2020–2024** realista. O de tonielpro520 foi recusado (pouco realista); SQUIR3D é Editorial (não serve). Sites sugeridos: Sketchfab (pesquisar "Model Y 2022/2023/Performance"), Poly Haven, BlenderKit (ver licença), Free3D/CGTrader/TurboSquid grátis (só se CC0/CC BY).
- Mais tarde: Model S, Model X, Cybertruck.
- Os modelos novos são preparados com `models/tools/prep.mjs`: rodar (frente = +X, esquerda = −Z), nomes fixos de materiais (Paint, Glass, Tyre, Rim, HeadLight, TailLight, RearLightBar, Seats), separar faróis e bancos, comprimir (meshopt). Os originais estão em `models/src/`.
- Matrícula: o Model 3 2017–2023 vinha com matrícula e suporte (frente e trás); foram tirados a 15/11/2026 com `models/tools/drop.mjs` (materiais White e LicensePlate* + ilhas do suporte em BlackWash com `--suporte BlackWash`). Num modelo novo com matrícula, usar o mesmo.
- Frente do Model 3 2017–2023 (15/11/2026, aprovado): sem a matrícula ficavam à vista 5 separadores verticais brancos e 4 parafusos. Agora a entrada de ar é como no carro real: separadores e parafusos tirados, paredes de dentro a preto e uma grelha nova de 9 riscas horizontais pretas (material `Grille`) que segue a curva do para-choques; o degrau por baixo da grelha fica na cor do carro. Feito com `models/tools/m3classic-front.mjs` (correr depois do `drop.mjs`).
- Cada modelo tem afinações próprias em `MODELS[...].scene` (zonas das portas e capô) em `src/slots.js`.

## Cores (só as que existiram de fábrica)

- **Model 3 2024+:** Branco Pérola, Cinzento Stealth, Quicksilver, Preto Diamante, Preto Sólido, Vermelho Ultra, Azul Profundo, Azul Marinho
- **Model 3 2017–2023:** Branco Pérola, Prateado Meia-Noite, Prateado Metalizado, Preto Sólido, Azul Profundo, Vermelho Multicamada (sem Cinzento Stealth: chegou com o Highland)
- **Model Y 2025+:** Branco Pérola, Cinzento Stealth, Quicksilver, Preto Diamante, Preto Sólido, Vermelho Ultra, Azul Glaciar, Azul Profundo, Azul Marinho, Azul Gelo, Azul Costeiro (algumas só em certos mercados/versões — a confirmar com o Diogo se ficam)
- Tons são aproximados. Não mexer nas cores existentes sem pedido (a tentativa de clarear os pretos no tema claro foi revertida a pedido dele).

## Decisões de design (todas aprovadas)

- Menu flutuante à direita em vidro fosco; no telemóvel vira folha de baixo aberta por um botão "Controlos".
- Cada comando aparece num só sítio: etiquetas no carro (trancar, frunk, bagageira, porta de carga) → atalhos → menu.
- Linhas do menu com interruptor sem legenda "Ligado/Desligado". Temperatura numa só linha com −/+ à direita e sem "Dentro".
- Confirmação com design próprio (não ao estilo iOS) antes de destrancar e abrir frunk/bagageira.
- Pintura brilhante. No tema claro, cores fortes (vermelhos, azuis) têm fundo da própria cor dessaturado (sem ir para rosa).
- Interior branco ou preto (só os bancos mudam).
- Jantes puxadas para dentro até ao nível do pneu.
- **Carregamento:** luz verde por baixo do carro a pulsar, nunca apaga; azul fraco quando só tem o cabo ligado.
- **Sentinela:** luz vermelha oval por baixo da frente, a varrer entre as rodas da frente a velocidade constante com rasto; o verde do carregamento apaga-se nessa zona.
- **Buzina:** anel azul a partir de baixo da frente.
- **Peças abertas:** frunk e cada porta piscam a laranja inteiros; bagageira e porta de carga só com um ponto laranja a piscar e o ícone da etiqueta a laranja; roda com pressão baixa a piscar a laranja.

## Backlog

1. Animação nos bancos quando o aquecimento dos assentos está ligado (ver como fazer).
2. Volante a vermelho quando o aquecimento do volante está ligado.
3. Riscos em "XX" no capô do Highland (não resolvido; não gastar muito tempo nisto).
4. Model Y 2020–2024; mais modelos.
5. Tornar o repositório público e preparar para o Marketplace do HA (rever README, licenças/créditos, retirar ou manter o HANDOFF.md, criar a primeira versão/release). Só com aprovação.

## Mockup

https://claude.ai/artifact/NrwPJH26bn1sJMYCMCK8js (slug `b108df48-32df-42a1-809f-6ad8488d6cf2`). Barra de cima com modelo, tema, cor, interior, carregamento, aviso de pneu, porta aberta e telemóvel. Os .glb vão embutidos em base64 (`mock/car-model*.js`) porque o alojamento não serve .glb. Para republicar: `publish_files` em modo patch com a última versão.

## Como trabalhar com o código (para o Claude)

- Ligar o repositório com `add_repo` (diogopires21-alt/garage-for-tesla), clonar e `npm install`, depois `node build.mjs` (gera `dist/` e `test/harness.bundle.js`).
- Servidor de teste: `python3 -m http.server 8765` na raiz; página `test/index.html?model=...&color=...&theme=dark|light&int=black&chg=charging&door=1&doors=1&frunk=1&trunk=1&port=1&tw=1&peak=1`.
- Capturas: `python3 test/shot.py "<query>" saida.png 1400 820` (Playwright + Chrome com swiftshader; lento, até ~1 s por frame).
- `mock/` = cópia de `dist/garage-for-tesla-card.js` + `test/harness.bundle.js` + `car-model*.js`.
- Ficheiros: `src/card.js` (cartão), `src/scene.js` (3D), `src/slots.js` (entidades, modelos, cores), `src/styles.js`, `src/i18n.js`, `src/editor.js`. `ref/` (código das integrações Tessie/Teslemetry/Tesla Fleet, só para consulta) não vai para o GitHub (está no .gitignore); se for preciso, está no último zip.
- Cuidado: comentários `//` acrescentados a meio de uma linha já engoliram código três vezes. Comentar só no fim da linha.
- Shaders próprios precisam dos includes `logdepthbuf` (o renderer usa `logarithmicDepthBuffer`).
