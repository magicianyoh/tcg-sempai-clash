import { CardData, CardEffect, CardRequirement, CardType, EffectType } from '@tcg/shared/types';
import { ARCHETYPES } from '@tcg/shared/constants';

type Target = 'SELF' | 'OPPONENT';
type Strategy = 'aggro' | 'engine' | 'team' | 'control' | 'defense';
type Pace = 'fast' | 'mid' | 'slow';
type Named = [slug: string, name: string, description: string];
type Hero = {
    slug: string;
    name: string;
    description: string;
    strategy: Strategy;
    pace: Pace;
    support: Named;
    item: Named;
    final: string;
    events: Named[];
};
type Plan = {
    id: string;
    prefix: string;
    theme: string;
    sharedCharacters: Named[];
    sharedItems: Named[];
    locations: Named[];
    heroes: Hero[];
};

export const CARDS: Record<string, CardData> = {};

const plans: Plan[] = [
    {
        id: ARCHETYPES.SHONEN, prefix: 'shonen', theme: 'duelos, entrenamiento y amistad',
        sharedCharacters: [
            ['rival-swordsman', 'Rival Swordsman', 'Presiona al heroe a pelear mejor.'],
            ['old-master', 'Old Master', 'Convierte derrotas en tecnica.'],
            ['team-medic', 'Team Medic', 'Mantiene al grupo en pie.'],
        ],
        sharedItems: [
            ['training-weights', 'Training Weights', 'Pesas para acelerar el crecimiento.'],
            ['spirit-headband', 'Spirit Headband', 'Recuerda la promesa del equipo.'],
            ['secret-scroll', 'Secret Scroll', 'Tecnica guardada para el momento critico.'],
        ],
        locations: [
            ['family-dojo', 'Family Dojo', 'El origen de la disciplina.'],
            ['tournament-ring', 'Tournament Ring', 'La rivalidad se vuelve publica.'],
            ['city-rooftop', 'City Rooftop', 'Reuniones antes de la pelea final.'],
        ],
        heroes: [
            { slug: 'dragon-ryu', name: 'Ryu Dragon Flame', strategy: 'aggro', pace: 'fast', description: 'Ataca antes de pensar y convierte cada golpe en Story.', support: ['spark-kaito', 'Spark Kaito', 'Mejor amigo que cubre la espalda de Ryu.'], item: ['dragon-gauntlet', 'Dragon Gauntlet', 'Canaliza golpes explosivos.'], final: 'Dragon Comet Finish', events: [['street-challenge', 'Street Challenge', 'Ryu acepta pelear por orgullo.'], ['rival-ignition', 'Rival Ignition', 'La rivalidad enciende la arena.'], ['flame-breakthrough', 'Flame Breakthrough', 'El poder se desborda.'], ['citywide-showdown', 'Citywide Showdown', 'La pelea decide el arco entero.']] },
            { slug: 'kenji-discipline', name: 'Kenji of the Thousand Forms', strategy: 'engine', pace: 'mid', description: 'Gana por curva estable, robo y eventos de entrenamiento.', support: ['scribe-mika', 'Scribe Mika', 'Anota cada postura y corrige errores.'], item: ['iron-prayer-beads', 'Iron Prayer Beads', 'Pesan como una promesa.'], final: 'Thousand Form Kata', events: [['dawn-repetition', 'Dawn Repetition', 'Entrena antes del sol.'], ['master-trial', 'Master Trial', 'El maestro exige precision.'], ['broken-stance', 'Broken Stance Lesson', 'Aprende perdiendo.'], ['perfect-guard', 'Perfect Guard', 'La defensa se vuelve ofensiva.'], ['temple-tournament', 'Temple Tournament', 'La disciplina enfrenta al talento.']] },
            { slug: 'hiro-nakama', name: 'Hiro Nakama Captain', strategy: 'team', pace: 'slow', description: 'Escala con aliados y efectos positivos por afinidad.', support: ['mascot-poko', 'Mascot Poko', 'Un companero pequeno que une al equipo.'], item: ['team-banner', 'Team Banner', 'Simbolo de promesa colectiva.'], final: 'Nakama Constellation', events: [['first-promise', 'First Promise', 'El equipo jura no separarse.'], ['rescue-rookie', 'Rescue the Rookie', 'Hiro salva antes que ganar.'], ['shared-camp', 'Shared Training Camp', 'Cada aliado cubre una debilidad.'], ['team-reunion', 'Broken Team Reunion', 'El grupo vuelve tras la derrota.'], ['all-out-friendship', 'All-Out Friendship', 'Todos atacan al mismo tiempo.'], ['final-cheer', 'Final Cheer', 'La amistad sostiene el ultimo golpe.']] },
        ],
    },
    {
        id: ARCHETYPES.MECHA, prefix: 'mecha', theme: 'pilotos, sincronizacion y guerra orbital',
        sharedCharacters: [['chief-mechanic', 'Chief Mechanic Sora', 'Mantiene el chasis en marcha.'], ['bridge-operator', 'Bridge Operator Nao', 'Filtra telemetria critica.'], ['stern-commander', 'Stern Commander Vale', 'Ordena avanzar aunque duela.']],
        sharedItems: [['beam-rifle', 'Beam Rifle', 'Solucion directa contra blindajes.'], ['plug-suit', 'Plug Suit', 'Mejora sincronizacion neural.'], ['energy-battery', 'Energy Battery', 'Reserva para turnos largos.']],
        locations: [['launch-bay', 'Launch Bay Seven', 'Salida de emergencia al frente.'], ['underground-base', 'Underground Base', 'Refugio y sala de mando.'], ['orbital-front', 'Orbital Front', 'La guerra sale de la atmosfera.']],
        heroes: [
            { slug: 'ace-hiro', name: 'Ace Pilot Hiro', strategy: 'aggro', pace: 'fast', description: 'Piloto de asalto que gana por tempo y dano temprano.', support: ['wingmate-juno', 'Wingmate Juno', 'Cubre los flancos de Hiro.'], item: ['overdrive-thrusters', 'Overdrive Thrusters', 'Permiten entrar y salir antes del rival.'], final: 'Meteor Lance Charge', events: [['emergency-launch', 'Emergency Launch', 'Hiro despega sin esperar permiso.'], ['aerial-dogfight', 'Aerial Dogfight', 'El mecha domina el cielo cercano.'], ['midseason-overdrive', 'Mid-Season Overdrive', 'El motor rojo supera sus limites.'], ['orbital-spearhead', 'Orbital Spearhead', 'Hiro abre camino a la flota.']] },
            { slug: 'rei-sync', name: 'Rei Sync Oracle', strategy: 'engine', pace: 'mid', description: 'Piloto de sincronizacion perfecta, roba y prepara upgrades.', support: ['sync-engineer-mira', 'Sync Engineer Mira', 'Ajusta el nucleo neural.'], item: ['neural-key', 'Neural Key', 'Desbloquea capas de control.'], final: 'Silent Singularity', events: [['calibration-silence', 'Calibration Silence', 'Rei escucha la maquina respirar.'], ['ghost-signal', 'Ghost Signal', 'Un eco adelanta el ataque enemigo.'], ['perfect-sync', 'Perfect Sync', 'Piloto y mecha actuan como uno.'], ['core-upgrade', 'Core Upgrade', 'La unidad despierta una funcion oculta.'], ['white-horizon', 'White Horizon', 'La batalla se vuelve lectura de datos.']] },
            { slug: 'shinji-unit', name: 'Shinji Reluctant Unit', strategy: 'control', pace: 'slow', description: 'No quiere pilotar; gana controlando crisis y estados mentales.', support: ['blue-guardian', 'Blue Guardian Rei', 'Presencia calma en la cabina.'], item: ['sdat-player', 'S-DAT Player', 'Aisla el ruido del campo.'], final: 'Instrumentality Refusal', events: [['get-in-robot', 'Get in the Robot', 'La orden que inicia el trauma.'], ['enemy-ambush', 'Enemy Ambush', 'La unidad queda sin escapatoria.'], ['berserk-mode', 'Berserk Mode', 'El piloto pierde el control.'], ['mirror-self', 'Mirror of the Self', 'La batalla se vuelve introspectiva.'], ['human-instrumentality', 'Human Instrumentality', 'Todas las voces se mezclan en una.'], ['choose-world', 'I Choose the World', 'Shinji rechaza desaparecer.']] },
        ],
    },
    {
        id: ARCHETYPES.HAREM_INVERSO, prefix: 'otome', theme: 'corte, romance politico y banderas de destino',
        sharedCharacters: [['crown-prince', 'Crown Prince Lian', 'Encanto oficial y problemas publicos.'], ['duke-heir', 'Duke Heir Rowan', 'Aliado frio con recursos.'], ['court-wizard', 'Court Wizard Noel', 'Lee magia y mentiras.']],
        sharedItems: [['sealed-letter', 'Sealed Letter', 'Invitacion o amenaza.'], ['silk-dress', 'Silk Dress', 'Etiqueta que cambia escenas.'], ['tea-set', 'Tea Set', 'Politica servida en porcelana.']],
        locations: [['rose-garden', 'Rose Garden', 'Confesiones y emboscadas sociales.'], ['academy-hall', 'Academy Hall', 'Todos miran y juzgan.'], ['royal-ballroom', 'Royal Ballroom', 'El baile decide reputaciones.']],
        heroes: [
            { slug: 'plain-heroine', name: 'Plain Heroine Mira', strategy: 'team', pace: 'mid', description: 'Gana por afinidades romanticas y apoyos de corte.', support: ['loyal-maid', 'Loyal Maid Rina', 'Sabe quien miente en palacio.'], item: ['pressed-flower', 'Pressed Flower Bookmark', 'Recuerdo de una promesa sencilla.'], final: 'True Heart Ending', events: [['corner-collision', 'Corner Collision', 'Un encuentro accidental cambia la ruta.'], ['tea-politics', 'Tea Party Politics', 'La heroina sobrevive al rumor.'], ['first-dance', 'First Dance', 'El publico nota una eleccion.'], ['garden-rescue', 'Garden Rescue', 'Un aliado rompe el protocolo.'], ['chosen-route', 'Chosen Route', 'Mira decide su propio final.']] },
            { slug: 'doom-villainess', name: 'Villainess Reborn Selene', strategy: 'control', pace: 'slow', description: 'Evita condenas bloqueando eventos y manipulando reputacion.', support: ['shadow-butler', 'Shadow Butler Klaus', 'Oculta pruebas antes del juicio.'], item: ['doom-diary', 'Doom Flag Diary', 'Lista de muertes evitables.'], final: 'Condemnation Reversed', events: [['bad-end-memory', 'Memory of the Bad End', 'Selene recuerda su condena.'], ['apology-strategy', 'Apology Strategy', 'Una disculpa cambia el tablero.'], ['rival-confrontation', 'Rival Confrontation', 'La antigua heroina desafia su ruta.'], ['evidence-swap', 'Evidence Swap', 'Las pruebas pasan a otras manos.'], ['public-condemnation', 'Public Condemnation', 'El juicio llega demasiado pronto.'], ['doom-flag-broken', 'Doom Flag Broken', 'La villana escapa del guion.']] },
            { slug: 'saintess-aria', name: 'Saintess Aria', strategy: 'engine', pace: 'mid', description: 'Acumula recursos sagrados y protege aliados clave.', support: ['holy-knight', 'Holy Knight Ciel', 'Escudo jurado de la santa.'], item: ['silver-relic', 'Silver Relic', 'Amplifica plegarias antiguas.'], final: 'Saintly Benediction', events: [['temple-awakening', 'Temple Awakening', 'La luz responde por primera vez.'], ['healing-procession', 'Healing Procession', 'La santa gana apoyo popular.'], ['magic-exams', 'Magic Exams', 'El poder sagrado es medido.'], ['dungeon-rescue', 'Dungeon Rescue', 'La fe entra al peligro.'], ['miracle-dawn', 'Miracle at Dawn', 'El reino presencia una prueba imposible.']] },
        ],
    },
    {
        id: ARCHETYPES.SLICE_OF_LIFE, prefix: 'slice', theme: 'clubes, escuela y pequenos momentos decisivos',
        sharedCharacters: [['class-friend', 'Class Friend Yui', 'Convierte silencio en conversacion.'], ['club-treasurer', 'Club Treasurer Mako', 'Hace que el plan sea posible.'], ['stray-cat', 'Stray Cat Mochi', 'Aparece cuando falta calma.']],
        sharedItems: [['lunch-box', 'Lunch Box', 'Comida compartida, escena ganada.'], ['club-notebook', 'Club Notebook', 'Registra objetivos diarios.'], ['festival-flyer', 'Festival Flyer', 'Promete un evento mayor.']],
        locations: [['council-room', 'Council Room', 'Donde se arregla lo practico.'], ['music-room', 'Music Room', 'Ensayos, dudas y ruido.'], ['school-roof', 'School Roof', 'Lugar de confesiones tranquilas.']],
        heroes: [
            { slug: 'president-aoi', name: 'President Aoi', strategy: 'engine', pace: 'mid', description: 'Organiza la partida con robo y locaciones eficientes.', support: ['vice-president-ren', 'Vice President Ren', 'Ejecuta planes antes del recreo.'], item: ['agenda-stamp', 'Agenda Stamp', 'Marca tareas como completadas.'], final: 'Perfect Festival Schedule', events: [['council-meeting', 'First Council Meeting', 'Aoi toma control del calendario.'], ['budget-crisis', 'Budget Crisis', 'El club necesita recursos.'], ['midterm-balance', 'Midterm Balance', 'Estudiar tambien es una batalla.'], ['festival-logistics', 'Festival Logistics', 'Todo depende de la agenda.'], ['graduation-address', 'Graduation Address', 'La presidenta cierra el ano.']] },
            { slug: 'loner-niko', name: 'Cynical Loner Niko', strategy: 'control', pace: 'slow', description: 'Reduce Filler y bloquea caos social hasta abrirse al grupo.', support: ['quiet-neighbor', 'Quiet Neighbor Sumi', 'Se sienta al lado sin exigir palabras.'], item: ['observation-journal', 'Observation Journal', 'Cada gesto queda anotado.'], final: 'After-School Smile', events: [['window-monologue', 'Window Seat Monologue', 'Niko observa desde lejos.'], ['forced-club', 'Forced Club Visit', 'La rutina se rompe.'], ['rainy-errand', 'Rainy Day Errand', 'Ayudar no estaba planeado.'], ['christmas-detour', 'Christmas Eve Detour', 'El aislamiento pierde fuerza.'], ['kyoto-talk', 'Kyoto Honest Talk', 'El viaje obliga a hablar.'], ['group-photo', 'First Real Group Photo', 'Niko acepta quedarse.']] },
            { slug: 'guitar-hana', name: 'Guitarist Hana', strategy: 'team', pace: 'fast', description: 'Reune banda rapido y gana por eventos de concierto.', support: ['drummer-riko', 'Drummer Riko', 'Mantiene el pulso del grupo.'], item: ['sticker-guitar', 'Sticker Guitar', 'Una guitarra comun con identidad propia.'], final: 'First Live Encore', events: [['borrowed-chord', 'Borrowed Chord', 'Hana aprende su primer riff publico.'], ['recruit-drummer', 'Recruit the Drummer', 'La banda deja de ser fantasia.'], ['practice-noise', 'Practice Room Noise', 'El ensayo molesta a todos.'], ['school-concert', 'School Concert', 'El escenario escolar espera.']] },
        ],
    },
    {
        id: ARCHETYPES.SHOJO, prefix: 'shojo', theme: 'romance, magia y emociones visibles',
        sharedCharacters: [['best-friend', 'Best Friend Emi', 'Lee el corazon antes que la protagonista.'], ['mysterious-senpai', 'Mysterious Senpai', 'Aparece cuando todo se complica.'], ['class-rival', 'Class Rival Rika', 'Competencia romantica y emocional.']],
        sharedItems: [['ribbon-charm', 'Ribbon Charm', 'Amuleto que guarda promesas.'], ['love-letter', 'Love Letter', 'Una carta que nunca queda quieta.'], ['star-compact', 'Star Compact', 'Brilla cuando se dice la verdad.']],
        locations: [['school-gate', 'School Gate', 'Llegadas tarde y encuentros clave.'], ['planetarium', 'Planetarium', 'Confesiones bajo estrellas falsas.'], ['shrine-steps', 'Shrine Steps', 'Deseos atados a cintas.']],
        heroes: [
            { slug: 'card-mage-luna', name: 'Card Mage Luna', strategy: 'engine', pace: 'mid', description: 'Captura cartas magicas y gana por recursos encadenados.', support: ['seal-familiar', 'Seal Familiar Pipi', 'Detecta magia perdida.'], item: ['capture-wand', 'Capture Wand', 'Cierra cartas antes de que huyan.'], final: 'Eternal Card Bloom', events: [['first-transform', 'First Transformation', 'El uniforme magico aparece.'], ['runaway-card', 'Runaway Card', 'La magia desordena la escuela.'], ['moonlit-capture', 'Moonlit Capture', 'Luna aprende a sellar.'], ['identity-reveal', 'Identity Reveal', 'El secreto casi se rompe.'], ['eternal-power', 'Eternal Power', 'El mazo magico reconoce a Luna.']] },
            { slug: 'diary-mio', name: 'Ordinary Diary Mio', strategy: 'team', pace: 'fast', description: 'Romance directo con aliados y escenas de confesion.', support: ['wingwoman-saki', 'Wingwoman Saki', 'Empuja a Mio a hablar.'], item: ['heart-diary', 'Heart Diary', 'Donde se escriben frases imposibles.'], final: 'Confession After Rain', events: [['fated-encounter', 'Fated Encounter', 'Un paraguas cambia el dia.'], ['first-date', 'First Date', 'La cita sale casi bien.'], ['friend-betrayal', 'Friend Betrayal', 'El triangulo duele.'], ['noble-sacrifice', 'Noble Sacrifice', 'Mio elige cuidar antes de ganar.']] },
            { slug: 'lost-princess-sera', name: 'Lost Princess Sera', strategy: 'control', pace: 'slow', description: 'Revela linaje, bloquea amenazas y protege el destino.', support: ['royal-guard', 'Royal Guard Toma', 'Recuerda un juramento perdido.'], item: ['moon-tiara', 'Moon Tiara', 'Prueba de sangre real.'], final: 'Silver Kingdom Return', events: [['palace-dream', 'Dream of the Palace', 'Sera ve una vida que no recuerda.'], ['hidden-crest', 'Hidden Crest', 'El simbolo real aparece.'], ['masquerade-threat', 'Masquerade Threat', 'La corte intenta silenciarla.'], ['identity-reveal', 'Identity Reveal', 'La princesa acepta su nombre.'], ['moonlit-coronation', 'Moonlit Coronation', 'El reino vuelve a tener voz.'], ['silver-oath', 'Silver Oath', 'Sera decide gobernar distinto.']] },
        ],
    },
    {
        id: ARCHETYPES.HAREM, prefix: 'harem', theme: 'comedia romantica, caos social y eleccion final',
        sharedCharacters: [['childhood-friend', 'Childhood Friend Nana', 'Conoce todos los defectos del protagonista.'], ['student-idol', 'Student Idol Kira', 'Convierte todo en espectaculo.'], ['sharp-senpai', 'Sharp-Tongue Senpai', 'Corta escenas demasiado comodas.']],
        sharedItems: [['club-key', 'Club Key', 'Abre habitaciones comprometedoras.'], ['festival-ticket', 'Festival Ticket', 'Siempre hay alguien de mas.'], ['study-notes', 'Study Notes', 'Excusa para juntarse.']],
        locations: [['club-room', 'Club Room', 'Centro del desorden romantico.'], ['shopping-arcade', 'Shopping Arcade', 'Citas que se cruzan.'], ['summer-beach', 'Summer Beach', 'Donde el Filler amenaza.']],
        heroes: [
            { slug: 'average-yu', name: 'Average Yu', strategy: 'team', pace: 'fast', description: 'Se tropieza en problemas y gana con afinidades rapidas.', support: ['chaos-neighbor', 'Chaos Neighbor Momo', 'Aparece en la peor puerta.'], item: ['lucky-charm', 'Lucky Charm', 'La suerte explica demasiado.'], final: 'Honest Choice', events: [['lucky-fall', 'Lucky Pervert Fall', 'La escena que nadie puede explicar.'], ['date-clash', 'Weekend Date Clash', 'Dos planes, una tarde.'], ['valentine-panic', 'Valentine Panic', 'Demasiado chocolate.'], ['true-answer', 'One True Answer', 'Yu deja de huir.']] },
            { slug: 'transfer-ren', name: 'Transfer Student Ren', strategy: 'aggro', pace: 'mid', description: 'Nuevo en clase, acelera drama y presion social.', support: ['mystery-roommate', 'Mystery Roommate Aki', 'Sabe secretos que no deberia.'], item: ['transfer-form', 'Transfer Form', 'Papel que reordena la clase.'], final: 'New Seat Promise', events: [['new-student', 'New Student Arrives', 'Ren entra cuando todo estaba estable.'], ['rumor-burst', 'Rumor Burst', 'La escuela inventa versiones.'], ['beach-war', 'Beach Volleyball War', 'Competencia con tension.'], ['jealousy-storm', 'Jealousy Storm', 'El aula se parte en bandos.'], ['after-class-truth', 'After-Class Truth', 'Ren explica por que llego.']] },
            { slug: 'manager-taku', name: 'Club Manager Taku', strategy: 'engine', pace: 'slow', description: 'Gana ordenando recursos, horarios y escenas de grupo.', support: ['schedule-queen', 'Schedule Queen Hina', 'Nadie llega tarde con ella cerca.'], item: ['shared-calendar', 'Shared Calendar', 'Todas las rutas en una pagina.'], final: 'Festival Fireworks Choice', events: [['club-recruitment', 'Club Recruitment', 'Taku necesita miembros.'], ['study-spiral', 'Study Group Spiral', 'Estudiar se vuelve confesion.'], ['budget-committee', 'Budget Committee', 'El romance requiere fondos.'], ['fireworks-festival', 'Fireworks Festival', 'La agenda apunta al cielo.'], ['last-meeting', 'Last Club Meeting', 'La eleccion no puede postergarse.'], ['one-route', 'One Route Saved', 'Taku cierra el calendario.']] },
        ],
    },
    {
        id: ARCHETYPES.ISEKAI, prefix: 'isekai', theme: 'otro mundo, habilidades raras y construccion de destino',
        sharedCharacters: [['guild-clerk', 'Guild Clerk Mina', 'Traduce misiones y deudas.'], ['dragon-ally', 'Ancient Dragon Rook', 'Aliado demasiado grande.'], ['merchant-lio', 'Merchant Lio', 'Convierte botin en plan.']],
        sharedItems: [['world-map', 'World Map', 'No esta completo, pero ayuda.'], ['mana-potion', 'Mana Potion', 'Recurso simple, turno complejo.'], ['starter-sword', 'Starter Sword', 'Arma comun con destino raro.']],
        locations: [['starter-village', 'Starter Village', 'Lugar que siempre se salva primero.'], ['dungeon-core', 'Dungeon Core', 'La aventura baja bajo tierra.'], ['demon-border', 'Demon Border', 'La guerra espera al otro lado.']],
        heroes: [
            { slug: 'cheat-hero', name: 'Cheat Hero Kai', strategy: 'aggro', pace: 'fast', description: 'Abusa de poder temprano y cierra antes de estabilizar.', support: ['spell-tutor', 'Spell Tutor Fia', 'Ensena reglas que Kai rompe.'], item: ['cheat-window', 'Cheat Window', 'Interfaz que no deberia existir.'], final: 'Demon Lord Speedrun', events: [['hero-summoning', 'Hero Summoning', 'Kai cae con stats injustos.'], ['cheat-unlock', 'Cheat Skill Unlock', 'El sistema se rinde.'], ['quest-skip', 'First Quest Skip', 'La mision termina rapido.'], ['war-breaker', 'Kingdom War Breaker', 'Kai rompe la linea enemiga.']] },
            { slug: 'slime-founder', name: 'Slime Founder Rimu', strategy: 'engine', pace: 'slow', description: 'Construye nacion con robo, locaciones y aliados.', support: ['goblin-minister', 'Goblin Minister Garo', 'Hace gobierno de improvisacion.'], item: ['nation-charter', 'Nation Charter', 'Primer documento del nuevo pais.'], final: 'Monster Nation Summit', events: [['cave-rebirth', 'Cave Rebirth', 'Rimu despierta sin forma humana.'], ['name-tribe', 'Name the Tribe', 'Nombrar aliados crea deberes.'], ['dungeon-alliance', 'Dungeon Alliance', 'Los monstruos negocian.'], ['harvest-feast', 'Harvest Feast', 'La ciudad celebra prosperidad.'], ['world-secret', 'Secret of the World', 'El origen del sistema aparece.'], ['one-banner', 'Nation Under One Banner', 'El pueblo monstruo se reconoce.']] },
            { slug: 'farming-villainess', name: 'Farming Villainess Ema', strategy: 'control', pace: 'mid', description: 'Evita la mala ruta cultivando recursos y apagando guerras.', support: ['field-knight', 'Field Knight Orin', 'Protege graneros y secretos.'], item: ['rice-ledger', 'Rice Ledger', 'Produccion contra destino tragico.'], final: 'Harvest Route Ending', events: [['bad-end-memory', 'Bad End Memory', 'Ema recuerda el futuro fatal.'], ['rice-field', 'First Rice Field', 'La granja reemplaza al duelo.'], ['tax-fight', 'Noble Tax Fight', 'La economia se vuelve batalla.'], ['peace-feast', 'Peace Feast', 'Comer juntos evita guerra.'], ['secret-revealed', 'Secret Revealed', 'La villana explica su plan.']] },
        ],
    },
    {
        id: ARCHETYPES.SURVIVAL_GAME, prefix: 'survival', theme: 'juegos mortales, recursos escasos y traiciones',
        sharedCharacters: [['hacker-kid', 'Hacker Kid Zero', 'Abre puertas y sospechas.'], ['ex-soldier', 'Ex-Soldier Mara', 'Sabe sobrevivir sin hablar mucho.'], ['field-medic', 'Field Medic Iko', 'Compra un turno mas.']],
        sharedItems: [['survival-knife', 'Survival Knife', 'Herramienta o amenaza.'], ['kevlar-vest', 'Kevlar Vest', 'Reduce consecuencias.'], ['ration-pack', 'Ration Pack', 'Comida para otra escena.']],
        locations: [['abandoned-school', 'Abandoned School', 'Reglas en pizarras rotas.'], ['safe-room', 'Safe Room', 'Nada seguro dura mucho.'], ['death-arena', 'Death Arena', 'Donde el juego muestra dientes.']],
        heroes: [
            { slug: 'smiling-hunter', name: 'Smiling Hunter Rei', strategy: 'aggro', pace: 'fast', description: 'Disfruta la presion y gana por Filler rival.', support: ['trap-maker', 'Trap Maker Jin', 'Rie cuando algo hace click.'], item: ['red-wire', 'Red Wire', 'La decision incorrecta explota.'], final: 'Last Laugh Duel', events: [['game-start', 'Game Start', 'Rei entiende las reglas rapido.'], ['supply-raid', 'Supply Drop Raid', 'Toma recursos por fuerza.'], ['trap-triggered', 'Trap Triggered', 'El rival pisa el error.'], ['duel', 'One-on-One Duel', 'Rei fuerza una escena cerrada.']] },
            { slug: 'lucky-runner', name: 'Lucky Runner Yuto', strategy: 'defense', pace: 'slow', description: 'Sobrevive limpiando Filler y robando salidas.', support: ['protector-ami', 'Protector Ami', 'Empuja a Yuto fuera del peligro.'], item: ['bent-coin', 'Bent Coin', 'La suerte tiene peso.'], final: 'Exit Door Miracle', events: [['morning-broadcast', 'Morning Broadcast', 'Yuto escucha nombres caer.'], ['temporary-alliance', 'Temporary Alliance', 'Sobrevivir requiere confiar mal.'], ['narrow-escape', 'Narrow Escape', 'La puerta cierra tarde.'], ['heroic-sacrifice', 'Heroic Sacrifice', 'Alguien compra tiempo.'], ['last-safe-room', 'Last Safe Room', 'La salida aparece sin plan.']] },
            { slug: 'rebel-medic', name: 'Rebel Medic Sayo', strategy: 'control', pace: 'mid', description: 'Rompe el juego desde dentro y descarta amenazas.', support: ['signal-runner', 'Signal Runner Toma', 'Lleva mensajes sin ser visto.'], item: ['blackout-kit', 'Blackout Kit', 'Apaga camaras y rutas.'], final: 'Broadcast the Truth', events: [['patch-wounded', 'Patch the Wounded', 'Sayo cura al rival.'], ['hidden-rulebook', 'Hidden Rulebook', 'Las reglas tienen huecos.'], ['night-ambush', 'Night Ambush', 'Intentan callarla.'], ['control-room', 'Control Room Break-In', 'El tablero se ve desde arriba.'], ['signal-hijack', 'Signal Hijack', 'Todos oyen la verdad.']] },
        ],
    },
    {
        id: ARCHETYPES.SPOKON, prefix: 'spokon', theme: 'deporte, entrenamiento y remontadas',
        sharedCharacters: [['demon-coach', 'Demon Coach Genda', 'Hace correr hasta que aparece Story.'], ['team-manager', 'Team Manager Nao', 'Sostiene al equipo fuera de camara.'], ['veteran-senpai', 'Veteran Senpai Kuro', 'Ensenanza por mirada dura.']],
        sharedItems: [['worn-shoes', 'Worn Shoes', 'Kilometros de promesa.'], ['team-uniform', 'Team Uniform', 'Pertenecer tambien es poder.'], ['ice-spray', 'Ice Spray', 'Otro turno para seguir.']],
        locations: [['old-gym', 'Old Gym', 'El piso cruje como recuerdo.'], ['training-camp', 'Training Camp Field', 'Verano, sudor y curry.'], ['national-stadium', 'National Stadium', 'El sueno tiene luces grandes.']],
        heroes: [
            { slug: 'iron-rookie', name: 'Iron Rookie Daichi', strategy: 'engine', pace: 'mid', description: 'Entrena, roba y convierte esfuerzo en curva estable.', support: ['timer-mika', 'Timer Mika', 'Cuenta repeticiones sin piedad.'], item: ['weighted-anklets', 'Weighted Anklets', 'Duelen para que el salto importe.'], final: 'Ten Thousandth Shot', events: [['first-practice', 'First Practice', 'Daichi falla frente a todos.'], ['camp-grind', 'Training Camp Grind', 'La repeticion se vuelve identidad.'], ['sudden-injury', 'Sudden Injury', 'El cuerpo cobra deuda.'], ['overtime-legs', 'Overtime Legs', 'Daichi sigue cuando nadie puede.'], ['qualifier', 'Nationals Qualifier', 'El esfuerzo se mide en marcador.']] },
            { slug: 'team-heart', name: 'Team Heart Sora', strategy: 'team', pace: 'slow', description: 'Escala con personajes y remontadas colectivas.', support: ['bench-cheer', 'Bench Cheer Yuna', 'El banco tambien juega.'], item: ['captain-whistle', 'Captain Whistle', 'Llama al equipo al mismo ritmo.'], final: 'Miracle Team Comeback', events: [['new-member', 'New Member Trial', 'El equipo acepta una pieza rara.'], ['practice-loss', 'Practice Match Loss', 'Perder muestra el hueco.'], ['motivation', 'Motivational Speech', 'Sora une al vestuario.'], ['rival-school', 'Rival School Clash', 'El rival rompe la confianza.'], ['miracle-comeback', 'Miracle Comeback', 'Todos corren el ultimo minuto.'], ['victory-line', 'Victory Line', 'La pelota cruza con todo el equipo.']] },
            { slug: 'data-setter', name: 'Data Setter Kei', strategy: 'control', pace: 'fast', description: 'Lee patrones, bloquea jugadas rivales y gana por precision.', support: ['analyst-haru', 'Analyst Haru', 'Convierte errores en graficos.'], item: ['playbook-tablet', 'Playbook Tablet', 'La estrategia entra a la cancha.'], final: 'Perfect Set Point', events: [['scout-rival', 'Scout the Rival', 'Kei ve la jugada antes.'], ['practice-download', 'Practice Match Download', 'Cada punto alimenta el plan.'], ['formation-lock', 'Formation Lock', 'El rival queda sin angulo.'], ['set-point-trap', 'Set Point Trap', 'La cancha se cierra.']] },
        ],
    },
    {
        id: ARCHETYPES.KAIJU, prefix: 'kaiju', theme: 'monstruos gigantes, evacuacion y defensa desesperada',
        sharedCharacters: [['biologist', 'Kaiju Biologist Dr. Imai', 'Encuentra patrones en rugidos.'], ['news-chopper', 'News Chopper Crew', 'Muestra el desastre desde arriba.'], ['defense-droid', 'Defense Droid Unit', 'Compra segundos contra colosos.']],
        sharedItems: [['maser-cannon', 'Maser Cannon', 'Rayo que obliga al monstruo a mirar.'], ['shelter-key', 'Shelter Key', 'Abrir una puerta salva un episodio.'], ['tissue-sample', 'Tissue Sample', 'La ciencia empieza viscosa.']],
        locations: [['tokyo-bay', 'Tokyo Bay', 'Siempre salen del mar.'], ['defense-hq', 'Defense HQ', 'Pantallas, gritos y mapas.'], ['monster-island', 'Monster Island', 'Origen de amenazas imposibles.']],
        heroes: [
            { slug: 'mecha-pilot', name: 'Mecha-K Pilot Ren', strategy: 'aggro', pace: 'fast', description: 'Enfrenta monstruos con acero y dano directo.', support: ['co-pilot-aya', 'Co-Pilot Aya', 'Sincroniza el segundo asiento.'], item: ['mecha-blueprint', 'Mecha Blueprint', 'Planos para pelear de igual a igual.'], final: 'Steel Titan Uppercut', events: [['mecha-deploy', 'Mecha Deployment', 'El robot entra entre sirenas.'], ['monster-clash', 'First Monster Clash', 'Acero contra escamas.'], ['weapon-charge', 'Super Weapon Charge', 'La ciudad presta energia.'], ['rampage-duel', 'Total Rampage Duel', 'Ren enfrenta al alfa.']] },
            { slug: 'city-survivor', name: 'City Survivor Miki', strategy: 'defense', pace: 'slow', description: 'Gana evacuando, reduciendo Filler y resistiendo.', support: ['rescue-driver', 'Rescue Driver Goro', 'Sabe calles que ya no existen.'], item: ['evac-map', 'Evacuation Map', 'Rutas marcadas antes del colapso.'], final: 'Shelter Lights at Dawn', events: [['siren-warning', 'Siren Warning', 'Miki corre antes de mirar atras.'], ['wall-breached', 'Wall Breached', 'La ciudad pierde su borde.'], ['temporary-retreat', 'Temporary Retreat', 'Sobrevivir tambien avanza la historia.'], ['shelter-chain', 'Shelter Chain', 'Una puerta salva muchas.'], ['reconstruction', 'Reconstruction Promise', 'La ciudad decide volver.']] },
            { slug: 'defense-captain', name: 'Defense Captain Aki', strategy: 'control', pace: 'mid', description: 'Coordina ciencia y fuerza militar para controlar el campo.', support: ['radar-officer', 'Radar Officer Sen', 'Ve venir al kaiju antes que nadie.'], item: ['command-tablet', 'Command Tablet', 'Ordenes, rutas y municion.'], final: 'Operation City Saved', events: [['briefing', 'Emergency Briefing', 'Aki divide la ciudad en zonas.'], ['weakness-found', 'Weakness Found', 'La ciencia encuentra una apertura.'], ['reinforcements', 'Reinforcements Arrive', 'La defensa deja de estar sola.'], ['destroyer-plan', 'Oxygen Destroyer Plan', 'La solucion tambien da miedo.'], ['evacuation-line', 'Final Evacuation Line', 'La defensa aguanta hasta el final.']] },
        ],
    },
];

