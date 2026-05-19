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
    EVENT = 'EVENT',             // Key events (with prerequisites)
    EVENT_FINAL = 'EVENT_FINAL', // Final event (win condition)

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
}

// ============================================
// Card Requirements
// ============================================

export type RequirementType = 'STORY_MIN' | 'FILLER_MAX' | 'CARD_ON_BOARD' | 'EVENT_COMPLETED' | 'AFFINITY_ACTIVE';

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

// ============================================
// Card Data
// ============================================

export interface CardData {
    id: string;
    name: string;
    type: CardType;
    cost: number;
    description: string;

    // Lore
    backstory?: string;          // Flavor text / lore

    // Prerequisites (for EVENT type)
    eventPrerequisites?: string[]; // Event card IDs that must be completed first

    // Requirements
    requirements?: CardRequirement[];

    // Effects
    effects: CardEffect[];

    // Affinity & Likes (PROTAGONIST and PERSONAJE only)
    affinity?: AffinityData;
    likesData?: LikesData;

    // Metadata
    archetype: ArchetypeId | string;
    image: string;
    maxCopies?: number;           // Max copies in deck (default 3, Protagonist = 1)
    tags?: string[];              // Searchable tags
}

// ============================================
// Timeline & Board State (Phase 2)
// ============================================

export type SlotPosition = 'top' | 'left' | 'right' | 'bottom';

export interface TimelineSlot {
    position: SlotPosition;
    cardId?: string;              // Card placed in this slot
    cardType?: CardType;          // Type of card in slot (for validation)
}

export interface TimelineBlock {
    blockIndex: number;
    slots: TimelineSlot[];        // 4 slots around the event
    eventSlot?: string;           // Central event card ID
    eventCompleted: boolean;
    eventSubmitted?: boolean;
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

    // Cards
    deck: string[];               // Remaining deck (card IDs)
    hand: string[];               // Hand (card IDs)
    discard: string[];            // Discard pile

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

export type MatchPhase = 'setup' | 'main' | 'ended';

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

    // Result
    winner?: string;
    winReason?: 'final_event' | 'opponent_filler' | 'surrender' | 'timeout';

    // Log
    log: LogEntry[];
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
    cards: string[];              // Card IDs (20 cards)
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
