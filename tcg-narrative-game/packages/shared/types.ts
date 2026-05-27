import { ArchetypeId } from './constants';

// ============================================
// Card Types
// ============================================

export enum CardType {
    // Core types (Phase 2)
    PROTAGONIST = 'PROTAGONIST', // Main character (unique per deck)
    PERSONAJE = 'PERSONAJE',     // Supporting characters
    ITEM = 'ITEM',               // Objects/Items
    LOCATION = 'LOCATION',       // Locations
    TOKEN = 'TOKEN',             // Legacy compatibility for persisted cards
    QUICK_EVENT = 'QUICK_EVENT', // Immediate action card resolved on play
    EVENT = 'EVENT',             // Key events (with prerequisites)
    EVENT_FINAL = 'EVENT_FINAL', // Final event (win condition)
    CLIMAX_EVENT = 'CLIMAX_EVENT', // V2 narrative resolution played from the deck
    PLOT_TWIST_EVENT = 'PLOT_TWIST_EVENT', // V2 comeback response outside the deck

    // Legacy compatibility (Phase 1)
    CHARACTER = 'CHARACTER',
    EVENT_KEY = 'EVENT_KEY',
    FILLER = 'FILLER',
    UNIT = 'UNIT',
}

export enum EffectType {
    // Story/Filler points
    STORY = 'STORY',               // +/- story points
    FILLER = 'FILLER',             // +/- filler points to target

    // Card manipulation
    DRAW = 'DRAW',                 // Draw cards
    DISCARD = 'DISCARD',           // Discard cards

    // Control
    BLOCK_EVENTS = 'BLOCK_EVENTS', // Block opponent events for X turns
    BLOCK_CARD_TYPE = 'BLOCK_CARD_TYPE', // Block one card type for N turns
    EXTRA_DRAW_NEXT_TURN = 'EXTRA_DRAW_NEXT_TURN',
    REMOVE_OPPONENT_BOARD_CARD = 'REMOVE_OPPONENT_BOARD_CARD',
    BLOCK_RANDOM_HAND_CARD_NEXT_TURN = 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN',
    NEXT_EVENT_REDUCE_REQUIREMENT = 'NEXT_EVENT_REDUCE_REQUIREMENT',
    INVOKE_CARD_TO_OPPONENT_HAND = 'INVOKE_CARD_TO_OPPONENT_HAND',
    HAND_SP_DECAY_PERCENT = 'HAND_SP_DECAY_PERCENT',
    HAND_RANDOM_FILLER_THEN_DISCARD = 'HAND_RANDOM_FILLER_THEN_DISCARD',
    RECOVER_FROM_CEMETERY = 'RECOVER_FROM_CEMETERY',
    RECOVER_FROM_COMPLETED_ARC = 'RECOVER_FROM_COMPLETED_ARC',
    SEARCH_CLIMAX = 'SEARCH_CLIMAX',
    SEARCH_CARD_TYPE = 'SEARCH_CARD_TYPE',
    MODIFY_CLIMAX_LEVEL = 'MODIFY_CLIMAX_LEVEL',
    PROTECT_PROTAGONIST = 'PROTECT_PROTAGONIST',
    SILENCE_PROTAGONIST_NEXT_EVENT = 'SILENCE_PROTAGONIST_NEXT_EVENT',

    // Victory
    VICTORY = 'VICTORY',           // Win condition (Final Event)

    // Conditional
    CONDITIONAL = 'CONDITIONAL',   // Effect with condition

    // Legacy compatibility
    HISTORY = 'HISTORY',           // Alias for STORY
    DAMAGE = 'DAMAGE',
    HEAL = 'HEAL',
    NARRATIVE_PENALTY = 'NARRATIVE_PENALTY',
}

// ============================================
// Affinity & Likes System
// ============================================

/**
 * Affinity defines compatibility between Protagonists and Characters.
 * When cards with mutual affinity are on the field, bonus Story Points
 * are awarded when completing Events.
 */