const storyFloors: Record<Pace, number[]> = {
    fast: [0, 8, 18, 30],
    mid: [0, 6, 14, 24, 34],
    slow: [0, 5, 12, 20, 28, 38],
};

function add(card: CardData): void {
    CARDS[card.id] = card;
}

function fx(type: EffectType | string, value?: number, target: Target = 'SELF', description?: string, extra: Partial<CardEffect> = {}): CardEffect {
    return { type, value, target, description, ...extra };
}

function protagonistEffects(strategy: Strategy): CardEffect[] {
    if (strategy === 'aggro') return [fx(EffectType.STORY, 2, 'SELF', 'Abre con presion inmediata.')];
    if (strategy === 'engine') return [fx(EffectType.EXTRA_DRAW_NEXT_TURN, 1, 'SELF', 'Prepara robo extra para sostener el motor.')];
    if (strategy === 'team') return [fx(EffectType.DRAW, 1, 'SELF', 'Busca aliados para activar afinidades.')];
    if (strategy === 'control') return [fx(EffectType.FILLER, -1, 'SELF', 'Ordena la escena y limpia ruido narrativo.')];
    return [fx(EffectType.FILLER, -2, 'SELF', 'Reduce caos antes de que bloquee eventos.')];
}

function supportEffects(strategy: Strategy, index: number): CardEffect[] {
    if (strategy === 'aggro') return [fx(EffectType.FILLER, 1 + (index % 2), 'OPPONENT', 'Presiona al rival con una escena agresiva.')];
    if (strategy === 'engine') return [fx(index % 2 === 0 ? EffectType.DRAW : EffectType.EXTRA_DRAW_NEXT_TURN, 1, 'SELF', 'Acelera recursos para la linea principal.')];
    if (strategy === 'team') return [fx(EffectType.STORY, 1, 'SELF', 'La afinidad del grupo suma Story.')];
    if (strategy === 'control') return [fx(EffectType.BLOCK_CARD_TYPE, 1, 'OPPONENT', 'Corta una linea de juego rival.', { cardType: index % 2 === 0 ? CardType.ITEM : CardType.PERSONAJE, turns: 1 })];
    return [fx(EffectType.FILLER, -1, 'SELF', 'Protege el arco y baja Filler.')];
}

