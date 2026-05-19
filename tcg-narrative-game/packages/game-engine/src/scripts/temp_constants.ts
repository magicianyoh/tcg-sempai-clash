// ============================================
// WebSocket Events
// ============================================

export const WS_EVENTS = {
    // Client -> Server
    MATCHMAKE_QUEUE: 'MATCHMAKE_QUEUE',
    MATCHMAKE_CANCEL: 'MATCHMAKE_CANCEL',
    LOBBY_CREATE: 'LOBBY_CREATE',
    LOBBY_JOIN: 'LOBBY_JOIN',
    LOBBY_READY: 'LOBBY_READY',
    LOBBY_LEAVE: 'LOBBY_LEAVE',
    MATCH_ACTION: 'MATCH_ACTION',
    MATCH_REJOIN: 'MATCH_REJOIN',

    // Legacy (keep for compatibility)
    JOIN_LOBBY: 'JOIN_LOBBY',
    CREATE_LOBBY: 'CREATE_LOBBY',
    READY: 'READY',
    PLAY_CARD: 'PLAY_CARD',
    END_TURN: 'END_TURN',

    // Server -> Client
    AUTH_OK: 'AUTH_OK',
    ERROR: 'ERROR',
    LOBBY_STATE: 'LOBBY_STATE',
    MATCH_FOUND: 'MATCH_FOUND',
    MATCH_STATE: 'MATCH_STATE',
    MATCH_ENDED: 'MATCH_ENDED',

    // Legacy
    LOBBY_JOINED: 'LOBBY_JOINED',
    MATCH_START: 'MATCH_START',
    GAME_UPDATE: 'GAME_UPDATE',
    GAME_OVER: 'GAME_OVER',
};

// ============================================
// Game Constants
// ============================================

export const GAME_CONSTANTS = {
    // Deck
    DECK_SIZE: 20,
    MAX_COPIES_PER_CARD: 3,
    PROTAGONIST_MAX_COPIES: 1,

    // Hand
    INITIAL_HAND_SIZE: 5,
    CARDS_DRAWN_PER_TURN: 2,
    MAX_HAND_SIZE: 10,

    // Protagonist draw probability
    PROTAGONIST_DRAW_CHANCE_INITIAL: 0.7,  // 70% in initial hand
    PROTAGONIST_DRAW_CHANCE_EARLY: 0.5,    // 50% turns 2-3
    PROTAGONIST_DRAW_CHANCE_LATE: 0.4,     // 40% later turns

    // Timeline
    SLOTS_PER_BLOCK: 4,
    MAX_BLOCKS: 5,

    // Points
    STORY_POINTS_PER_TURN: 2,
    STORY_POINTS_EVENT_COMPLETE: 5,
    FILLER_POINTS_EVENT_COMPLETE: 2,  // Given to opponent

    // Affinity
    AFFINITY_BONUS_PER_CARD: 1,       // +1 story per compatible card on event complete

    // Filler threshold
    FILLER_BLOCK_THRESHOLD: 10,       // Can't play events if filler >= 10

    // Board
    MAX_CHARACTERS_ON_BOARD: 5,

    // Victory conditions (legacy)
    FILLER_THRESHOLD_PENALTY: 3,

    // Formats
    DEFAULT_FORMAT: 'standard',
};

// ============================================
// Archetypes
// ============================================

export const ARCHETYPES = {
    // Phase 1 (original)
    SHONEN: 'SHONEN',
    MECHA: 'MECHA',
    HAREM_INVERSO: 'HAREM_INVERSO',
    SLICE_OF_LIFE: 'SLICE_OF_LIFE',

    // Phase 2 (new)
    SHOJO: 'SHOJO',
    HAREM: 'HAREM',
    ISEKAI: 'ISEKAI',
    SURVIVAL_GAME: 'SURVIVAL_GAME',
    SPOKON: 'SPOKON',
    KAIJU: 'KAIJU',
} as const;

export type ArchetypeId = typeof ARCHETYPES[keyof typeof ARCHETYPES];

// ============================================
// Archetype Metadata
// ============================================

export interface ArchetypeInfo {
    id: ArchetypeId;
    name: string;
    description: string;
    icon: string;
    color: string;
}

export const ARCHETYPE_INFO: Record<ArchetypeId, ArchetypeInfo> = {
    [ARCHETYPES.SHONEN]: {
        id: ARCHETYPES.SHONEN,
        name: 'Shonen',
        description: 'Power of friendship, training arcs, and epic battles',
        icon: '🔥',
        color: '#e94560',
    },
    [ARCHETYPES.MECHA]: {
        id: ARCHETYPES.MECHA,
        name: 'Mecha',
        description: 'Giant robots, pilots, and alien invasions',
        icon: '🤖',
        color: '#3498db',
    },
    [ARCHETYPES.HAREM_INVERSO]: {
        id: ARCHETYPES.HAREM_INVERSO,
        name: 'Harem Inverso',
        description: 'Love triangles, misunderstandings, and confessions',
        icon: '💕',
        color: '#e91e8c',
    },
    [ARCHETYPES.SLICE_OF_LIFE]: {
        id: ARCHETYPES.SLICE_OF_LIFE,
        name: 'Slice of Life',
        description: 'Everyday adventures, school clubs, and gentle moments',
        icon: '🌸',
        color: '#2ecc71',
    },
    [ARCHETYPES.SHOJO]: {
        id: ARCHETYPES.SHOJO,
        name: 'Shojo',
        description: 'Romance, school life, and heartfelt emotions',
        icon: '🌹',
        color: '#ff69b4',
    },
    [ARCHETYPES.HAREM]: {
        id: ARCHETYPES.HAREM,
        name: 'Harem',
        description: 'Multiple interests, comedic situations, choosing the one',
        icon: '👥',
        color: '#9b59b6',
    },
    [ARCHETYPES.ISEKAI]: {
        id: ARCHETYPES.ISEKAI,
        name: 'Isekai',
        description: 'New world, OP protagonist, adventure',
        icon: '🌍',
        color: '#1abc9c',
    },
    [ARCHETYPES.SURVIVAL_GAME]: {
        id: ARCHETYPES.SURVIVAL_GAME,
        name: 'Survival Game',
        description: 'Death games, alliances, and betrayal',
        icon: '💀',
        color: '#8e44ad',
    },
    [ARCHETYPES.SPOKON]: {
        id: ARCHETYPES.SPOKON,
        name: 'Spokon',
        description: 'Sports, training, and championship glory',
        icon: '🏆',
        color: '#f39c12',
    },
    [ARCHETYPES.KAIJU]: {
        id: ARCHETYPES.KAIJU,
        name: 'Kaiju',
        description: 'Giant monsters, epic battles, humanity\'s last stand',
        icon: '🦖',
        color: '#c0392b',
    },
};

// ============================================
// Slot Positions
// ============================================

export const SLOT_POSITIONS = ['top', 'left', 'right', 'bottom'] as const;

// ============================================
// Card Type Display Names
// ============================================

export const CARD_TYPE_NAMES = {
    PROTAGONIST: 'Protagonista',
    PERSONAJE: 'Personaje',
    ITEM: 'Objeto',
    LOCATION: 'Locación',
    EVENT: 'Evento',
    EVENT_FINAL: 'Evento Final',
    // Legacy
    CHARACTER: 'Personaje',
    EVENT_KEY: 'Evento Clave',
    FILLER: 'Relleno',
    UNIT: 'Unidad',
} as const;