export interface AffinityData {
    compatibleWith: string[];  // Card IDs this card has affinity with
}

/**
 * Likes/Dislikes define compatibility with Items and Locations.
 * - Likes: Grant +1 Story Point when used in Event completion
 * - Dislikes: Block Event activation with this Protagonist
 */
export interface LikesData {
    likes: string[];     // Item/Location IDs that give bonus
    dislikes: string[];  // Item/Location IDs that block events
}

// ============================================
// Card Effects
// ============================================

export interface EffectCondition {
    type: 'BOARD_HAS' | 'STORY_MIN' | 'FILLER_MAX' | 'LOCATION_IS' | 'EVENT_COMPLETED' | 'AFFINITY_ACTIVE';
    cardIds?: string[];
    value?: number;
    locationId?: string;
}

export interface CardEffect {
    type: EffectType | string;
    value?: number;
    target?: 'SELF' | 'OPPONENT';
    condition?: EffectCondition;
    description?: string;        // Human-readable effect description
    cardType?: CardType | string;
    cardId?: string;
    turns?: number;
}

// ============================================
// Card Requirements
// ============================================

export type RequirementType = 'STORY_MIN' | 'FILLER_MIN' | 'FILLER_MAX' | 'CARD_ON_BOARD' | 'CARD_IN_COMPLETED_ARC' | 'EVENT_COMPLETED' | 'EVENT_COUNT_MIN' | 'AFFINITY_ACTIVE' | 'DISCARD_FROM_HAND';

export interface CardRequirement {
    type: RequirementType | string;
    value?: number;
    cardIds?: string[];
    description?: string;

    // For CARD_ON_BOARD
    cardType?: CardType;
    tag?: string;
    archetype?: string;
}

export interface ClimaxTier {
    multiplier: 2 | 4 | 10;
    requirements: CardRequirement[];
}

// ============================================
// Card Data
// ============================================

export interface CardData {
    id: string;
    name: string;
    type: CardType;
    cost: number;
    costResource?: 'SP' | 'FP';
    description: string;

    // Lore
    backstory?: string;          // Flavor text / lore

    // Prerequisites (for EVENT type)
    eventPrerequisites?: string[]; // Event card IDs that must be completed first

    // Requirements
    requirements?: CardRequirement[];

    // Effects
    effects: CardEffect[];
    entryEffects?: CardEffect[]; // Effects resolved when a protagonist form enters play
    climaxTiers?: ClimaxTier[];

    // Affinity & Likes (PROTAGONIST and PERSONAJE only)
    affinity?: AffinityData;
    likesData?: LikesData;

    // Metadata
    archetype: ArchetypeId | string;
    image: string;
    maxCopies?: number;           // Max copies in deck (default 3, Protagonist = 1)
    tags?: string[];              // Searchable tags
    protagonistId?: string;       // Hidden V2 narrative line owner
    formIndex?: number;           // V2 protagonist form ordering
    totalForms?: number;
}

// ============================================
// Timeline & Board State (Phase 2)
// ============================================

export type SlotPosition = 'top' | 'left' | 'right' | 'bottom';

export interface TimelineSlot {
    position: SlotPosition;
    cardId?: string;              // Card placed in this slot
    cardType?: CardType;          // Type of card in slot (for validation)
    placedTurn?: number;          // Global turn when the card entered the field
}

export interface TimelineBlock {
    blockIndex: number;
    slots: TimelineSlot[];        // 4 slots around the event
    eventSlot?: string;           // Central event card ID
    eventCompleted: boolean;
    eventSubmitted?: boolean;
    protagonistCardId?: string;    // V2 avatar form active for this arc
}

export interface BoardState {
    // Phase 2: Timeline blocks
    blocks: TimelineBlock[];
    currentBlockIndex: number;    // Which block we're filling

    // Legacy compatibility (Phase 1)
    characters: string[];         // Card IDs on board (max 5)
    location?: string;            // Current location card ID
}

// ============================================
// Player State
// ============================================