function itemEffects(strategy: Strategy, index: number): CardEffect[] {
    if (strategy === 'aggro') return [fx(EffectType.STORY, 1, 'SELF', 'Convierte equipo ofensivo en Story.')];
    if (strategy === 'engine') return [fx(EffectType.DRAW, 1, 'SELF', 'Roba una carta para estabilizar la curva.')];
    if (strategy === 'team') return [fx(EffectType.EXTRA_DRAW_NEXT_TURN, 1, 'SELF', 'Prepara la siguiente escena de afinidad.')];
    if (strategy === 'control') return [fx(EffectType.DISCARD, 1, 'OPPONENT', 'Obliga al rival a perder una opcion.')];
    return [fx(EffectType.FILLER, -1 - (index % 2), 'SELF', 'Reduce dano colateral del arco.')];
}

function locationEffects(strategy: Strategy, index: number): CardEffect[] {
    if (strategy === 'aggro') return [fx(EffectType.STORY, 1, 'SELF', 'El escenario favorece ataques rapidos.')];
    if (strategy === 'engine') return [fx(EffectType.EXTRA_DRAW_NEXT_TURN, 1, 'SELF', 'La locacion prepara recursos futuros.')];
    if (strategy === 'team') return [fx(EffectType.STORY, 1, 'SELF', 'El grupo se coordina mejor en este lugar.')];
    if (strategy === 'control') return [fx(EffectType.BLOCK_CARD_TYPE, 1, 'OPPONENT', 'El terreno limita una categoria rival.', { cardType: index % 2 === 0 ? CardType.EVENT : CardType.ITEM, turns: 1 })];
    return [fx(EffectType.FILLER, -2, 'SELF', 'El refugio baja el Filler acumulado.')];
}

