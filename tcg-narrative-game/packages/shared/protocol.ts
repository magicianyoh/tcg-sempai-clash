// ============================================
// WebSocket Protocol - Client <-> Server
// ============================================

// --- Client -> Server Message Types ---
export enum ClientMessageType {
    // Matchmaking
    MATCHMAKE_QUEUE = 'MATCHMAKE_QUEUE',
    MATCHMAKE_CANCEL = 'MATCHMAKE_CANCEL',

    // Lobby
    LOBBY_CREATE = 'LOBBY_CREATE',
    LOBBY_JOIN = 'LOBBY_JOIN',
    LOBBY_READY = 'LOBBY_READY',
    LOBBY_LEAVE = 'LOBBY_LEAVE',

    // Match Actions
    MATCH_ACTION = 'MATCH_ACTION',
}

// --- Server -> Client Message Types ---
export enum ServerMessageType {
    // Auth
    AUTH_OK = 'AUTH_OK',

    // General
    ERROR = 'ERROR',

    // Lobby
    LOBBY_STATE = 'LOBBY_STATE',

    // Match
    MATCH_FOUND = 'MATCH_FOUND',
    MATCH_STATE = 'MATCH_STATE',
    MATCH_ENDED = 'MATCH_ENDED',
}

// --- Action Types ---
export enum MatchActionType {
    PLAY_CARD = 'PLAY_CARD',
    END_TURN = 'END_TURN',
    ACTIVATE_EVENT = 'ACTIVATE_EVENT',
    RETURN_TO_HAND = 'RETURN_TO_HAND',
}

// ============================================
// Client -> Server Payloads
// ============================================

export interface MatchmakeQueuePayload {
    formatId: string;
    deckId: string;
}

export interface LobbyCreatePayload {
    formatId: string;
}

export interface LobbyJoinPayload {
    code: string;
}

export interface LobbyReadyPayload {
    lobbyId: string;
    deckId: string;
}

export interface PlayCardAction {
    type: MatchActionType.PLAY_CARD;
    cardId: string;
    slotPosition: 'top' | 'left' | 'right' | 'bottom';
}

export interface ActivateEventAction {
    type: MatchActionType.ACTIVATE_EVENT;
    cardId: string;
}

export interface ReturnToHandAction {
    type: MatchActionType.RETURN_TO_HAND;
    blockIndex: number;
    position: 'top' | 'left' | 'right' | 'bottom';
}

export interface EndTurnAction {
    type: MatchActionType.END_TURN;
}

export type MatchAction = PlayCardAction | EndTurnAction | ActivateEventAction | ReturnToHandAction;

export interface MatchActionPayload {
    matchId: string;
    action: MatchAction;
}

// Union of all client payloads
export type ClientPayload =
    | MatchmakeQueuePayload
    | LobbyCreatePayload
    | LobbyJoinPayload
    | LobbyReadyPayload
    | MatchActionPayload;

// Client Message wrapper
export interface ClientMessage<T extends ClientPayload = ClientPayload> {
    type: ClientMessageType;
    payload: T;
}

// ============================================
// Server -> Client Payloads
// ============================================

export interface AuthOkPayload {
    username: string;
}

export interface ErrorPayload {
    code: string;
    message: string;
}

export interface LobbyPlayer {
    username: string;
    deckId?: string;
    ready: boolean;
}

export interface LobbyState {
    lobbyId: string;
    code: string;
    formatId: string;
    players: LobbyPlayer[];
    status: 'waiting' | 'ready' | 'started';
}

export interface LobbyStatePayload {
    lobby: LobbyState;
}

export interface MatchFoundPayload {
    matchId: string;
}

// Re-export MatchState from types for convenience
export interface MatchStatePayload {
    matchState: import('./types').MatchState;
}

export interface MatchEndedPayload {
    matchId: string;
    winner: string;
    reason: 'victory' | 'surrender' | 'timeout' | 'disconnect';
}

// Union of all server payloads
export type ServerPayload =
    | AuthOkPayload
    | ErrorPayload
    | LobbyStatePayload
    | MatchFoundPayload
    | MatchStatePayload
    | MatchEndedPayload;

// Server Message wrapper
export interface ServerMessage<T extends ServerPayload = ServerPayload> {
    type: ServerMessageType;
    payload: T;
}

// ============================================
// Helper Functions
// ============================================

export function createServerMessage<T extends ServerPayload>(
    type: ServerMessageType,
    payload: T
): ServerMessage<T> {
    return { type, payload };
}

export function createClientMessage<T extends ClientPayload>(
    type: ClientMessageType,
    payload: T
): ClientMessage<T> {
    return { type, payload };
}

// Error codes
export enum ErrorCode {
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    LOBBY_NOT_FOUND = 'LOBBY_NOT_FOUND',
    LOBBY_FULL = 'LOBBY_FULL',
    MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
    NOT_YOUR_TURN = 'NOT_YOUR_TURN',
    INVALID_ACTION = 'INVALID_ACTION',
    DECK_NOT_FOUND = 'DECK_NOT_FOUND',
    ALREADY_IN_QUEUE = 'ALREADY_IN_QUEUE',
}
