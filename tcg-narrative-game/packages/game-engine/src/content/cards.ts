import { CardData, CardType, EffectType } from '@tcg/shared/types';
import { ARCHETYPES } from '@tcg/shared/constants';

// ============================================
// Card Registry
// ============================================

export const CARDS: Record<string, CardData> = {
    // ============================================
    // SHONEN ARCHETYPE
    // ============================================
    'shonen-protagonist-hot': {
        id: 'shonen-protagonist-hot',
        name: 'Ryu "Dragon" Flame',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Siempre ataca primero. Gana Story rápido al inicio.',
        backstory: 'Un joven que comió la fruta del dragón por error.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-protagonist-hot',
        maxCopies: 1,
        likesData: {
            likes: ['shonen-item-goggles', 'shonen-loc-arena'],
            dislikes: ['shonen-loc-library']
        },
        affinity: { compatibleWith: ['shonen-char-rival', 'shonen-char-bestfriend'] }
    },
    'shonen-protagonist-training': {
        id: 'shonen-protagonist-training',
        name: 'Kenji the Disciplined',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Mejora con cada evento de entrenamiento.',
        backstory: 'Cree que el esfuerzo supera al talento natural.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-protagonist-training',
        maxCopies: 1,
        likesData: {
            likes: ['shonen-item-weights', 'shonen-loc-dojo', 'shonen-item-scroll'],
            dislikes: ['shonen-loc-beach']
        },
        affinity: { compatibleWith: ['shonen-char-sensei', 'shonen-char-healer'] }
    },
    'shonen-protagonist-friend': {
        id: 'shonen-protagonist-friend',
        name: 'Hiro & Friends',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Más fuerte cuantos más aliados tenga.',
        backstory: 'Nunca pelea solo.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-protagonist-friend',
        maxCopies: 1,
        likesData: {
            likes: ['shonen-item-badge', 'shonen-loc-school'],
            dislikes: []
        },
        affinity: { compatibleWith: ['shonen-char-bestfriend', 'shonen-char-mascot', 'shonen-char-loveinterest'] }
    },

    // CHARACTERS
    'shonen-char-bestfriend': {
        id: 'shonen-char-bestfriend',
        name: 'Best Friend Kaito',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Siempre apoya.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-bestfriend',
        affinity: { compatibleWith: ['shonen-protagonist-hot', 'shonen-protagonist-friend'] }
    },
    'shonen-char-rival': {
        id: 'shonen-char-rival',
        name: 'Rival Sasuke-like',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Motiva a mejorar.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-rival',
        affinity: { compatibleWith: ['shonen-protagonist-hot'] }
    },
    'shonen-char-sensei': {
        id: 'shonen-char-sensei',
        name: 'Old Master',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Enseña técnicas secretas.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-sensei',
        affinity: { compatibleWith: ['shonen-protagonist-training'] }
    },
    'shonen-char-healer': {
        id: 'shonen-char-healer',
        name: 'Medic Girl',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Cura heridas.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-healer',
        affinity: { compatibleWith: ['shonen-protagonist-training'] }
    },
    'shonen-char-mascot': {
        id: 'shonen-char-mascot',
        name: 'Talking Pet',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Mascota graciosa.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-mascot',
        affinity: { compatibleWith: ['shonen-protagonist-friend'] }
    },
    'shonen-char-villain-general': {
        id: 'shonen-char-villain-general',
        name: 'Enemy General',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Un boss medio.',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-villain-general'
    },
    'shonen-char-loveinterest': {
        id: 'shonen-char-loveinterest',
        name: 'Childhood Friend',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Apoyo moral.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-loveinterest',
        affinity: { compatibleWith: ['shonen-protagonist-friend', 'shonen-protagonist-hot'] }
    },
    'shonen-char-glasses': {
        id: 'shonen-char-glasses',
        name: 'Strategist with Glasses',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Planea la batalla.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-glasses'
    },
    'shonen-char-big-guy': {
        id: 'shonen-char-big-guy',
        name: 'Gentle Giant',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Fuerte pero amable.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-big-guy'
    },
    'shonen-char-mysterious': {
        id: 'shonen-char-mysterious',
        name: 'Mysterious Transfer Student',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Poder oculto.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-char-mysterious'
    },

    // ITEMS
    'shonen-item-goggles': {
        id: 'shonen-item-goggles',
        name: 'Goggles',
        type: CardType.ITEM,
        cost: 1,
        description: 'Estilo clásico.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-goggles'
    },
    'shonen-item-weights': {
        id: 'shonen-item-weights',
        name: 'Pesas de Entrenamiento',
        type: CardType.ITEM,
        cost: 1,
        description: 'Para entrenar.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-weights'
    },
    'shonen-item-scroll': {
        id: 'shonen-item-scroll',
        name: 'Secret Technique Scroll',
        type: CardType.ITEM,
        cost: 2,
        description: 'Técnica prohibida.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-scroll'
    },
    'shonen-item-badge': {
        id: 'shonen-item-badge',
        name: 'Team Badge',
        type: CardType.ITEM,
        cost: 1,
        description: 'Símbolo de amistad.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-badge'
    },
    'shonen-item-katana': {
        id: 'shonen-item-katana',
        name: 'Rusty Katana',
        type: CardType.ITEM,
        cost: 2,
        description: 'Espada vieja pero confiable.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-katana'
    },
    'shonen-item-ramen': {
        id: 'shonen-item-ramen',
        name: 'Bowl of Ramen',
        type: CardType.ITEM,
        cost: 1,
        description: 'Comida reconfortante.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-ramen'
    },
    'shonen-item-bandana': {
        id: 'shonen-item-bandana',
        name: 'Headband',
        type: CardType.ITEM,
        cost: 1,
        description: 'Protege la frente.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-bandana'
    },
    'shonen-item-power-limiter': {
        id: 'shonen-item-power-limiter',
        name: 'Power Limiter',
        type: CardType.ITEM,
        cost: 3,
        description: 'Se quita en momento crítico.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-item-power-limiter'
    },

    // LOCATIONS
    'shonen-loc-dojo': {
        id: 'shonen-loc-dojo',
        name: 'Family Dojo',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Lugar de entrenamiento.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-loc-dojo'
    },
    'shonen-loc-school': {
        id: 'shonen-loc-school',
        name: 'High School Roof',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Donde se comen el almuerzo.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-loc-school'
    },
    'shonen-loc-arena': {
        id: 'shonen-loc-arena',
        name: 'Tournament Arena',
        type: CardType.LOCATION,
        cost: 3,
        description: 'El gran escenario.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-loc-arena'
    },
    'shonen-loc-beach': {
        id: 'shonen-loc-beach',
        name: 'Training Beach',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Episodio de playa obligatorio.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-loc-beach'
    },
    'shonen-loc-library': {
        id: 'shonen-loc-library',
        name: 'Ancient Library',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Conocimiento perdido.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-loc-library'
    },
    'shonen-loc-ruins': {
        id: 'shonen-loc-ruins',
        name: 'Forgotten Ruins',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Peligro y tesoros.',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-loc-ruins'
    },

    // EVENTS
    'shonen-event-call': {
        id: 'shonen-event-call',
        name: 'Call to Adventure',
        type: CardType.EVENT,
        cost: 1,
        description: 'El viaje comienza.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-call'
    },
    'shonen-event-meet': {
        id: 'shonen-event-meet',
        name: 'Fated Meeting',
        type: CardType.EVENT,
        cost: 1,
        description: 'Encuentras a un aliado.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-meet'
    },
    'shonen-event-training': {
        id: 'shonen-event-training',
        name: 'Training Montage',
        type: CardType.EVENT,
        cost: 2,
        description: 'Entrenamiento duro.',
        requirements: [
            { type: 'STORY_MIN', value: 5 },
            { type: 'EVENT_COMPLETED', cardIds: ['shonen-event-call'] }
        ],
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-training'
    },
    'shonen-event-rivalry': {
        id: 'shonen-event-rivalry',
        name: 'Rival Clash',
        type: CardType.EVENT,
        cost: 2,
        description: 'Pelea con el rival.',
        requirements: [
            { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' },
            { type: 'STORY_MIN', value: 5 }
        ],
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-rivalry'
    },
    'shonen-event-defeat': {
        id: 'shonen-event-defeat',
        name: 'Tragic Defeat',
        type: CardType.EVENT,
        cost: 2,
        description: 'Perder para aprender.',
        requirements: [
            { type: 'STORY_MIN', value: 10 }
        ],
        effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-defeat'
    },
    'shonen-event-tournament': {
        id: 'shonen-event-tournament',
        name: 'Grand Tournament',
        type: CardType.EVENT,
        cost: 3,
        description: 'El torneo mundial.',
        requirements: [
            { type: 'STORY_MIN', value: 15 },
            { type: 'EVENT_COMPLETED', cardIds: ['shonen-event-training'] }
        ],
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-tournament'
    },
    'shonen-event-powerup': {
        id: 'shonen-event-powerup',
        name: 'New Transformation',
        type: CardType.EVENT,
        cost: 3,
        description: 'Pelo dorado.',
        requirements: [
            { type: 'STORY_MIN', value: 20 },
            { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' }
        ],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-powerup'
    },
    'shonen-event-speech': {
        id: 'shonen-event-speech',
        name: 'Nakama Speech',
        type: CardType.EVENT,
        cost: 3,
        description: 'El poder de la amistad.',
        requirements: [
            { type: 'STORY_MIN', value: 15 },
            { type: 'CARD_ON_BOARD', value: 2, cardType: CardType.PERSONAJE }
        ],
        effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-speech'
    },
    'shonen-event-invasion': {
        id: 'shonen-event-invasion',
        name: 'Villain Invasion',
        type: CardType.EVENT,
        cost: 4,
        description: 'Ataque a la ciudad',
        requirements: [
            { type: 'STORY_MIN', value: 25 }
        ],
        effects: [{ type: EffectType.FILLER, value: 4, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-invasion'
    },
    'shonen-event-final': {
        id: 'shonen-event-final',
        name: 'Save the World',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'La batalla final.',
        requirements: [
            { type: 'STORY_MIN', value: 40 },
            { type: 'EVENT_COMPLETED', cardIds: ['shonen-event-invasion'] },
            { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.SHONEN,
        image: 'shonen-event-final'
    },
    // ============================================
    // MECHA ARCHETYPE
    // "Giant robots, pilots, and alien invasions"
    // Style: Resource Management (Energy), Big Units, Upgrades
    // ============================================

    // --- PROTAGONISTS ---
    'mecha-protagonist-hot': {
        id: 'mecha-protagonist-hot',
        name: 'Ace Pilot Hiro',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Energía infinita.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-protagonist-hot',
        maxCopies: 1,
        likesData: { likes: ['mecha-item-battery', 'mecha-loc-hangar'], dislikes: ['mecha-loc-ruined-city'] },
        affinity: { compatibleWith: ['mecha-char-mechanic'] }
    },
    'mecha-protagonist-calm': {
        id: 'mecha-protagonist-calm',
        name: 'Rei the Quiet',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Sincronización perfecta.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-protagonist-calm',
        maxCopies: 1,
        likesData: { likes: ['mecha-item-program'], dislikes: [] },
        affinity: { compatibleWith: ['mecha-char-commander'] }
    },
    'mecha-protagonist-reluctant': {
        id: 'mecha-protagonist-reluctant',
        name: 'Shinji (Get in the robot)',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'No quiere pelear, pero debe.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-protagonist-reluctant',
        maxCopies: 1,
        likesData: { likes: ['mecha-item-headphones'], dislikes: ['mecha-loc-bridge'] },
        affinity: { compatibleWith: ['mecha-char-guardian'] }
    },

    // --- CHARACTERS ---
    'mecha-char-mechanic': {
        id: 'mecha-char-mechanic',
        name: 'Chief Mechanic',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Repara los robots.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-mechanic',
        affinity: { compatibleWith: ['mecha-protagonist-hot'] }
    },
    'mecha-char-commander': {
        id: 'mecha-char-commander',
        name: 'Stern Commander',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Da órdenes desde el puente.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-commander'
    },
    'mecha-char-guardian': {
        id: 'mecha-char-guardian',
        name: 'Blue-Haired Guardian',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Protege al piloto.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-guardian'
    },
    'mecha-char-rival-ace': {
        id: 'mecha-char-rival-ace',
        name: 'The Red Comet',
        type: CardType.PERSONAJE,
        cost: 3,
        description: '3 veces más rápido.',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-rival-ace'
    },
    'mecha-char-mascot': {
        id: 'mecha-char-mascot',
        name: 'Robot Mascot',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Beep boop.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-mascot'
    },
    'mecha-char-scientist': {
        id: 'mecha-char-scientist',
        name: 'Mad Scientist',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Crea nuevas armas.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-scientist'
    },
    'mecha-char-operator': {
        id: 'mecha-char-operator',
        name: 'Bridge Operator',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Monitora los signos.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-operator'
    },
    'mecha-char-spy': {
        id: 'mecha-char-spy',
        name: 'Enemy Spy',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Infiltrado.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-spy'
    },
    'mecha-char-veteran': {
        id: 'mecha-char-veteran',
        name: 'Veteran Pilot',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Vio demasiada guerra.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-veteran'
    },
    'mecha-char-ai': {
        id: 'mecha-char-ai',
        name: 'Ship AI',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Controla la nave.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-char-ai'
    },

    // --- ITEMS ---
    'mecha-item-battery': {
        id: 'mecha-item-battery',
        name: 'Energy Battery',
        type: CardType.ITEM,
        cost: 1,
        description: 'Recarga energía.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-battery'
    },
    'mecha-item-rifle': {
        id: 'mecha-item-rifle',
        name: 'Beam Rifle',
        type: CardType.ITEM,
        cost: 2,
        description: 'Arma estándar.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-rifle'
    },
    'mecha-item-program': {
        id: 'mecha-item-program',
        name: 'Upgrade Program',
        type: CardType.ITEM,
        cost: 1,
        description: 'Mejora el OS.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-program'
    },
    'mecha-item-headphones': {
        id: 'mecha-item-headphones',
        name: 'S-DAT Player',
        type: CardType.ITEM,
        cost: 1,
        description: 'Música para aislarse.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-headphones'
    },
    'mecha-item-suit': {
        id: 'mecha-item-suit',
        name: 'Plug Suit',
        type: CardType.ITEM,
        cost: 1,
        description: 'Traje de piloto.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-suit'
    },
    'mecha-item-shield': {
        id: 'mecha-item-shield',
        name: 'Energy Shield',
        type: CardType.ITEM,
        cost: 2,
        description: 'Defensa absoluta.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-shield'
    },
    'mecha-item-fin': {
        id: 'mecha-item-fin',
        name: 'Funnel System',
        type: CardType.ITEM,
        cost: 3,
        description: 'Armas remotas.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-fin'
    },
    'mecha-item-box': {
        id: 'mecha-item-box',
        name: 'Lunch Box',
        type: CardType.ITEM,
        cost: 1,
        description: 'Comida casera.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-item-box'
    },

    // --- LOCATIONS ---
    'mecha-loc-hangar': {
        id: 'mecha-loc-hangar',
        name: 'Main Hangar',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Donde duermen los gigantes.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-loc-hangar'
    },
    'mecha-loc-bridge': {
        id: 'mecha-loc-bridge',
        name: 'Command Bridge',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Centro de mando.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-loc-bridge'
    },
    'mecha-loc-space': {
        id: 'mecha-loc-space',
        name: 'Deep Space',
        type: CardType.LOCATION,
        cost: 1,
        description: 'El vacío infinito.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-loc-space'
    },
    'mecha-loc-colony': {
        id: 'mecha-loc-colony',
        name: 'Space Colony',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Hogar en las estrellas.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-loc-colony'
    },
    'mecha-loc-ruined-city': {
        id: 'mecha-loc-ruined-city',
        name: 'Ruined City',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Daño colateral.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-loc-ruined-city'
    },
    'mecha-loc-base': {
        id: 'mecha-loc-base',
        name: 'Underground Base',
        type: CardType.LOCATION,
        cost: 3,
        description: 'Fortaleza secreta.',
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-loc-base'
    },

    // --- EVENTS ---
    'mecha-event-launch': {
        id: 'mecha-event-launch',
        name: 'Emergency Launch',
        type: CardType.EVENT,
        cost: 1,
        description: '¡Despegue!',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-launch'
    },
    'mecha-event-first-fight': {
        id: 'mecha-event-first-fight',
        name: 'First Contact',
        type: CardType.EVENT,
        cost: 1,
        description: 'Aparece el enemigo.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-first-fight'
    },
    'mecha-event-combine': {
        id: 'mecha-event-combine',
        name: 'Combination Sequence',
        type: CardType.EVENT,
        cost: 2,
        description: '¡Formen el robot gigante!',
        requirements: [
            { type: 'STORY_MIN', value: 5 },
            { type: 'CARD_ON_BOARD', value: 1, cardType: CardType.PROTAGONIST } // Requires pilot
        ],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-combine'
    },
    'mecha-event-ambush': {
        id: 'mecha-event-ambush',
        name: 'Enemy Ambush',
        type: CardType.EVENT,
        cost: 2,
        description: 'Ataque sorpresa.',
        requirements: [{ type: 'STORY_MIN', value: 5 }],
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-ambush'
    },
    'mecha-event-upgrade': {
        id: 'mecha-event-upgrade',
        name: 'Mid-Season Upgrade',
        type: CardType.EVENT,
        cost: 3,
        description: 'Nuevo modelo recibido.',
        requirements: [{ type: 'STORY_MIN', value: 12 }],
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-upgrade'
    },
    'mecha-event-berserk': {
        id: 'mecha-event-berserk',
        name: 'Berserk Mode',
        type: CardType.EVENT,
        cost: 3,
        description: 'Fuera de control.',
        requirements: [{ type: 'STORY_MIN', value: 15 }, { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' }],
        effects: [{ type: EffectType.FILLER, value: 2, target: 'SELF' }, { type: EffectType.STORY, value: 3, target: 'SELF' }], // Risk/Reward
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-berserk'
    },
    'mecha-event-space-battle': {
        id: 'mecha-event-space-battle',
        name: 'Major Space Battle',
        type: CardType.EVENT,
        cost: 3,
        description: 'Flotas enfrentadas.',
        requirements: [{ type: 'STORY_MIN', value: 20 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-space-battle'
    },
    'mecha-event-colony-drop': {
        id: 'mecha-event-colony-drop',
        name: 'Colony Drop',
        type: CardType.EVENT,
        cost: 4,
        description: 'Evento catastrófico.',
        requirements: [{ type: 'STORY_MIN', value: 25 }],
        effects: [{ type: EffectType.FILLER, value: 5, target: 'OPPONENT' }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-colony-drop'
    },
    'mecha-event-singularity': {
        id: 'mecha-event-singularity',
        name: 'Human Instrumentality',
        type: CardType.EVENT,
        cost: 4,
        description: 'Todos somos uno.',
        requirements: [{ type: 'STORY_MIN', value: 30 }],
        effects: [],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-singularity'
    },
    'mecha-event-final': {
        id: 'mecha-event-final',
        name: 'Hope of Universes',
        type: CardType.EVENT_FINAL,
        cost: 6,
        description: 'El ataque final que perfora los cielos.',
        requirements: [
            { type: 'STORY_MIN', value: 45 },
            { type: 'EVENT_COMPLETED', cardIds: ['mecha-event-space-battle'] },
            { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.MECHA,
        image: 'mecha-event-final'
    },

    // ============================================
    // HAREM INVERSO (Otome)
    // "Love triangles, misunderstandings"
    // Style: Relationship management, specific pairings
    // ============================================

    // --- PROTAGONISTS ---
    'otome-protagonist-plain': {
        id: 'otome-protagonist-plain',
        name: 'Plain Heroine',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Todo el mundo la ama inexplicablemente.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-protagonist-plain',
        maxCopies: 1,
        likesData: { likes: ['otome-item-cake', 'otome-loc-garden'], dislikes: [] },
        affinity: { compatibleWith: ['otome-char-prince', 'otome-char-villainess'] }
    },
    'otome-protagonist-reincarnated': {
        id: 'otome-protagonist-reincarnated',
        name: 'Villainess Reborn',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Evita la doom flag.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-protagonist-reincarnated',
        maxCopies: 1,
        likesData: { likes: ['otome-item-letter'], dislikes: ['otome-loc-ballroom'] }, // Dislikes balls due to doom flag event?
        affinity: { compatibleWith: ['otome-char-butler'] }
    },
    'otome-protagonist-saint': {
        id: 'otome-protagonist-saint',
        name: 'The Saintess',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Poder sagrado.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-protagonist-saint',
        maxCopies: 1,
        likesData: { likes: ['otome-item-book'], dislikes: [] },
        affinity: { compatibleWith: ['otome-char-knight'] }
    },

    // --- CHARACTERS ---
    'otome-char-prince': {
        id: 'otome-char-prince',
        name: 'Crown Prince',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Arrogante pero guapo.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-prince'
    },
    'otome-char-knight': {
        id: 'otome-char-knight',
        name: 'Loyal Knight',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Protege desde las sombras.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-knight'
    },
    'otome-char-butler': {
        id: 'otome-char-butler',
        name: 'Sadistic Butler',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Sirve el té con veneno.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-butler'
    },
    'otome-char-brother': {
        id: 'otome-char-brother',
        name: 'Step-Brother',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Es complicado.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-brother'
    },
    'otome-char-wizard': {
        id: 'otome-char-wizard',
        name: 'Court Wizard',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Misterioso y somnoliento.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-wizard'
    },
    'otome-char-villainess': {
        id: 'otome-char-villainess',
        name: 'Rival Villainess',
        type: CardType.PERSONAJE,
        cost: 2,
        description: '¡Ohohoho!',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-villainess'
    },
    'otome-char-maid': {
        id: 'otome-char-maid',
        name: 'Helpful Maid',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Sabe todos los chismes.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-maid'
    },
    'otome-char-duke': {
        id: 'otome-char-duke',
        name: 'Cold Duke',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Corazón de hielo.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-duke'
    },
    'otome-char-teacher': {
        id: 'otome-char-teacher',
        name: 'Hot Teacher',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Prohibido.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-teacher'
    },
    'otome-char-pet': {
        id: 'otome-char-pet',
        name: 'Magic Familiar',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Es muy mono.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-char-pet'
    },

    // --- ITEMS ---
    'otome-item-cake': {
        id: 'otome-item-cake',
        name: 'Strawberry Cake',
        type: CardType.ITEM,
        cost: 1,
        description: 'Dulce favorito.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-cake'
    },
    'otome-item-letter': {
        id: 'otome-item-letter',
        name: 'Love Letter',
        type: CardType.ITEM,
        cost: 1,
        description: 'Confesión escrita.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-letter'
    },
    'otome-item-fan': {
        id: 'otome-item-fan',
        name: 'Noble Fan',
        type: CardType.ITEM,
        cost: 1,
        description: 'Para ocultar risas.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-fan'
    },
    'otome-item-rose': {
        id: 'otome-item-rose',
        name: 'Red Rose',
        type: CardType.ITEM,
        cost: 1,
        description: 'Símbolo de romance.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-rose'
    },
    'otome-item-poison': {
        id: 'otome-item-poison',
        name: 'Suspicious Vial',
        type: CardType.ITEM,
        cost: 2,
        description: '¿Veneno?',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-poison'
    },
    'otome-item-book': {
        id: 'otome-item-book',
        name: 'Magic Grimoire',
        type: CardType.ITEM,
        cost: 2,
        description: 'Estudio serio.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-book'
    },
    'otome-item-dress': {
        id: 'otome-item-dress',
        name: 'Ball Gown',
        type: CardType.ITEM,
        cost: 2,
        description: 'Vestido impresionante.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-dress'
    },
    'otome-item-tea': {
        id: 'otome-item-tea',
        name: 'Tea Set',
        type: CardType.ITEM,
        cost: 1,
        description: 'Hora del té.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-item-tea'
    },

    // --- LOCATIONS ---
    'otome-loc-garden': {
        id: 'otome-loc-garden',
        name: 'Royal Garden',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Lugar de citas.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-loc-garden'
    },
    'otome-loc-academy': {
        id: 'otome-loc-academy',
        name: 'Magic Academy',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Donde todo pasa.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-loc-academy'
    },
    'otome-loc-ballroom': {
        id: 'otome-loc-ballroom',
        name: 'Grand Ballroom',
        type: CardType.LOCATION,
        cost: 2,
        description: 'El baile de graduación.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-loc-ballroom'
    },
    'otome-loc-library': {
        id: 'otome-loc-library',
        name: 'Academy Library',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Estudio silencioso.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-loc-library'
    },
    'otome-loc-cafe': {
        id: 'otome-loc-cafe',
        name: 'Terrace Cafe',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Té y chismes.',
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-loc-cafe'
    },
    'otome-loc-dorm': {
        id: 'otome-loc-dorm',
        name: 'Noble Dorms',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Privacidad.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-loc-dorm'
    },

    // --- EVENTS ---
    'otome-event-meet': {
        id: 'otome-event-meet',
        name: 'Corner Collision',
        type: CardType.EVENT,
        cost: 1,
        description: 'Chocar en la esquina con un tostada.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-meet'
    },
    'otome-event-tea': {
        id: 'otome-event-tea',
        name: 'Tea Party',
        type: CardType.EVENT,
        cost: 1,
        description: 'Política y té.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-tea'
    },
    'otome-event-exam': {
        id: 'otome-event-exam',
        name: 'Magic Exams',
        type: CardType.EVENT,
        cost: 2,
        description: 'Demostrar poder.',
        requirements: [{ type: 'STORY_MIN', value: 5 }],
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-exam'
    },
    'otome-event-festival': {
        id: 'otome-event-festival',
        name: 'School Festival',
        type: CardType.EVENT,
        cost: 2,
        description: 'Evento cultural.',
        requirements: [{ type: 'STORY_MIN', value: 8 }],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-festival'
    },
    'otome-event-dance': {
        id: 'otome-event-dance',
        name: 'First Dance',
        type: CardType.EVENT,
        cost: 2,
        description: 'Un baile romántico.',
        requirements: [{ type: 'STORY_MIN', value: 10 }, { type: 'CARD_ON_BOARD', value: 1, cardType: CardType.PROTAGONIST }],
        effects: [],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-dance'
    },
    'otome-event-jealousy': {
        id: 'otome-event-jealousy',
        name: 'Rival Confrontation',
        type: CardType.EVENT,
        cost: 3,
        description: 'La villana ataca.',
        requirements: [{ type: 'STORY_MIN', value: 15 }],
        effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-jealousy'
    },
    'otome-event-confession-fail': {
        id: 'otome-event-confession-fail',
        name: 'Misunderstanding',
        type: CardType.EVENT,
        cost: 3,
        description: 'Drama innecesario.',
        requirements: [{ type: 'STORY_MIN', value: 20 }],
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-confession-fail'
    },
    'otome-event-rescue': {
        id: 'otome-event-rescue',
        name: 'Dungeon Rescue',
        type: CardType.EVENT,
        cost: 3,
        description: 'El príncipe al rescate.',
        requirements: [{ type: 'STORY_MIN', value: 25 }],
        effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-rescue'
    },
    'otome-event-condemnation': {
        id: 'otome-event-condemnation',
        name: 'The Condemnation',
        type: CardType.EVENT,
        cost: 4,
        description: 'Juicio público.',
        requirements: [{ type: 'STORY_MIN', value: 35 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-condemnation'
    },
    'otome-event-final': {
        id: 'otome-event-final',
        name: 'True Love Ending',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'Final feliz con el elegido.',
        requirements: [
            { type: 'STORY_MIN', value: 45 },
            { type: 'EVENT_COMPLETED', cardIds: ['otome-event-dance'] }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.HAREM_INVERSO,
        image: 'otome-event-final'
    },

    // ============================================
    // SLICE OF LIFE
    // "School clubs, festivals, peaceful days"
    // Style: Efficiency, Low Cost, Consistency
    // ============================================

    // --- PROTAGONISTS ---
    'slice-protagonist-president': {
        id: 'slice-protagonist-president',
        name: 'Student Council President',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Organiza todo con eficiencia.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-protagonist-president',
        maxCopies: 1,
        likesData: { likes: ['slice-item-tea', 'slice-loc-council'], dislikes: ['slice-loc-cafe'] },
        affinity: { compatibleWith: ['slice-char-treasurer'] }
    },
    'slice-protagonist-loner': {
        id: 'slice-protagonist-loner',
        name: 'Cynical Loner',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Observa desde lejos.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-protagonist-loner',
        maxCopies: 1,
        likesData: { likes: ['slice-item-notebook'], dislikes: ['slice-event-festival'] },
        affinity: { compatibleWith: ['slice-char-friend'] }
    },
    'slice-protagonist-band': {
        id: 'slice-protagonist-band',
        name: 'Guitarist Girl',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Quiere formar una banda.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-protagonist-band',
        maxCopies: 1,
        likesData: { likes: ['slice-item-guitar', 'slice-loc-music-room'], dislikes: ['slice-loc-council'] },
        affinity: { compatibleWith: ['slice-char-drummer', 'slice-char-bassist'] }
    },

    // --- CHARACTERS ---
    'slice-char-treasurer': {
        id: 'slice-char-treasurer',
        name: 'Calculative Treasurer',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Maneja el presupuesto.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-treasurer'
    },
    'slice-char-friend': {
        id: 'slice-char-friend',
        name: 'Cheery Best Friend',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Siempre sonríe.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-friend'
    },
    'slice-char-drummer': {
        id: 'slice-char-drummer',
        name: 'Energetic Drummer',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Marca el ritmo.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-drummer'
    },
    'slice-char-bassist': {
        id: 'slice-char-bassist',
        name: 'Shy Bassist',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Base del sonido.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-bassist'
    },
    'slice-char-teacher': {
        id: 'slice-char-teacher',
        name: 'Lazy Teacher',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Deja hacer lo que quieran.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-teacher'
    },
    'slice-char-transfer': {
        id: 'slice-char-transfer',
        name: 'Exchange Student',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Todo es nuevo.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-transfer'
    },
    'slice-char-cat': {
        id: 'slice-char-cat',
        name: 'School Cat',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Miau.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-cat'
    },
    'slice-char-rival-club': {
        id: 'slice-char-rival-club',
        name: 'Rival Club Pres',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Quiere tu sala.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-rival-club'
    },
    'slice-char-sister': {
        id: 'slice-char-sister',
        name: 'Little Sister',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Onii-chan.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-sister'
    },
    'slice-char-janitor': {
        id: 'slice-char-janitor',
        name: 'Wise Janitor',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Sabe secretos.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-char-janitor'
    },

    // --- ITEMS ---
    'slice-item-tea': {
        id: 'slice-item-tea',
        name: 'High Quality Tea',
        type: CardType.ITEM,
        cost: 1,
        description: 'Relajante.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-tea'
    },
    'slice-item-guitar': {
        id: 'slice-item-guitar',
        name: 'Electric Guitar',
        type: CardType.ITEM,
        cost: 2,
        description: 'Gitah.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-guitar'
    },
    'slice-item-camera': {
        id: 'slice-item-camera',
        name: 'DSLR Camera',
        type: CardType.ITEM,
        cost: 1,
        description: 'Captura momentos.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-camera'
    },
    'slice-item-bento': {
        id: 'slice-item-bento',
        name: 'Homemade Bento',
        type: CardType.ITEM,
        cost: 1,
        description: 'Hecho con amor.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-bento'
    },
    'slice-item-notebook': {
        id: 'slice-item-notebook',
        name: 'Study Notes',
        type: CardType.ITEM,
        cost: 1,
        description: 'Apuntes prestados.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-notebook'
    },
    'slice-item-umbrella': {
        id: 'slice-item-umbrella',
        name: 'Shared Umbrella',
        type: CardType.ITEM,
        cost: 1,
        description: 'Romántico.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-umbrella'
    },
    'slice-item-costume': {
        id: 'slice-item-costume',
        name: 'Cosplay Costume',
        type: CardType.ITEM,
        cost: 2,
        description: 'Para el festival.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-costume'
    },
    'slice-item-bike': {
        id: 'slice-item-bike',
        name: 'Bicycle',
        type: CardType.ITEM,
        cost: 1,
        description: 'Camino a casa.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-item-bike'
    },

    // --- LOCATIONS ---
    'slice-loc-council': {
        id: 'slice-loc-council',
        name: 'Council Room',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Centro de poder escolar.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-loc-council'
    },
    'slice-loc-music-room': {
        id: 'slice-loc-music-room',
        name: 'Music Room',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Lugar de práctica.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-loc-music-room'
    },
    'slice-loc-roof': {
        id: 'slice-loc-roof',
        name: 'School Roof',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Almuerzo y siestas.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-loc-roof'
    },
    'slice-loc-cafe': {
        id: 'slice-loc-cafe',
        name: 'Maid Cafe',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Trabajo de medio tiempo.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-loc-cafe'
    },
    'slice-loc-park': {
        id: 'slice-loc-park',
        name: 'Park Bench',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Conversaciones profundas.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-loc-park'
    },
    'slice-loc-shrine': {
        id: 'slice-loc-shrine',
        name: 'Local Shrine',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Festival de verano.',
        effects: [],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-loc-shrine'
    },

    // --- EVENTS ---
    'slice-event-first-day': {
        id: 'slice-event-first-day',
        name: 'First Day of School',
        type: CardType.EVENT,
        cost: 1,
        description: 'Sakuras cayendo.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-first-day'
    },
    'slice-event-club-join': {
        id: 'slice-event-club-join',
        name: 'Joining a Club',
        type: CardType.EVENT,
        cost: 1,
        description: 'Encontrar tu lugar.',
        requirements: [{ type: 'STORY_MIN', value: 2 }],
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-club-join'
    },
    'slice-event-exam': {
        id: 'slice-event-exam',
        name: 'Midterm Exams',
        type: CardType.EVENT,
        cost: 2,
        description: 'Estudiar toda la noche.',
        requirements: [{ type: 'STORY_MIN', value: 5 }],
        effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-exam'
    },
    'slice-event-beach': {
        id: 'slice-event-beach',
        name: 'Beach Episode',
        type: CardType.EVENT,
        cost: 2,
        description: '¡El mar!',
        requirements: [{ type: 'STORY_MIN', value: 10 }],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-beach'
    },
    'slice-event-festival': {
        id: 'slice-event-festival',
        name: 'School Festival',
        type: CardType.EVENT,
        cost: 3,
        description: 'Casa embrujada o café.',
        requirements: [{ type: 'STORY_MIN', value: 15 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-festival'
    },
    'slice-event-concert': {
        id: 'slice-event-concert',
        name: 'School Concert',
        type: CardType.EVENT,
        cost: 3,
        description: 'Tocar en vivo.',
        requirements: [{ type: 'STORY_MIN', value: 20 }, { type: 'CARD_ON_BOARD', value: 2, cardType: CardType.PERSONAJE }],
        effects: [{ type: EffectType.STORY, value: 4, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-concert'
    },
    'slice-event-christmas': {
        id: 'slice-event-christmas',
        name: 'Christmas Eve',
        type: CardType.EVENT,
        cost: 3,
        description: 'Evento de parejas.',
        requirements: [{ type: 'STORY_MIN', value: 25 }],
        effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-christmas'
    },
    'slice-event-trip': {
        id: 'slice-event-trip',
        name: 'Kyoto Trip',
        type: CardType.EVENT,
        cost: 4,
        description: 'Viaje escolar.',
        requirements: [{ type: 'STORY_MIN', value: 30 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-trip'
    },
    'slice-event-graduation': {
        id: 'slice-event-graduation',
        name: 'Graduation Ceremony',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'Adiós a la juventud.',
        requirements: [
            { type: 'STORY_MIN', value: 40 },
            { type: 'EVENT_COMPLETED', cardIds: ['slice-event-exam'] }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.SLICE_OF_LIFE,
        image: 'slice-event-graduation'
    },

    // ============================================
    // SHOJO
    // "Romance, Magic, Sparkles"
    // Style: Emotions, Transformations, Support
    // ============================================

    // --- PROTAGONISTS ---
    'shojo-protagonist-magical': {
        id: 'shojo-protagonist-magical',
        name: 'Card Captor Girl',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Captura cartas mágicas.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-protagonist-magical',
        maxCopies: 1,
        likesData: { likes: ['shojo-item-wand', 'shojo-char-mascot'], dislikes: [] },
        affinity: { compatibleWith: ['shojo-char-rival'] }
    },
    'shojo-protagonist-ordinary': {
        id: 'shojo-protagonist-ordinary',
        name: 'Ordinary Girl',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Se enamora del chico popular.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-protagonist-ordinary',
        maxCopies: 1,
        likesData: { likes: ['shojo-item-chocolate'], dislikes: [] },
        affinity: { compatibleWith: ['shojo-char-popular'] }
    },
    'shojo-protagonist-princess': {
        id: 'shojo-protagonist-princess',
        name: 'Lost Princess',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Realeza oculta.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-protagonist-princess',
        maxCopies: 1,
        likesData: { likes: ['shojo-item-tiara'], dislikes: [] },
        affinity: { compatibleWith: ['shojo-char-knight'] }
    },

    // --- CHARACTERS ---
    'shojo-char-popular': {
        id: 'shojo-char-popular',
        name: 'Popular Boy',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Príncipe del colegio.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-popular'
    },
    'shojo-char-mascot': {
        id: 'shojo-char-mascot',
        name: 'Magical Mascot',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Kero Kero.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-mascot'
    },
    'shojo-char-rival': {
        id: 'shojo-char-rival',
        name: 'Rival Card User',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Viene de Hong Kong.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-rival'
    },
    'shojo-char-knight': {
        id: 'shojo-char-knight',
        name: 'White Knight',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Tuxedo Mask.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-knight'
    },
    'shojo-char-friend': {
        id: 'shojo-char-friend',
        name: 'Supportive Friend',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Graba tus hazañas.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-friend'
    },
    'shojo-char-villain': {
        id: 'shojo-char-villain',
        name: 'Dark General',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Busca energía.',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-villain'
    },
    'shojo-char-idol': {
        id: 'shojo-char-idol',
        name: 'Idol Singer',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Canta para salvar.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-idol'
    },
    'shojo-char-brother': {
        id: 'shojo-char-brother',
        name: 'Overprotective Brother',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Complejo de hermana.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-brother'
    },
    'shojo-char-badboy': {
        id: 'shojo-char-badboy',
        name: 'Bad Boy',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Tiene buen corazón.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-badboy'
    },
    'shojo-char-fairy': {
        id: 'shojo-char-fairy',
        name: 'Tiny Fairy',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Oye, escucha.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-char-fairy'
    },

    // --- ITEMS ---
    'shojo-item-wand': {
        id: 'shojo-item-wand',
        name: 'Sealing Wands',
        type: CardType.ITEM,
        cost: 2,
        description: 'Libera tu poder.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-wand'
    },
    'shojo-item-ribbon': {
        id: 'shojo-item-ribbon',
        name: 'Transformation Ribbon',
        type: CardType.ITEM,
        cost: 1,
        description: 'Secuencia de transformación.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-ribbon'
    },
    'shojo-item-chocolate': {
        id: 'shojo-item-chocolate',
        name: 'Valentine Chocolate',
        type: CardType.ITEM,
        cost: 1,
        description: 'Giri o Honmei.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-chocolate'
    },
    'shojo-item-tiara': {
        id: 'shojo-item-tiara',
        name: 'Crystal Tiara',
        type: CardType.ITEM,
        cost: 2,
        description: 'Poder real.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-tiara'
    },
    'shojo-item-key': {
        id: 'shojo-item-key',
        name: 'Dream Key',
        type: CardType.ITEM,
        cost: 1,
        description: 'Abre puertas.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-key'
    },
    'shojo-item-pendant': {
        id: 'shojo-item-pendant',
        name: 'Locket Pendant',
        type: CardType.ITEM,
        cost: 1,
        description: 'Recuerdo familiar.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-pendant'
    },
    'shojo-item-mirror': {
        id: 'shojo-item-mirror',
        name: 'Magic Mirror',
        type: CardType.ITEM,
        cost: 2,
        description: 'Revela la verdad.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-mirror'
    },
    'shojo-item-card': {
        id: 'shojo-item-card',
        name: 'Mystic Card',
        type: CardType.ITEM,
        cost: 1,
        description: 'Una carta atrapada.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-item-card'
    },

    // --- LOCATIONS ---
    'shojo-loc-tower': {
        id: 'shojo-loc-tower',
        name: 'Tokyo Tower',
        type: CardType.LOCATION,
        cost: 3,
        description: 'Escenario final.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-loc-tower'
    },
    'shojo-loc-park': {
        id: 'shojo-loc-park',
        name: 'Amusement Park',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Lugar de citas.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-loc-park'
    },
    'shojo-loc-shrine': {
        id: 'shojo-loc-shrine',
        name: 'Hilltop Shrine',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Donde vive la sacerdotisa.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-loc-shrine'
    },
    'shojo-loc-school': {
        id: 'shojo-loc-school',
        name: 'Girls Academy',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Elegante y estricta.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-loc-school'
    },
    'shojo-loc-cafe': {
        id: 'shojo-loc-cafe',
        name: 'Sweet Cafe',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Parfaits deliciosos.',
        effects: [],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-loc-cafe'
    },
    'shojo-loc-castle': {
        id: 'shojo-loc-castle',
        name: 'Moon Castle',
        type: CardType.LOCATION,
        cost: 3,
        description: 'Reino pasado.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-loc-castle'
    },

    // --- EVENTS ---
    'shojo-event-meet': {
        id: 'shojo-event-meet',
        name: 'Fated Encounter',
        type: CardType.EVENT,
        cost: 1,
        description: 'Nos conocimos bajo la lluvia.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-meet'
    },
    'shojo-event-transform': {
        id: 'shojo-event-transform',
        name: 'First Transformation',
        type: CardType.EVENT,
        cost: 1,
        description: '¡Make Up!',
        requirements: [{ type: 'STORY_MIN', value: 3 }],
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-transform'
    },
    'shojo-event-date': {
        id: 'shojo-event-date',
        name: 'First Date',
        type: CardType.EVENT,
        cost: 2,
        description: 'Nervios y risas.',
        requirements: [{ type: 'STORY_MIN', value: 8 }],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-date'
    },
    'shojo-event-capture': {
        id: 'shojo-event-capture',
        name: 'Card Capture',
        type: CardType.EVENT,
        cost: 2,
        description: 'Sellando el espíritu.',
        requirements: [{ type: 'STORY_MIN', value: 10 }, { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-capture'
    },
    'shojo-event-reveal': {
        id: 'shojo-event-reveal',
        name: 'Identity Reveal',
        type: CardType.EVENT,
        cost: 3,
        description: '¿Eres tú?',
        requirements: [{ type: 'STORY_MIN', value: 15 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-reveal'
    },
    'shojo-event-betrayal': {
        id: 'shojo-event-betrayal',
        name: 'Friend\'s Betrayal',
        type: CardType.EVENT,
        cost: 3,
        description: 'Control mental.',
        requirements: [{ type: 'STORY_MIN', value: 20 }],
        effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-betrayal'
    },
    'shojo-event-sacrifice': {
        id: 'shojo-event-sacrifice',
        name: 'Noble Sacrifice',
        type: CardType.EVENT,
        cost: 4,
        description: 'Proteger al amado.',
        requirements: [{ type: 'STORY_MIN', value: 25 }],
        effects: [{ type: EffectType.FILLER, value: -3, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-sacrifice'
    },
    'shojo-event-powerup': {
        id: 'shojo-event-powerup',
        name: 'Eternal Power',
        type: CardType.EVENT,
        cost: 4,
        description: 'Nueva forma final.',
        requirements: [{ type: 'STORY_MIN', value: 30 }],
        effects: [{ type: EffectType.STORY, value: 4, target: 'SELF' }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-powerup'
    },
    'shojo-event-final': {
        id: 'shojo-event-final',
        name: 'Moonlight Finale',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'Purificación total.',
        requirements: [
            { type: 'STORY_MIN', value: 40 },
            { type: 'EVENT_COMPLETED', cardIds: ['shojo-event-powerup'] }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.SHOJO,
        image: 'shojo-event-final'
    },

    // ============================================
    // HAREM
    // "One guy, too many girls"
    // Style: Swarm, Choice paralysis, Luck
    // ============================================

    // --- PROTAGONISTS ---
    'harem-protagonist-average': {
        id: 'harem-protagonist-average',
        name: 'Average Highschooler',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Extremadamente normal.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-protagonist-average',
        maxCopies: 1,
        likesData: { likes: ['harem-item-console'], dislikes: [] },
        affinity: { compatibleWith: ['harem-char-childhood', 'harem-char-tsundere'] }
    },
    'harem-protagonist-transfer': {
        id: 'harem-protagonist-transfer',
        name: 'Transfer Student',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Llega en primavera.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-protagonist-transfer',
        maxCopies: 1,
        likesData: { likes: ['harem-loc-dorm'], dislikes: [] },
        affinity: { compatibleWith: ['harem-char-president'] }
    },
    'harem-protagonist-manager': {
        id: 'harem-protagonist-manager',
        name: 'Club Manager',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Cuida de todas.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-protagonist-manager',
        maxCopies: 1,
        likesData: { likes: ['harem-item-towel'], dislikes: [] },
        affinity: { compatibleWith: ['harem-char-idol'] }
    },

    // --- CHARACTERS ---
    'harem-char-childhood': {
        id: 'harem-char-childhood',
        name: 'Childhood Friend',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'La primera en perder.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-childhood',
        affinity: { compatibleWith: ['harem-protagonist-average'] }
    },
    'harem-char-tsundere': {
        id: 'harem-char-tsundere',
        name: 'Blonde Tsundere',
        type: CardType.PERSONAJE,
        cost: 2,
        description: '¡N-no es que me gustes!',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-tsundere',
        affinity: { compatibleWith: ['harem-protagonist-average'] }
    },
    'harem-char-president': {
        id: 'harem-char-president',
        name: 'Strict President',
        type: CardType.PERSONAJE,
        cost: 2,
        description: '¡Ropa inapropiada!',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-president'
    },
    'harem-char-imouto': {
        id: 'harem-char-imouto',
        name: 'Cute Little Sister',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Despierta al prota.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-imouto'
    },
    'harem-char-sensei': {
        id: 'harem-char-sensei',
        name: 'Clumsy Teacher',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Siempre se cae.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-sensei'
    },
    'harem-char-idol': {
        id: 'harem-char-idol',
        name: 'Secret Idol',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Famosa pero solitaria.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-idol'
    },
    'harem-char-alien': {
        id: 'harem-char-alien',
        name: 'Alien Princess',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'Vino a casarse.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-alien'
    },
    'harem-char-kuudere': {
        id: 'harem-char-kuudere',
        name: 'Silent Bookworm',
        type: CardType.PERSONAJE,
        cost: 2,
        description: '...',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-kuudere'
    },
    'harem-char-slacker': {
        id: 'harem-char-slacker',
        name: 'Best Friend (Male)',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'El alivio cómico.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-slacker'
    },
    'harem-char-maid': {
        id: 'harem-char-maid',
        name: 'Battle Maid',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Limpia basura.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-char-maid'
    },

    // --- ITEMS ---
    'harem-item-console': {
        id: 'harem-item-console',
        name: 'Game Console',
        type: CardType.ITEM,
        cost: 1,
        description: 'Para jugar citas.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-console'
    },
    'harem-item-towel': {
        id: 'harem-item-towel',
        name: 'Lucky Towel',
        type: CardType.ITEM,
        cost: 1,
        description: 'Accidente garantizado.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-towel'
    },
    'harem-item-chocolate': {
        id: 'harem-item-chocolate',
        name: 'Obligatory Chocolate',
        type: CardType.ITEM,
        cost: 1,
        description: 'Para todos.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-chocolate'
    },
    'harem-item-photo': {
        id: 'harem-item-photo',
        name: 'Embarrassing Photo',
        type: CardType.ITEM,
        cost: 2,
        description: 'Chantaje.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-photo'
    },
    'harem-item-keys': {
        id: 'harem-item-keys',
        name: 'Spare Keys',
        type: CardType.ITEM,
        cost: 1,
        description: 'Entran cuando quieren.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-keys'
    },
    'harem-item-diary': {
        id: 'harem-item-diary',
        name: 'Secret Diary',
        type: CardType.ITEM,
        cost: 1,
        description: 'Sentimientos ocultos.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-diary'
    },
    'harem-item-phone': {
        id: 'harem-item-phone',
        name: 'Smartphone',
        type: CardType.ITEM,
        cost: 1,
        description: 'Intercambio de contactos.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-phone'
    },
    'harem-item-costume': {
        id: 'harem-item-costume',
        name: 'Bunny Suit',
        type: CardType.ITEM,
        cost: 2,
        description: '¿Por qué?',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-item-costume'
    },

    // --- LOCATIONS ---
    'harem-loc-dorm': {
        id: 'harem-loc-dorm',
        name: 'Shared Dorm',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Aquí viven tods.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-loc-dorm'
    },
    'harem-loc-beach': {
        id: 'harem-loc-beach',
        name: 'Private Beach',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Vacaciones de verano.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-loc-beach'
    },
    'harem-loc-onsen': {
        id: 'harem-loc-onsen',
        name: 'Hot Springs',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Paredes delgadas.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-loc-onsen'
    },
    'harem-loc-roof': {
        id: 'harem-loc-roof',
        name: 'School Roof',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Almuerzos.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-loc-roof'
    },
    'harem-loc-house': {
        id: 'harem-loc-house',
        name: 'Protagonist\'s House',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Padres de viaje.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-loc-house'
    },
    'harem-loc-pool': {
        id: 'harem-loc-pool',
        name: 'School Pool',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Clase de natación.',
        effects: [],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-loc-pool'
    },

    // --- EVENTS ---
    'harem-event-fall': {
        id: 'harem-event-fall',
        name: 'Lucky Pervert Fall',
        type: CardType.EVENT,
        cost: 1,
        description: 'Oops.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-fall'
    },
    'harem-event-transfer': {
        id: 'harem-event-transfer',
        name: 'New Student Arrives',
        type: CardType.EVENT,
        cost: 1,
        description: 'Una más para el harem.',
        requirements: [{ type: 'STORY_MIN', value: 2 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-transfer'
    },
    'harem-event-date': {
        id: 'harem-event-date',
        name: 'Weekend Date',
        type: CardType.EVENT,
        cost: 2,
        description: 'Cita a ciegas.',
        requirements: [{ type: 'STORY_MIN', value: 5 }],
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-date'
    },
    'harem-event-valentines': {
        id: 'harem-event-valentines',
        name: 'Valentine\'s Chaos',
        type: CardType.EVENT,
        cost: 2,
        description: 'Guerra de chocolate.',
        requirements: [{ type: 'STORY_MIN', value: 10 }],
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-valentines'
    },
    'harem-event-beach': {
        id: 'harem-event-beach',
        name: 'Beach Volleyball',
        type: CardType.EVENT,
        cost: 3,
        description: 'Fanservice obligatorio.',
        requirements: [{ type: 'STORY_MIN', value: 15 }],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-beach'
    },
    'harem-event-study': {
        id: 'harem-event-study',
        name: 'Study Group',
        type: CardType.EVENT,
        cost: 2,
        description: 'Nadie estudia.',
        requirements: [{ type: 'STORY_MIN', value: 12 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-study'
    },
    'harem-event-festival': {
        id: 'harem-event-festival',
        name: 'Fireworks Festival',
        type: CardType.EVENT,
        cost: 3,
        description: 'Yukatas y confesiones fallidas.',
        requirements: [{ type: 'STORY_MIN', value: 20 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-festival'
    },
    'harem-event-jealousy': {
        id: 'harem-event-jealousy',
        name: 'Jealousy Storm',
        type: CardType.EVENT,
        cost: 3,
        description: 'El harem se pelea.',
        requirements: [{ type: 'STORY_MIN', value: 25 }],
        effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-jealousy'
    },
    'harem-event-final': {
        id: 'harem-event-final',
        name: 'The Choice',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'Elegir a una... o a todas.',
        requirements: [
            { type: 'STORY_MIN', value: 40 },
            { type: 'CARD_ON_BOARD', value: 3, cardType: CardType.PERSONAJE } // Max harem power
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.HAREM,
        image: 'harem-event-final'
    },

    // ============================================
    // ISEKAI
    // "Reincarnated in another world"
    // Style: Overpowered start, Scaling, Adventure
    // ============================================

    // --- PROTAGONISTS ---
    'isekai-protagonist-op': {
        id: 'isekai-protagonist-op',
        name: 'Overpowered Hero',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Nivel 999 desde el inicio.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-protagonist-op',
        maxCopies: 1,
        likesData: { likes: ['isekai-item-smartphone'], dislikes: ['isekai-loc-capital'] },
        affinity: { compatibleWith: ['isekai-char-slave'] }
    },
    'isekai-protagonist-monster': {
        id: 'isekai-protagonist-monster',
        name: 'Reincarnated as Slime',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Construye una nación.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-protagonist-monster',
        maxCopies: 1,
        likesData: { likes: ['isekai-loc-village'], dislikes: [] },
        affinity: { compatibleWith: ['isekai-char-dragon'] }
    },
    'isekai-protagonist-villainess': {
        id: 'isekai-protagonist-villainess',
        name: 'Eco-Farming Villainess',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Cultiva arroz y evita la muerte.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-protagonist-villainess',
        maxCopies: 1,
        likesData: { likes: ['isekai-item-map'], dislikes: ['isekai-loc-castle'] },
        affinity: { compatibleWith: ['isekai-char-merchant'] }
    },

    // --- CHARACTERS ---
    'isekai-char-slave': {
        id: 'isekai-char-slave',
        name: 'Beastkin Companion',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Leal hasta la muerte.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-slave'
    },
    'isekai-char-goddess': {
        id: 'isekai-char-goddess',
        name: 'Useless Goddess',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Bebe todo el día.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'SELF' }], // Negative effect for balance? Or just adds filler (bad)
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-goddess'
    },
    'isekai-char-dragon': {
        id: 'isekai-char-dragon',
        name: 'Storm Dragon',
        type: CardType.PERSONAJE,
        cost: 4,
        description: 'Calamidad clase S.',
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-dragon'
    },
    'isekai-char-demon-lord': {
        id: 'isekai-char-demon-lord',
        name: 'Demon Lord',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'El jefe final... o waifu.',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-demon-lord'
    },
    'isekai-char-adventurer': {
        id: 'isekai-char-adventurer',
        name: 'Guild Receptionist',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Da las misiones.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-adventurer'
    },
    'isekai-char-elf': {
        id: 'isekai-char-elf',
        name: 'High Elf Archer',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Odia a los enanos.',
        effects: [],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-elf'
    },
    'isekai-char-truck': {
        id: 'isekai-char-truck',
        name: 'Truck-kun',
        type: CardType.PERSONAJE,
        cost: 3,
        description: 'El asesino en serie.',
        effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-char-truck'
    },

    // --- ITEMS ---
    'isekai-item-smartphone': {
        id: 'isekai-item-smartphone',
        name: 'Smart Phone',
        type: CardType.ITEM,
        cost: 2,
        description: 'Magia moderna.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-item-smartphone'
    },
    'isekai-item-sword': {
        id: 'isekai-item-sword',
        name: 'Holy Sword',
        type: CardType.ITEM,
        cost: 2,
        description: 'Reliquia legendaria.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-item-sword'
    },
    'isekai-item-money': {
        id: 'isekai-item-money',
        name: 'Infinite Gold',
        type: CardType.ITEM,
        cost: 1,
        description: 'Inflación económica.',
        effects: [],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-item-money'
    },
    'isekai-item-grimoire': {
        id: 'isekai-item-grimoire',
        name: 'Forbidden Grimoire',
        type: CardType.ITEM,
        cost: 2,
        description: 'Magia antigua.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-item-grimoire'
    },

    // --- LOCATIONS ---
    'isekai-loc-guild': {
        id: 'isekai-loc-guild',
        name: 'Adventurer Guild',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Punto de reunión.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-loc-guild'
    },
    'isekai-loc-castle': {
        id: 'isekai-loc-castle',
        name: 'Demon Castle',
        type: CardType.LOCATION,
        cost: 3,
        description: 'Territorio enemigo.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-loc-castle'
    },
    'isekai-loc-village': {
        id: 'isekai-loc-village',
        name: 'Starter Village',
        type: CardType.LOCATION,
        cost: 1,
        description: 'Paz relativa.',
        effects: [],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-loc-village'
    },
    'isekai-loc-dungeon': {
        id: 'isekai-loc-dungeon',
        name: 'Great Dungeon',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Farmear XP.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-loc-dungeon'
    },

    // --- EVENTS ---
    'isekai-event-summon': {
        id: 'isekai-event-summon',
        name: 'Hero Summoning',
        type: CardType.EVENT,
        cost: 1,
        description: 'Invocado a otro mundo.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-event-summon'
    },
    'isekai-event-cheat': {
        id: 'isekai-event-cheat',
        name: 'Cheat Skill',
        type: CardType.EVENT,
        cost: 1,
        description: 'Habilidad rota.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-event-cheat'
    },
    'isekai-event-quest': {
        id: 'isekai-event-quest',
        name: 'First Quest',
        type: CardType.EVENT,
        cost: 2,
        description: 'Matar goblins.',
        requirements: [{ type: 'STORY_MIN', value: 5 }],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-event-quest'
    },
    'isekai-event-harem': {
        id: 'isekai-event-harem',
        name: 'Harem Growth',
        type: CardType.EVENT,
        cost: 3,
        description: 'Otra chica se une.',
        requirements: [{ type: 'STORY_MIN', value: 15 }, { type: 'CARD_ON_BOARD', value: 1, tag: 'protagonist' }],
        effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-event-harem'
    },
    'isekai-event-war': {
        id: 'isekai-event-war',
        name: 'Kingdom War',
        type: CardType.EVENT,
        cost: 4,
        description: 'Batalla a gran escala.',
        requirements: [{ type: 'STORY_MIN', value: 25 }],
        effects: [{ type: EffectType.FILLER, value: 4, target: 'OPPONENT' }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-event-war'
    },
    'isekai-event-final': {
        id: 'isekai-event-final',
        name: 'Defeat Demon Lord',
        type: CardType.EVENT_FINAL,
        cost: 6,
        description: 'Salvar el mundo (y quedarse).',
        requirements: [
            { type: 'STORY_MIN', value: 45 },
            { type: 'EVENT_COMPLETED', cardIds: ['isekai-event-war'] }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.ISEKAI,
        image: 'isekai-event-final'
    },

    // ============================================
    // SURVIVAL GAME
    // "Death games, battle royale"
    // Style: Elimination, High Filler Damage, Risk
    // ============================================

    // --- MORE ISEKAI CHARACTERS ---
    'isekai-char-bandit': { id: 'isekai-char-bandit', name: 'Generic Bandit', type: CardType.PERSONAJE, cost: 1, description: 'XP fácil.', effects: [], archetype: ARCHETYPES.ISEKAI, image: 'isekai-char-bandit' },
    'isekai-char-merchant': { id: 'isekai-char-merchant', name: 'Greedy Merchant', type: CardType.PERSONAJE, cost: 2, description: 'Vende basura cara.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-char-merchant' },
    'isekai-char-king': { id: 'isekai-char-king', name: 'Worried King', type: CardType.PERSONAJE, cost: 3, description: 'Depende del héroe.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-char-king' },

    // --- MORE ISEKAI ITEMS ---
    'isekai-item-potion': { id: 'isekai-item-potion', name: 'HP Potion', type: CardType.ITEM, cost: 1, description: 'Sabe a medicina.', effects: [], archetype: ARCHETYPES.ISEKAI, image: 'isekai-item-potion' },
    'isekai-item-map': { id: 'isekai-item-map', name: 'World Map', type: CardType.ITEM, cost: 1, description: 'Áreas inexploradas.', effects: [], archetype: ARCHETYPES.ISEKAI, image: 'isekai-item-map' },
    'isekai-item-ring': { id: 'isekai-item-ring', name: 'Storage Ring', type: CardType.ITEM, cost: 2, description: 'Inventario infinito.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-item-ring' },
    'isekai-item-cloak': { id: 'isekai-item-cloak', name: 'Stealth Cloak', type: CardType.ITEM, cost: 2, description: 'Invisibilidad.', effects: [], archetype: ARCHETYPES.ISEKAI, image: 'isekai-item-cloak' },

    // --- MORE ISEKAI LOCATIONS ---
    'isekai-loc-capital': { id: 'isekai-loc-capital', name: 'Royal Capital', type: CardType.LOCATION, cost: 2, description: 'Centro del reino.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-loc-capital' },
    'isekai-loc-forest': { id: 'isekai-loc-forest', name: 'Magic Forest', type: CardType.LOCATION, cost: 1, description: 'Monstruos débiles.', effects: [], archetype: ARCHETYPES.ISEKAI, image: 'isekai-loc-forest' },

    // --- MORE ISEKAI EVENTS ---
    'isekai-event-tournament': { id: 'isekai-event-tournament', name: 'Fighting Tournament', type: CardType.EVENT, cost: 3, description: 'Demuestra tu fuerza.', requirements: [{ type: 'STORY_MIN', value: 10 }], effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-event-tournament' },
    'isekai-event-bath': { id: 'isekai-event-bath', name: 'Hot Spring Episode', type: CardType.EVENT, cost: 2, description: 'Fanservice obligatorio.', requirements: [{ type: 'STORY_MIN', value: 5 }], effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-event-bath' },
    'isekai-event-raid': { id: 'isekai-event-raid', name: 'Dungeon Raid', type: CardType.EVENT, cost: 4, description: 'El jefe espera.', requirements: [{ type: 'STORY_MIN', value: 20 }], effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-event-raid' },
    'isekai-event-feast': { id: 'isekai-event-feast', name: 'Victory Feast', type: CardType.EVENT, cost: 2, description: 'Comida deliciosa.', requirements: [{ type: 'STORY_MIN', value: 15 }], effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-event-feast' },
    'isekai-event-reveal': { id: 'isekai-event-reveal', name: 'Secret Revealed', type: CardType.EVENT, cost: 3, description: 'La verdad del mundo.', requirements: [{ type: 'STORY_MIN', value: 30 }], effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }], archetype: ARCHETYPES.ISEKAI, image: 'isekai-event-reveal' },


    // ============================================
    // SURVIVAL GAME
    // ============================================

    // --- MORE SURVIVAL CHARACTERS ---
    'survival-char-hacker': { id: 'survival-char-hacker', name: 'Elite Hacker', type: CardType.PERSONAJE, cost: 3, description: 'Rompe el sistema.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-hacker' },
    'survival-char-soldier': { id: 'survival-char-soldier', name: 'Ex-Mercenary', type: CardType.PERSONAJE, cost: 4, description: 'Máquina de matar.', effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-soldier' },
    'survival-char-medic': { id: 'survival-char-medic', name: 'Field Medic', type: CardType.PERSONAJE, cost: 2, description: 'Primeros auxilios.', effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-medic' },
    'survival-char-rich': { id: 'survival-char-rich', name: 'Rich Sponsor', type: CardType.PERSONAJE, cost: 1, description: 'Paga por ver.', effects: [], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-rich' },
    'survival-char-observer': { id: 'survival-char-observer', name: 'The Observer', type: CardType.PERSONAJE, cost: 2, description: 'Solo mira.', effects: [], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-observer' },
    'survival-char-rival': { id: 'survival-char-rival', name: 'Crazy Rival', type: CardType.PERSONAJE, cost: 3, description: 'Tu némesis.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-rival' },
    'survival-char-idol': { id: 'survival-char-idol', name: 'Lost Idol', type: CardType.PERSONAJE, cost: 1, description: '¿Por qué está aquí?', effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-char-idol' },

    // --- MORE SURVIVAL ITEMS ---
    'survival-item-map': { id: 'survival-item-map', name: 'Radar', type: CardType.ITEM, cost: 2, description: 'Muestra enemigos.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-item-map' },
    'survival-item-food': { id: 'survival-item-food', name: 'Canned Food', type: CardType.ITEM, cost: 1, description: 'Sin fecha de caducidad.', effects: [], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-item-food' },
    'survival-item-trap': { id: 'survival-item-trap', name: 'Bear Trap', type: CardType.ITEM, cost: 2, description: 'Cuidado donde pisas.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-item-trap' },
    'survival-item-radio': { id: 'survival-item-radio', name: 'Walkie Talkie', type: CardType.ITEM, cost: 1, description: 'Comunicación.', effects: [], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-item-radio' },
    'survival-item-backpack': { id: 'survival-item-backpack', name: 'Large Backpack', type: CardType.ITEM, cost: 1, description: 'Más espacio.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-item-backpack' },

    // --- MORE SURVIVAL LOCATIONS ---
    'survival-loc-forest': { id: 'survival-loc-forest', name: 'Dark Forest', type: CardType.LOCATION, cost: 1, description: 'Fácil perderse.', effects: [], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-loc-forest' },
    'survival-loc-ruins': { id: 'survival-loc-ruins', name: 'City Ruins', type: CardType.LOCATION, cost: 2, description: 'Edificios caídos.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-loc-ruins' },
    'survival-loc-base': { id: 'survival-loc-base', name: 'Secret Base', type: CardType.LOCATION, cost: 3, description: 'Refugio seguro.', effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-loc-base' },
    'survival-loc-arena': { id: 'survival-loc-arena', name: 'Central Arena', type: CardType.LOCATION, cost: 2, description: 'Donde todo termina.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-loc-arena' },

    // --- MORE SURVIVAL EVENTS ---
    'survival-event-alliance': { id: 'survival-event-alliance', name: 'Temporary Alliance', type: CardType.EVENT, cost: 2, description: 'Hasta que convenga.', requirements: [{ type: 'STORY_MIN', value: 5 }], effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-alliance' },
    'survival-event-ambush': { id: 'survival-event-ambush', name: 'Night Ambush', type: CardType.EVENT, cost: 3, description: 'No vieron venir.', requirements: [{ type: 'STORY_MIN', value: 10 }], effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-ambush' },
    'survival-event-supply': { id: 'survival-event-supply', name: 'Supply Drop', type: CardType.EVENT, cost: 1, description: 'Carrera por el loot.', requirements: [{ type: 'STORY_MIN', value: 0 }], effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-supply' },
    'survival-event-escape': { id: 'survival-event-escape', name: 'Narrow Escape', type: CardType.EVENT, cost: 2, description: 'Por poco.', requirements: [{ type: 'STORY_MIN', value: 15 }], effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-escape' },
    'survival-event-duel': { id: 'survival-event-duel', name: '1v1 Duel', type: CardType.EVENT, cost: 4, description: 'Sin interrupciones.', requirements: [{ type: 'STORY_MIN', value: 25 }], effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-duel' },
    'survival-event-trap': { id: 'survival-event-trap', name: 'Trap Triggered', type: CardType.EVENT, cost: 2, description: '¡Era una trampa!', requirements: [{ type: 'STORY_MIN', value: 5 }], effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-trap' },
    'survival-event-broadcast': { id: 'survival-event-broadcast', name: 'Morning Broadcast', type: CardType.EVENT, cost: 1, description: 'Anuncio de bajas.', requirements: [{ type: 'STORY_MIN', value: 0 }], effects: [], archetype: ARCHETYPES.SURVIVAL_GAME, image: 'survival-event-broadcast' },

    'survival-protagonist-psycho': {
        id: 'survival-protagonist-psycho',
        name: 'Psychopath',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Lo disfruta.',
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-protagonist-psycho',
        maxCopies: 1,
        likesData: { likes: ['survival-item-knife'], dislikes: [] },
        affinity: { compatibleWith: [] }
    },

    'survival-protagonist-coward': {
        id: 'survival-protagonist-coward',
        name: 'Lucky Coward',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Sobrevive por error.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-protagonist-coward',
        maxCopies: 1,
        likesData: { likes: ['survival-item-vest'], dislikes: [] },
        affinity: { compatibleWith: ['survival-char-protector'] }
    },

    // Characters
    'survival-char-protector': {
        id: 'survival-char-protector',
        name: 'Selfless Protector',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Muere por ti.',
        effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-char-protector'
    },
    'survival-char-traitor': {
        id: 'survival-char-traitor',
        name: 'Secret Traitor',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Te apuñalará.',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-char-traitor'
    },
    'survival-char-mastermind': {
        id: 'survival-char-mastermind',
        name: 'Game Master',
        type: CardType.PERSONAJE,
        cost: 4,
        description: 'Controla las reglas.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-char-mastermind'
    },

    // Items
    'survival-item-gun': {
        id: 'survival-item-gun',
        name: 'Handgun',
        type: CardType.ITEM,
        cost: 2,
        description: 'Munición limitada.',
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-item-gun'
    },
    'survival-item-knife': {
        id: 'survival-item-knife',
        name: 'Survival Knife',
        type: CardType.ITEM,
        cost: 1,
        description: 'Cuerpo a cuerpo.',
        effects: [],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-item-knife'
    },
    'survival-item-vest': {
        id: 'survival-item-vest',
        name: 'Bulletproof Vest',
        type: CardType.ITEM,
        cost: 2,
        description: 'Una vida extra.',
        effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-item-vest'
    },

    // Locations
    'survival-loc-island': {
        id: 'survival-loc-island',
        name: 'Deserted Island',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Área restringida.',
        effects: [],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-loc-island'
    },
    'survival-loc-school': {
        id: 'survival-loc-school',
        name: 'Locked School',
        type: CardType.LOCATION,
        cost: 2,
        description: 'Nadie sale.',
        effects: [],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-loc-school'
    },

    // Events
    'survival-event-start': {
        id: 'survival-event-start',
        name: 'Game Start',
        type: CardType.EVENT,
        cost: 1,
        description: 'Las reglas son simples.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.FILLER, value: 1, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-event-start'
    },
    'survival-event-betrayal': {
        id: 'survival-event-betrayal',
        name: 'Sudden Betrayal',
        type: CardType.EVENT,
        cost: 2,
        description: 'Confianza rota.',
        requirements: [{ type: 'STORY_MIN', value: 10 }],
        effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-event-betrayal'
    },
    'survival-event-sacrifice': {
        id: 'survival-event-sacrifice',
        name: 'Heroic Death',
        type: CardType.EVENT,
        cost: 3,
        description: 'Gana tiempo.',
        requirements: [{ type: 'STORY_MIN', value: 20 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-event-sacrifice'
    },
    'survival-event-final': {
        id: 'survival-event-final',
        name: 'Last Man Standing',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'Solo puede quedar uno.',
        requirements: [
            { type: 'STORY_MIN', value: 40 },
            { type: 'EVENT_COMPLETED', cardIds: ['survival-event-betrayal'] }
        ],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.SURVIVAL_GAME,
        image: 'survival-event-final'
    },

    // ============================================
    // SPOKON (Sports)
    // "Effort, Teamwork, Tournaments"
    // Style: Combo, Training, Momentum
    // ============================================

    // --- MORE SPOKON CHARACTERS ---
    'spokon-char-rival': { id: 'spokon-char-rival', name: 'Arrogant Rival', type: CardType.PERSONAJE, cost: 3, description: 'Se cree el mejor.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-rival' },
    'spokon-char-newbie': { id: 'spokon-char-newbie', name: 'Inspired Newbie', type: CardType.PERSONAJE, cost: 1, description: 'Quiere aprender.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-newbie' },
    'spokon-char-veteran': { id: 'spokon-char-veteran', name: 'Injured Veteran', type: CardType.PERSONAJE, cost: 2, description: 'Último año.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-veteran' },
    'spokon-char-cheer': { id: 'spokon-char-cheer', name: 'Head Cheerleader', type: CardType.PERSONAJE, cost: 1, description: 'Motivación.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-cheer' },
    'spokon-char-scout': { id: 'spokon-char-scout', name: 'Pro Scout', type: CardType.PERSONAJE, cost: 2, description: 'Observando.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-scout' },
    'spokon-char-doctor': { id: 'spokon-char-doctor', name: 'Team Doctor', type: CardType.PERSONAJE, cost: 2, description: 'Cuida la salud.', effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-doctor' },
    'spokon-char-reporter': { id: 'spokon-char-reporter', name: 'Sports Reporter', type: CardType.PERSONAJE, cost: 1, description: 'Entrevista.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-char-reporter' },

    // --- MORE SPOKON ITEMS ---
    'spokon-item-towel': { id: 'spokon-item-towel', name: 'Sweat Towel', type: CardType.ITEM, cost: 1, description: 'Seca el sudor.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-item-towel' },
    'spokon-item-bottle': { id: 'spokon-item-bottle', name: 'Water Bottle', type: CardType.ITEM, cost: 1, description: 'Hidratación.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-item-bottle' },
    'spokon-item-uniform': { id: 'spokon-item-uniform', name: 'Team Uniform', type: CardType.ITEM, cost: 2, description: 'Orgullo de equipo.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-item-uniform' },
    'spokon-item-trophy': { id: 'spokon-item-trophy', name: 'Old Trophy', type: CardType.ITEM, cost: 2, description: 'Gloria pasada.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-item-trophy' },
    'spokon-item-bandage': { id: 'spokon-item-bandage', name: 'Knee Bandage', type: CardType.ITEM, cost: 1, description: 'Soporte.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-item-bandage' },
    'spokon-item-whistle': { id: 'spokon-item-whistle', name: 'Coach Whistle', type: CardType.ITEM, cost: 1, description: '¡Corran!', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-item-whistle' },

    // --- MORE SPOKON LOCATIONS ---
    'spokon-loc-gym': { id: 'spokon-loc-gym', name: 'School Gym', type: CardType.LOCATION, cost: 1, description: 'Donde todo empieza.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-loc-gym' },
    'spokon-loc-field': { id: 'spokon-loc-field', name: 'Soccer Field', type: CardType.LOCATION, cost: 2, description: 'Césped verde.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-loc-field' },
    'spokon-loc-locker': { id: 'spokon-loc-locker', name: 'Locker Room', type: CardType.LOCATION, cost: 1, description: 'Charlas de ánimo.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-loc-locker' },
    'spokon-loc-stadium': { id: 'spokon-loc-stadium', name: 'Pro Stadium', type: CardType.LOCATION, cost: 3, description: 'Luces brillantes.', effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-loc-stadium' },
    'spokon-loc-park': { id: 'spokon-loc-park', name: 'Local Park', type: CardType.LOCATION, cost: 1, description: 'Entreno extra.', effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-loc-park' },
    'spokon-loc-hospital': { id: 'spokon-loc-hospital', name: 'Hospital', type: CardType.LOCATION, cost: 2, description: 'Rehabilitación.', effects: [{ type: EffectType.FILLER, value: -2, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-loc-hospital' },

    // --- MORE SPOKON EVENTS ---
    'spokon-event-scrimmage': { id: 'spokon-event-scrimmage', name: 'Practice Match', type: CardType.EVENT, cost: 2, description: 'Probar estrategias.', requirements: [{ type: 'STORY_MIN', value: 5 }], effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-scrimmage' },
    'spokon-event-injury': { id: 'spokon-event-injury', name: 'Sudden Injury', type: CardType.EVENT, cost: 2, description: 'Momento dramático.', requirements: [{ type: 'STORY_MIN', value: 15 }], effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-injury' },
    'spokon-event-speech': { id: 'spokon-event-speech', name: 'Motivational Speech', type: CardType.EVENT, cost: 1, description: '¡No se rindan!', requirements: [{ type: 'STORY_MIN', value: 20 }], effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-speech' },
    'spokon-event-rivalry': { id: 'spokon-event-rivalry', name: 'Rival Confrontation', type: CardType.EVENT, cost: 3, description: 'Choque de ideales.', requirements: [{ type: 'STORY_MIN', value: 25 }], effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-rivalry' },
    'spokon-event-comeback': { id: 'spokon-event-comeback', name: 'Miracle Comeback', type: CardType.EVENT, cost: 4, description: 'Último minuto.', requirements: [{ type: 'STORY_MIN', value: 35 }], effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-comeback' },
    'spokon-event-recruit': { id: 'spokon-event-recruit', name: 'New Member', type: CardType.EVENT, cost: 1, description: 'Sangre nueva.', requirements: [{ type: 'STORY_MIN', value: 0 }], effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-recruit' },
    'spokon-event-camp': { id: 'spokon-event-camp', name: 'Summer Camp', type: CardType.EVENT, cost: 2, description: 'Comer curry.', requirements: [{ type: 'STORY_MIN', value: 10 }], effects: [], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-camp' },


    // ============================================
    // KAIJU
    // ============================================

    'kaiju-protagonist-mecha': { id: 'kaiju-protagonist-mecha', name: 'Mecha Pilot', type: CardType.PROTAGONIST, cost: 0, description: 'Robot vs Monstruo.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-protagonist-mecha', maxCopies: 1, likesData: { likes: [], dislikes: [] }, affinity: { compatibleWith: [] } },
    'kaiju-protagonist-civilian': { id: 'kaiju-protagonist-civilian', name: 'Survivor', type: CardType.PROTAGONIST, cost: 0, description: 'Corre por su vida.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-protagonist-civilian', maxCopies: 1, likesData: { likes: [], dislikes: [] }, affinity: { compatibleWith: [] } },

    // --- MORE KAIJU CHARACTERS ---
    'kaiju-char-general': { id: 'kaiju-char-general', name: 'Stern General', type: CardType.PERSONAJE, cost: 3, description: 'Ordena el ataque.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-general' },
    'kaiju-char-biologist': { id: 'kaiju-char-biologist', name: 'Marine Biologist', type: CardType.PERSONAJE, cost: 2, description: 'Estudia la sangre.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-biologist' },
    'kaiju-char-alien': { id: 'kaiju-char-alien', name: 'Alien Invader', type: CardType.PERSONAJE, cost: 4, description: 'Controla al kaiju.', effects: [{ type: EffectType.FILLER, value: 3, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-alien' },
    'kaiju-char-reporter': { id: 'kaiju-char-reporter', name: 'News Chopper', type: CardType.PERSONAJE, cost: 1, description: 'Vista aérea.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-reporter' },
    'kaiju-char-child': { id: 'kaiju-char-child', name: 'Psychic Child', type: CardType.PERSONAJE, cost: 2, description: 'Habla con ellos.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-child' },
    'kaiju-char-robot': { id: 'kaiju-char-robot', name: 'Defense Droid', type: CardType.PERSONAJE, cost: 2, description: 'Carne de cañón.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-robot' },
    'kaiju-char-moth': { id: 'kaiju-char-moth', name: 'Giant Moth', type: CardType.PERSONAJE, cost: 4, description: 'Protector antiguo.', effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-moth' },
    'kaiju-char-three-head': { id: 'kaiju-char-three-head', name: 'Three-Head Dragon', type: CardType.PERSONAJE, cost: 5, description: 'Rey del terror.', effects: [{ type: EffectType.FILLER, value: 4, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-char-three-head' },

    // --- MORE KAIJU ITEMS ---
    'kaiju-item-tank': { id: 'kaiju-item-tank', name: 'MB Tank', type: CardType.ITEM, cost: 2, description: 'Inútil pero vistoso.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-tank' },
    'kaiju-item-fighter': { id: 'kaiju-item-fighter', name: 'Jet Fighter', type: CardType.ITEM, cost: 2, description: 'Vuela rápido.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-fighter' },
    'kaiju-item-maser': { id: 'kaiju-item-maser', name: 'Maser Cannon', type: CardType.ITEM, cost: 3, description: 'Rayo eléctrico.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-maser' },
    'kaiju-item-bunker': { id: 'kaiju-item-bunker', name: 'Shelter Key', type: CardType.ITEM, cost: 1, description: 'Acceso seguro.', effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-bunker' },
    'kaiju-item-geiger': { id: 'kaiju-item-geiger', name: 'Geiger Counter', type: CardType.ITEM, cost: 1, description: 'Detecta radiación.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-geiger' },
    'kaiju-item-sample': { id: 'kaiju-item-sample', name: 'Tissue Sample', type: CardType.ITEM, cost: 2, description: 'ADN monstruoso.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-sample' },
    'kaiju-item-missile': { id: 'kaiju-item-missile', name: 'Nuke (Tactical)', type: CardType.ITEM, cost: 4, description: 'Último recurso.', effects: [{ type: EffectType.FILLER, value: 5, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-missile' },
    'kaiju-item-blueprint': { id: 'kaiju-item-blueprint', name: 'Mecha Plans', type: CardType.ITEM, cost: 2, description: 'Diseño secreto.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-item-blueprint' },

    // --- MORE KAIJU LOCATIONS ---
    'kaiju-loc-tokyo': { id: 'kaiju-loc-tokyo', name: 'Tokyo Bay', type: CardType.LOCATION, cost: 1, description: 'Siempre atacan aquí.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-loc-tokyo' },
    'kaiju-loc-lab': { id: 'kaiju-loc-lab', name: 'Science Lab', type: CardType.LOCATION, cost: 2, description: 'Investigación.', effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-loc-lab' },
    'kaiju-loc-base': { id: 'kaiju-loc-base', name: 'Defense HQ', type: CardType.LOCATION, cost: 3, description: 'Sala de guerra.', effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-loc-base' },
    'kaiju-loc-island': { id: 'kaiju-loc-island', name: 'Monster Island', type: CardType.LOCATION, cost: 2, description: 'Zoológico natural.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-loc-island' },
    'kaiju-loc-ufo': { id: 'kaiju-loc-ufo', name: 'Mothership', type: CardType.LOCATION, cost: 3, description: 'Base alienígena.', effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-loc-ufo' },
    'kaiju-loc-ruins': { id: 'kaiju-loc-ruins', name: 'Smoking Craters', type: CardType.LOCATION, cost: 1, description: 'Lo que queda.', effects: [], archetype: ARCHETYPES.KAIJU, image: 'kaiju-loc-ruins' },

    // --- MORE KAIJU EVENTS ---
    'kaiju-event-warning': { id: 'kaiju-event-warning', name: 'Siren Warning', type: CardType.EVENT, cost: 1, description: 'Evacuación.', requirements: [{ type: 'STORY_MIN', value: 0 }], effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-warning' },
    'kaiju-event-breach': { id: 'kaiju-event-breach', name: 'Wall Breached', type: CardType.EVENT, cost: 2, description: 'Entran en la ciudad.', requirements: [{ type: 'STORY_MIN', value: 10 }], effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-breach' },
    'kaiju-event-first-fight': { id: 'kaiju-event-first-fight', name: 'First Contact', type: CardType.EVENT, cost: 3, description: 'El ejército falla.', requirements: [{ type: 'STORY_MIN', value: 15 }], effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-first-fight' },
    'kaiju-event-discovery': { id: 'kaiju-event-discovery', name: 'Weakness Found', type: CardType.EVENT, cost: 2, description: 'Es la temperatura.', requirements: [{ type: 'STORY_MIN', value: 25 }], effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-discovery' },
    'kaiju-event-rampage': { id: 'kaiju-event-rampage', name: 'Total Rampage', type: CardType.EVENT, cost: 4, description: 'Todo arde.', requirements: [{ type: 'STORY_MIN', value: 30 }], effects: [{ type: EffectType.FILLER, value: 4, target: 'OPPONENT' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-rampage' },
    'kaiju-event-reinforce': { id: 'kaiju-event-reinforce', name: 'Reinforcements', type: CardType.EVENT, cost: 2, description: 'Llegan aliados.', requirements: [{ type: 'STORY_MIN', value: 20 }], effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-reinforce' },
    'kaiju-event-rebuild': { id: 'kaiju-event-rebuild', name: 'Reconstruction', type: CardType.EVENT, cost: 1, description: 'Esperanza.', requirements: [{ type: 'STORY_MIN', value: 40 }], effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-rebuild' },
    'kaiju-event-retreat': { id: 'kaiju-event-retreat', name: 'Temporary Retreat', type: CardType.EVENT, cost: 1, description: 'Reagrupar fuerzas.', requirements: [{ type: 'STORY_MIN', value: 5 }], effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }], archetype: ARCHETYPES.KAIJU, image: 'kaiju-event-retreat' },

    'spokon-protagonist-worker': {
        id: 'spokon-protagonist-worker',
        name: 'Hard Worker',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Práctica infinita.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-protagonist-worker',
        maxCopies: 1,
        likesData: { likes: ['spokon-item-shoes'], dislikes: [] },
        affinity: { compatibleWith: ['spokon-char-coach'] }
    },
    'spokon-protagonist-spirit': {
        id: 'spokon-protagonist-spirit',
        name: 'Team Spirit',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'El corazón del equipo.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-protagonist-spirit',
        maxCopies: 1,
        likesData: { likes: ['spokon-item-uniform'], dislikes: [] },
        affinity: { compatibleWith: ['spokon-char-cheer'] }
    },

    // --- MORE SPOKON EVENTS (Need 1 more) ---
    'spokon-event-overtime': { id: 'spokon-event-overtime', name: 'Overtime', type: CardType.EVENT, cost: 3, description: 'Resistencia pura.', requirements: [{ type: 'STORY_MIN', value: 30 }], effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }], archetype: ARCHETYPES.SPOKON, image: 'spokon-event-overtime' },

    // Characters
    'spokon-char-captain': {
        id: 'spokon-char-captain',
        name: 'Reliable Captain',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Pilar del equipo.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-char-captain'
    },
    'spokon-char-coach': {
        id: 'spokon-char-coach',
        name: 'Demon Coach',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Entrenamiento infernal.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-char-coach'
    },
    'spokon-char-manager': {
        id: 'spokon-char-manager',
        name: 'Team Manager',
        type: CardType.PERSONAJE,
        cost: 1,
        description: 'Toallas y limón.',
        effects: [{ type: EffectType.FILLER, value: -1, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-char-manager'
    },

    // Items
    'spokon-item-ball': {
        id: 'spokon-item-ball',
        name: 'The Ball',
        type: CardType.ITEM,
        cost: 1,
        description: 'Es mi amigo.',
        effects: [],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-item-ball'
    },
    'spokon-item-shoes': {
        id: 'spokon-item-shoes',
        name: 'Worn Shoes',
        type: CardType.ITEM,
        cost: 1,
        description: 'Kilómetros recorridos.',
        effects: [],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-item-shoes'
    },

    // Events
    'spokon-event-loss': {
        id: 'spokon-event-loss',
        name: 'Crushing Loss',
        type: CardType.EVENT,
        cost: 2,
        description: 'Llorar en el vestuario.',
        requirements: [{ type: 'STORY_MIN', value: 5 }],
        effects: [{ type: EffectType.DRAW, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-event-loss'
    },
    'spokon-event-training': {
        id: 'spokon-event-training',
        name: 'Training Camp',
        type: CardType.EVENT,
        cost: 2,
        description: 'Playa y correr.',
        requirements: [{ type: 'STORY_MIN', value: 10 }],
        effects: [{ type: EffectType.STORY, value: 2, target: 'SELF' }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-event-training'
    },
    'spokon-event-nationals': {
        id: 'spokon-event-nationals',
        name: 'The Nationals',
        type: CardType.EVENT_FINAL,
        cost: 5,
        description: 'El escenario soñado.',
        requirements: [{ type: 'STORY_MIN', value: 40 }],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.SPOKON,
        image: 'spokon-event-nationals'
    },

    // ============================================
    // KAIJU
    // "Monsters, Destruction, Defense Force"
    // Style: High Cost, High Power, Defense
    // ============================================

    'kaiju-protagonist-force': {
        id: 'kaiju-protagonist-force',
        name: 'Defense Captain',
        type: CardType.PROTAGONIST,
        cost: 0,
        description: 'Protege la ciudad.',
        effects: [{ type: EffectType.STORY, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.KAIJU,
        image: 'kaiju-protagonist-force',
        maxCopies: 1,
        likesData: { likes: ['kaiju-item-tank'], dislikes: [] },
        affinity: { compatibleWith: ['kaiju-char-scientist'] }
    },

    // Characters
    'kaiju-char-monster': {
        id: 'kaiju-char-monster',
        name: 'Godzilla-like',
        type: CardType.PERSONAJE,
        cost: 5,
        description: 'Destructor de mundos.',
        effects: [{ type: EffectType.FILLER, value: 5, target: 'OPPONENT' }],
        archetype: ARCHETYPES.KAIJU,
        image: 'kaiju-char-monster'
    },
    'kaiju-char-scientist': {
        id: 'kaiju-char-scientist',
        name: 'Kaiju Expert',
        type: CardType.PERSONAJE,
        cost: 2,
        description: 'Busca el punto débil.',
        effects: [{ type: EffectType.DRAW, value: 1, target: 'SELF' }],
        archetype: ARCHETYPES.KAIJU,
        image: 'kaiju-char-scientist'
    },

    // Events
    'kaiju-event-appear': {
        id: 'kaiju-event-appear',
        name: 'Kaiju Appears',
        type: CardType.EVENT,
        cost: 2,
        description: 'Sale del mar.',
        requirements: [{ type: 'STORY_MIN', value: 0 }],
        effects: [{ type: EffectType.FILLER, value: 2, target: 'OPPONENT' }],
        archetype: ARCHETYPES.KAIJU,
        image: 'kaiju-event-appear'
    },
    'kaiju-event-weapon': {
        id: 'kaiju-event-weapon',
        name: 'Super Weapon',
        type: CardType.EVENT,
        cost: 4,
        description: 'Oxygen Destroyer.',
        requirements: [{ type: 'STORY_MIN', value: 20 }],
        effects: [{ type: EffectType.STORY, value: 3, target: 'SELF' }],
        archetype: ARCHETYPES.KAIJU,
        image: 'kaiju-event-weapon'
    },
    'kaiju-event-final': {
        id: 'kaiju-event-final',
        name: 'City Saved',
        type: CardType.EVENT_FINAL,
        cost: 6,
        description: 'El monstruo regresa al mar.',
        requirements: [{ type: 'STORY_MIN', value: 45 }],
        effects: [{ type: EffectType.VICTORY }],
        archetype: ARCHETYPES.KAIJU,
        image: 'kaiju-event-final'
    },

};

const BLOCK_BY_ARCHETYPE: Record<string, CardType> = {
    [ARCHETYPES.SHONEN]: CardType.PERSONAJE,
    [ARCHETYPES.MECHA]: CardType.ITEM,
    [ARCHETYPES.HAREM_INVERSO]: CardType.PERSONAJE,
    [ARCHETYPES.SLICE_OF_LIFE]: CardType.LOCATION,
    [ARCHETYPES.SHOJO]: CardType.PERSONAJE,
    [ARCHETYPES.HAREM]: CardType.PERSONAJE,
    [ARCHETYPES.ISEKAI]: CardType.ITEM,
    [ARCHETYPES.SURVIVAL_GAME]: CardType.ITEM,
    [ARCHETYPES.SPOKON]: CardType.LOCATION,
    [ARCHETYPES.KAIJU]: CardType.LOCATION,
};

function enrichCardEffects(): void {
    Object.values(CARDS).forEach(card => {
        card.effects ||= [];

        if (card.effects.length === 0) {
            if (card.type === CardType.PROTAGONIST) {
                card.effects.push({ type: EffectType.STORY, value: 1, target: 'SELF', description: `${card.name} marca el tono del episodio.` });
            } else if (card.type === CardType.PERSONAJE || card.type === CardType.CHARACTER || card.type === CardType.UNIT) {
                card.effects.push({ type: EffectType.STORY, value: 1, target: 'SELF', description: `${card.name} aporta presencia al campo.` });
            } else if (card.type === CardType.ITEM) {
                card.effects.push({ type: EffectType.DRAW, value: 1, target: 'SELF', description: `${card.name} abre una opcion tactica.` });
            } else if (card.type === CardType.LOCATION) {
                card.effects.push({ type: 'EXTRA_DRAW_NEXT_TURN', value: 1, target: 'SELF', description: `${card.name} prepara recursos para el proximo arco.` });
            } else if (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY) {
                card.effects.push({ type: EffectType.STORY, value: 2, target: 'SELF', description: `${card.name} empuja la historia.` });
            } else if (card.type === CardType.EVENT_FINAL) {
                card.effects.push({ type: EffectType.VICTORY, target: 'SELF', description: `${card.name} cierra la temporada.` });
            }
        }

        if ((card.type === CardType.EVENT || card.type === CardType.EVENT_KEY) && !card.effects.some(effect => effect.type === 'BLOCK_CARD_TYPE')) {
            card.effects.push({
                type: 'BLOCK_CARD_TYPE',
                target: 'OPPONENT',
                cardType: BLOCK_BY_ARCHETYPE[card.archetype] || CardType.ITEM,
                turns: 1,
                description: `${card.name} cambia el ritmo e impide una categoria del rival por un turno.`,
            });
        }

        if (card.type === CardType.EVENT_FINAL && !card.effects.some(effect => effect.type === 'REMOVE_OPPONENT_BOARD_CARD')) {
            card.effects.push({
                type: 'REMOVE_OPPONENT_BOARD_CARD',
                target: 'OPPONENT',
                value: 1,
                description: `${card.name} arrasa una pieza rival del campo.`,
            });
        }

        if (card.likesData?.likes?.length && !card.effects.some(effect => effect.type === 'EXTRA_DRAW_NEXT_TURN')) {
            card.effects.push({
                type: 'EXTRA_DRAW_NEXT_TURN',
                target: 'SELF',
                value: 1,
                description: `${card.name} prospera cuando sus afinidades aparecen en escena.`,
            });
        }
    });
}

enrichCardEffects();