function eventEffects(strategy: Strategy, step: number, final = false): CardEffect[] {
    if (final) return [
        fx(EffectType.VICTORY, 1, 'SELF', 'Concreta la condicion de victoria.'),
        fx(EffectType.STORY, 5, 'SELF', 'El final concentra todo el arco.'),
        fx(EffectType.REMOVE_OPPONENT_BOARD_CARD, 1, 'OPPONENT', 'La resolucion desplaza una pieza rival.'),
    ];
    if (strategy === 'aggro') return [fx(EffectType.STORY, 2 + (step % 2), 'SELF', 'El arco gana velocidad.'), fx(EffectType.FILLER, 1, 'OPPONENT', 'La presion agrega Filler al rival.')];
    if (strategy === 'engine') return [fx(EffectType.DRAW, step % 2 === 0 ? 2 : 1, 'SELF', 'El evento alimenta el motor.'), fx(EffectType.STORY, 1, 'SELF', 'La preparacion suma Story.')];
    if (strategy === 'team') return [fx(EffectType.STORY, 2, 'SELF', 'Las afinidades vuelven clave la escena.'), fx(EffectType.EXTRA_DRAW_NEXT_TURN, 1, 'SELF', 'El equipo prepara la siguiente jugada.')];
    if (strategy === 'control') return [fx(EffectType.BLOCK_CARD_TYPE, 1, 'OPPONENT', 'El evento bloquea una categoria rival.', { cardType: step % 2 === 0 ? CardType.ITEM : CardType.PERSONAJE, turns: 1 }), fx(EffectType.FILLER, -1, 'SELF', 'El jugador ordena su propio arco.')];
    return [fx(EffectType.FILLER, -2, 'SELF', 'La defensa reduce Filler.'), fx(EffectType.DRAW, 1, 'SELF', 'La supervivencia abre una salida.')];
}