export interface PlayerState {
    id: string;
    username: string;
    backgroundId?: string;        // Field theme/color selected in the deck builder

    // Cards
    deck: string[];               // Remaining deck (card IDs)
    hand: string[];               // Hand (card IDs)
    discard: string[];            // Discard pile
    protagonistId?: string;       // Selected V2 avatar, outside of the deck
    protagonistFormId?: string;
    protagonistFormIndex?: number;
    protagonistTotalEvents?: number;
    openingSetupDraws?: number;   // Assisted turn draws attempted before completing Event 1
    handEffectTurns?: Record<string, number>; // Per-card hand effects already resolved this stay in hand

    // Board
    board: BoardState;

    // Timeline (legacy flat list)
    timeline: TimelineNode[];

    // Completed events (for prerequisite checking)
    completedEvents: string[];    // Event card IDs that have been completed

    // Points
    storyPoints: number;          // Renamed from historyPoints
    fillerPoints: number;

    // State flags
    finalEventPlayed: boolean;
    canPlayEvents: boolean;       // False if filler >= 10
    eventsBlockedTurns: number;   // Turns remaining where events are blocked
    statusEffects?: StatusEffect[];

    // Legacy compatibility
    historyPoints: number;        // Alias for storyPoints
    finalLockTurns: number;
    isEventsBlocked: boolean;
    tags: string[];
    fillerCount: number;
}

export interface TimelineNode {
    cardId: string;
    turn: number;
    resolved: boolean;
    effects?: string[];           // Applied effect descriptions
}

// ============================================
// Match State
// ============================================

export type MatchPhase = 'setup' | 'main' | 'climax_response' | 'ended';

export interface PendingClimax {
    attackerIndex: 0 | 1;
    responderIndex: 0 | 1;
    cardId: string;
    multiplier: 2 | 4 | 10;
    responseOpen: boolean;
}

export interface MatchState {
    matchId: string;
    formatId: string;

    // Turn tracking
    turnNumber: number;
    currentTurn: 0 | 1;           // Index into players array
    phase: MatchPhase;

    // Players (always exactly 2)
    players: [PlayerState, PlayerState];
    playerOrder: [string, string]; // usernames in turn order

    // Active player helper
    activePlayerId: string;
    timerEnabled?: boolean;
    turnStartedAt?: number;
    playerTimers?: Record<string, number>;

    // Result
    winner?: string;
    winReason?: 'climax' | 'draw' | 'final_event' | 'opponent_filler' | 'surrender' | 'timeout';
    actCheckpointsResolved?: string[];
    pendingClimax?: PendingClimax;

    // CPU opponent metadata
    cpuOpponent?: {
        username: string;
        archetypeId: ArchetypeId | string;
        difficulty: 'easy' | 'normal' | 'hard';
        deckId?: string;
        protagonistId?: string;
    };

    // Log
    log: LogEntry[];
}

export interface StatusEffect {
    id: string;
    type: string;
    sourceCardId: string;
    sourceName: string;
    turnsRemaining: number;
    cardType?: CardType | string;
    cardId?: string;
    value?: number;
    message: string;
}

export interface LogEntry {
    turn: number;
    player: string;
    action: string;
    details?: string;
    timestamp: number;
}

// ============================================
// Deck
// ============================================

export interface DeckData {
    id: string;
    name: string;
    archetypeId: ArchetypeId | string;
    cards: string[];              // Card IDs at the configured deck size
    protagonistId?: string;       // V2 avatar card outside the configured deck size
    backgroundId?: string;        // Background SVG ID
    createdAt: number;
    updatedAt: number;
}

// ============================================
// WebSocket Payloads (Legacy)
// ============================================

export interface WSPayload {
    event: string;
    data: unknown;
}

// ============================================
// Utility Types
// ============================================

export type PlayerId = string;
export type CardId = string;
export type MatchId = string;
export type DeckId = string;

export type ValidationResult = {
    ok: boolean;
    reasons?: string[];
};
