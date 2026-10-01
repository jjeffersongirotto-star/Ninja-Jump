# Ninja-Jump
Game para passar o tempo.

Arraste o dedo para criar um elástico: quanto menor a linha, mais alto o salto. Suba o máximo
que puder desviando dos obstáculos, junte moedas e libere novos personagens.

## Jogar
Abra o arquivo **`NinjaJump.html`** no navegador (de preferência o Chrome no celular).
É um arquivo único, sem dependências: dá para mandar pelo WhatsApp ou publicar no GitHub Pages.

## Estrutura do código
O `NinjaJump.html` é **gerado** — não edite ele diretamente. O código fica em `src/`:

```
src/
  index.html             estrutura da página e das telas (menu, personagens, opções, pausa)
  style.css              visual do menu, HUD e botões
  boot.js                aviso de erro amigável quando o jogo não consegue iniciar
  js/
    config/              números de ajuste do jogo
      physics.js           gravidade, força do elástico, super pulo
      hazards.js           obstáculos e progressão de dificuldade
      atmosphere.js        cenários por altura (Colinas, Crepúsculo, Espaço...)
      skins.js             personagens (cores e preços)
    core/                utilidades: compatibilidade, áudio, cores, estado, armazenamento
    world/               lógica do jogo: elástico, obstáculos, colisões, update por frame
    render/              desenho: cenário, ninja, obstáculos, moedas, loop de frames
    ui/                  HUD, telas do menu, loja de personagens, pausa, botões
    input/               toque, ponteiro e mouse
    main.js              inicialização
```

Os arquivos de `src/js/` são **pedaços de uma mesma função**, juntados na ordem definida em
`build.js` (`GAME_FILES`): todos enxergam as variáveis e funções uns dos outros. Ao criar um
arquivo novo, inclua ele nessa lista.

## Gerar o jogo
Precisa só do [Node.js](https://nodejs.org) (sem `npm install`):

```
node build.js           # gera o NinjaJump.html
node build.js --watch   # gera de novo a cada alteração em src/
node build.js --check   # confere se o NinjaJump.html está atualizado
```

Sempre rode `node build.js` e faça commit do `NinjaJump.html` junto com as mudanças em `src/`.
O GitHub confere isso automaticamente em cada pull request (workflow **Build check**).