function requirements(protagonistId: string, supportId: string, itemId: string, locationId: string, previousEventId: string | undefined, floor: number, step: number, final = false): CardRequirement[] {
    const story = final ? Math.max(36, floor) : floor;
    const reqs: CardRequirement[] = [
        { type: 'STORY_MIN', value: story, description: `Requiere ${story} Story.` },
        { type: 'CARD_ON_BOARD', cardIds: [protagonistId], value: 1, description: 'Requiere al protagonista en campo.' },
    ];
    if (step >= 1 && previousEventId) reqs.push({ type: 'EVENT_COMPLETED', cardIds: [previousEventId], description: 'Requiere cerrar el evento anterior de esta ruta.' });
    if (step >= 2) reqs.push({ type: 'CARD_ON_BOARD', cardIds: [supportId], value: 1, description: 'Requiere el soporte narrativo de esta ruta.' });
    if (step >= 3) reqs.push({ type: 'CARD_ON_BOARD', cardIds: [itemId], value: 1, description: 'Requiere el item clave de esta ruta.' });
    if (final) reqs.push({ type: 'CARD_ON_BOARD', cardIds: [locationId, supportId, itemId], value: 1, description: 'Requiere al menos una pieza clave de la ruta en campo.' });
    return reqs;
}

function lineId(prefix: string, type: 'protagonist' | 'char' | 'item' | 'loc' | 'event', slug: string): string {
    return `${prefix}-${type}-${slug}`;
}

