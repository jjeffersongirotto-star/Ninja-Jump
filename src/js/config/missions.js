// --- Mission characters: unlocked only by playing (no price, cannot be bought) ---
// Every number is here for tuning. scope 'run' = done inside ONE run (the menu shows the best run so far);
// scope 'life' = added up over all runs (saved in the player's stats).
// stat:
//   fall        metres fallen in one drop (from the top of the jump) and then saved by an elastic launch
//   meters      height reached in the run
//   wallKicks   wall kicks in the run
//   coins       coins in the run
//   sameHits    hits in a row on the SAME structure (wall, platform or non-fatal obstacle), with at least one
//               elastic launch between every two hits; a different structure restarts the count at 1;
//               touching the same one again without an elastic in between does not count (and does not reset)
//   ufoKills    UFOs defeated in the run (blue: stomp / hit from above / super jump; red: shield combos)
//   nightRuns   runs that reached MISSION_NIGHT_M metres (lifetime)
//   blueBirds   blue birds defeated (lifetime)
//   totalMeters height of every run added up (lifetime, counted at the end of each run)
// `text` = full requirement (dialog), `card` = short version for the character card.
const MISSION_NIGHT_M = 420; // where the "Noite" scenery starts
const MISSIONS = {
  black: { scope: 'life', stat: 'nightRuns', goal: 10,
    text: 'Chegue à Noite (420 m) em 10 partidas diferentes.', card: 'Chegue à Noite em 10 partidas' },
  red: { scope: 'life', stat: 'blueBirds', goal: 150,
    text: 'Derrote 150 pássaros azuis (pisão, golpe por cima ou super pulo), somando todas as partidas.', card: 'Derrote 150 pássaros azuis' },
  // the camera never scrolls down, so one drop is at most ~60% of the screen (~27 m on a short phone, 40 m at 844 px)
  oniAbismo: { scope: 'run', stat: 'fall', goal: 24, unit: ' m',
    text: 'Despenque 24 m de uma vez só (do alto do pulo) e se salve com um elástico lá embaixo.', card: 'Despenque 24 m e se salve' },
  oniMontanha: { scope: 'run', stat: 'meters', goal: 280, unit: ' m',
    text: 'Atravesse as Montanhas: chegue a 280 m numa partida.', card: 'Chegue a 280 m numa partida' },
  oniVendaval: { scope: 'run', stat: 'wallKicks', goal: 30,
    text: 'Dê 30 chutes na parede numa mesma partida.', card: '30 chutes na parede numa partida' },
  oniFloresta: { scope: 'life', stat: 'totalMeters', goal: 25000, unit: ' m',
    text: 'Escale 25.000 m somando a altura de todas as partidas.', card: 'Escale 25.000 m no total' },
  pirata: { scope: 'run', stat: 'coins', goal: 100,
    text: 'Junte 100 moedas numa única partida.', card: '100 moedas numa partida' },
  samuraiCego: { scope: 'run', stat: 'sameHits', goal: 5,
    text: 'Acerte a MESMA estrutura (parede, plataforma ou obstáculo) 5 vezes seguidas, com um elástico entre cada batida. Bater em outra estrutura recomeça a contagem.',
    card: 'Mesma estrutura 5x seguidas' },
  oniLua: { scope: 'run', stat: 'ufoKills', goal: 1,
    text: 'Derrote um disco voador: o azul com pisão ou golpe por cima, o vermelho com um combo de escudo.', card: 'Derrote um disco voador' }
};
// Attach to the characters: mission characters have no price and are never bought
for (const sk of SKINS) if (MISSIONS[sk.id]) { sk.mission = MISSIONS[sk.id]; sk.price = 0; }