for (const plan of plans) {
    const sharedCharacterIds = plan.sharedCharacters.map(([slug]) => lineId(plan.prefix, 'char', slug));
    const sharedItemIds = plan.sharedItems.map(([slug]) => lineId(plan.prefix, 'item', slug));
    const locationIds = plan.locations.map(([slug]) => lineId(plan.prefix, 'loc', slug));

    plan.sharedCharacters.forEach(([slug, name, description], index) => add({
        id: lineId(plan.prefix, 'char', slug),
        name,
        type: CardType.PERSONAJE,
        cost: 1 + (index % 3),
        description,
        backstory: `${name} sostiene la fantasia de ${plan.theme}.`,
        effects: supportEffects(index === 0 ? 'team' : index === 1 ? 'engine' : 'control', index),
        archetype: plan.id,
        image: lineId(plan.prefix, 'char', slug),
        affinity: { compatibleWith: [] },
        likesData: { likes: [sharedItemIds[index % sharedItemIds.length], locationIds[index % locationIds.length]], dislikes: [] },
    }));

    plan.sharedItems.forEach(([slug, name, description], index) => add({
        id: lineId(plan.prefix, 'item', slug),
        name,
        type: CardType.ITEM,
        cost: 1 + (index % 3),
        description,
        backstory: `${name} es una herramienta recurrente de ${plan.theme}.`,
        effects: itemEffects(index === 0 ? 'engine' : index === 1 ? 'defense' : 'aggro', index),
        archetype: plan.id,
        image: lineId(plan.prefix, 'item', slug),
    }));

    plan.locations.forEach(([slug, name, description], index) => add({
        id: lineId(plan.prefix, 'loc', slug),
        name,
        type: CardType.LOCATION,
        cost: 1 + (index % 2),
        description,
        backstory: `${name} concentra escenas de ${plan.theme}.`,
        effects: locationEffects(index === 0 ? 'engine' : index === 1 ? 'team' : 'control', index),
        archetype: plan.id,
        image: lineId(plan.prefix, 'loc', slug),
    }));

    const protagonistIds = plan.heroes.map(hero => lineId(plan.prefix, 'protagonist', hero.slug));

    plan.heroes.forEach((hero, index) => {
        const protagonistId = lineId(plan.prefix, 'protagonist', hero.slug);
        const supportId = lineId(plan.prefix, 'char', hero.support[0]);
        const itemId = lineId(plan.prefix, 'item', hero.item[0]);
        const locationId = locationIds[index % locationIds.length];
        const likes = [itemId, sharedItemIds[index % sharedItemIds.length], locationId, supportId, sharedCharacterIds[index % sharedCharacterIds.length]];
        const dislikes = [sharedCharacterIds[(index + 2) % sharedCharacterIds.length]];

        add({
            id: protagonistId,
            name: hero.name,
            type: CardType.PROTAGONIST,
            cost: 0,
            description: hero.description,
            backstory: `${hero.name} representa una ruta ${hero.strategy} dentro de ${plan.theme}.`,
            effects: protagonistEffects(hero.strategy),
            archetype: plan.id,
            image: protagonistId,
            maxCopies: 1,
            affinity: { compatibleWith: [supportId, sharedCharacterIds[index % sharedCharacterIds.length], sharedCharacterIds[(index + 1) % sharedCharacterIds.length]] },
            likesData: { likes, dislikes },
            tags: [`strategy:${hero.strategy}`, `pace:${hero.pace}`],
        });

        add({
            id: supportId,
            name: hero.support[1],
            type: CardType.PERSONAJE,
            cost: hero.strategy === 'aggro' ? 1 : hero.strategy === 'control' ? 3 : 2,
            description: hero.support[2],
            backstory: `${hero.support[1]} es el soporte directo de ${hero.name}.`,
            effects: supportEffects(hero.strategy, index),
            archetype: plan.id,
            image: supportId,
            affinity: { compatibleWith: [protagonistId] },
            likesData: { likes: [itemId, locationId], dislikes: dislikes.slice(0, 1) },
            tags: [`line:${protagonistId}`, `strategy:${hero.strategy}`],
        });

        add({
            id: itemId,
            name: hero.item[1],
            type: CardType.ITEM,
            cost: hero.strategy === 'aggro' ? 2 : 1,
            description: hero.item[2],
            backstory: `${hero.item[1]} es la pieza material del arco de ${hero.name}.`,
            effects: itemEffects(hero.strategy, index),
            archetype: plan.id,
            image: itemId,
            tags: [`line:${protagonistId}`, `strategy:${hero.strategy}`],
        });

        let previousEventId: string | undefined;
        const floors = storyFloors[hero.pace];
        hero.events.forEach(([slug, name, description], step) => {
            const eventId = lineId(plan.prefix, 'event', `${hero.slug}-${slug}`);
            add({
                id: eventId,
                name,
                type: CardType.EVENT,
                cost: Math.min(4, 1 + Math.floor(step / 2)),
                description,
                backstory: `${name} pertenece a la ruta de ${hero.name}.`,
                eventPrerequisites: previousEventId ? [previousEventId] : [],
                requirements: requirements(protagonistId, supportId, itemId, locationId, previousEventId, floors[Math.min(step, floors.length - 1)], step),
                effects: eventEffects(hero.strategy, step),
                archetype: plan.id,
                image: eventId,
                maxCopies: 1,
                tags: [`line:${protagonistId}`, `order:${String(step + 1).padStart(2, '0')}`, `pace:${hero.pace}`, `strategy:${hero.strategy}`],
            });
            previousEventId = eventId;
        });

        const finalId = `${protagonistId}-final-event`;
        add({
            id: finalId,
            name: hero.final,
            type: CardType.EVENT_FINAL,
            cost: 5,
            description: `Final de temporada de ${hero.name}.`,
            backstory: `${hero.final} cierra la ruta ${hero.strategy} de ${hero.name}.`,
            eventPrerequisites: previousEventId ? [previousEventId] : [],
            requirements: requirements(protagonistId, supportId, itemId, locationId, previousEventId, floors[floors.length - 1], hero.events.length, true),
            effects: eventEffects(hero.strategy, hero.events.length, true),
            archetype: plan.id,
            image: finalId,
            maxCopies: 1,
            tags: [`line:${protagonistId}`, 'act_final', `strategy:${hero.strategy}`],
        });
    });

    for (const protagonistId of protagonistIds) {
        for (const sharedId of sharedCharacterIds) {
            CARDS[sharedId].affinity = {
                compatibleWith: Array.from(new Set([...(CARDS[sharedId].affinity?.compatibleWith || []), protagonistId])),
            };
        }
    }
}
