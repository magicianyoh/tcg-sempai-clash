import { WebSocketServer, WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { WS_EVENTS, GAME_CONSTANTS } from '@tcg/shared/constants';
import {
    ClientMessageType,
    ServerMessageType,
    MatchmakeQueuePayload,
    LobbyCreatePayload,
    LobbyJoinPayload,
    LobbyReadyPayload,
    MatchActionPayload,
    ServerMessage,
    ErrorPayload,
    ErrorCode,
    createServerMessage,
    LobbyStatePayload,
    MatchFoundPayload,
    MatchStatePayload,
    MatchEndedPayload,
} from '@tcg/shared/protocol';
import { matchService } from './match.service';
import { lobbyService } from './lobby.service';
import { store } from '../store/memory.store';

// ============================================
// Types
// ============================================

interface AuthenticatedClient extends WebSocket {
    username?: string;
    matchId?: string;
    lobbyId?: string;
    isAlive: boolean;
}

interface JwtPayload {
    id: string;
    username: string;
}

// ============================================
// WebSocket Gateway
// ============================================

export function wsGateway(fastify: FastifyInstance) {
    const wss = new WebSocketServer({ server: fastify.server });
    const connections: Map<string, AuthenticatedClient> = new Map();

    // Heartbeat
    const interval = setInterval(() => {
        wss.clients.forEach((ws: WebSocket) => {
            const client = ws as AuthenticatedClient;
            if (!client.isAlive) {
                client.terminate();
                if (client.username) {
                    connections.delete(client.username);
                    handleDisconnect(client);
                }
                return;
            }
            client.isAlive = false;
            client.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    wss.on('connection', async (ws: WebSocket, request) => {
        const client = ws as AuthenticatedClient;
        client.isAlive = true;

        client.on('pong', () => {
            client.isAlive = true;
        });

        // Authenticate via token in query string
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            sendError(client, ErrorCode.UNAUTHORIZED, 'No token provided');
            client.close();
            return;
        }

        try {
            const decoded = fastify.jwt.verify<JwtPayload>(token);
            client.username = decoded.username;
            connections.set(decoded.username, client);

            // Send auth confirmation
            sendMessage(client, ServerMessageType.AUTH_OK, { username: decoded.username });
            console.log(`WS: ${decoded.username} connected`);
        } catch (err) {
            sendError(client, ErrorCode.INVALID_TOKEN, 'Invalid token');
            client.close();
            return;
        }

        // Message handler
        client.on('message', (message: string) => {
            try {
                const parsed = JSON.parse(message.toString());
                handleMessage(client, parsed, wss, connections);
            } catch (e) {
                console.error('WS Parse Error', e);
                sendError(client, ErrorCode.INVALID_ACTION, 'Invalid message format');
            }
        });

        // Disconnect handler
        client.on('close', () => {
            if (client.username) {
                console.log(`WS: ${client.username} disconnected`);
                connections.delete(client.username);
                handleDisconnect(client);
            }
        });
    });

    return wss;
}

// ============================================
// Message Handlers
// ============================================

function handleMessage(
    client: AuthenticatedClient,
    message: { type: string; payload?: any },
    wss: WebSocketServer,
    connections: Map<string, AuthenticatedClient>
) {
    if (!client.username) {
        sendError(client, ErrorCode.UNAUTHORIZED, 'Not authenticated');
        return;
    }

    const { type, payload } = message;

    switch (type) {
        // ========== Matchmaking ==========
        case ClientMessageType.MATCHMAKE_QUEUE: {
            const { formatId, deckId } = payload as MatchmakeQueuePayload;
            handleMatchmakeQueue(client, formatId, deckId, connections);
            break;
        }

        case ClientMessageType.MATCHMAKE_CANCEL: {
            handleMatchmakeCancel(client);
            break;
        }

        // ========== Lobby ==========
        case ClientMessageType.LOBBY_CREATE: {
            const { formatId } = payload as LobbyCreatePayload;
            handleLobbyCreate(client, formatId);
            break;
        }

        case ClientMessageType.LOBBY_JOIN: {
            const { code } = payload as LobbyJoinPayload;
            handleLobbyJoin(client, code, connections);
            break;
        }

        case ClientMessageType.LOBBY_READY: {
            const { lobbyId, deckId } = payload as LobbyReadyPayload;
            handleLobbyReady(client, lobbyId, deckId, connections);
            break;
        }

        case ClientMessageType.LOBBY_LEAVE: {
            handleLobbyLeave(client, connections);
            break;
        }

        // ========== Match Actions ==========
        case ClientMessageType.MATCH_ACTION: {
            const { matchId, action } = payload as MatchActionPayload;
            handleMatchAction(client, matchId, action, connections);
            break;
        }

        // ========== Match Rejoin (for battle scene reconnection) ==========
        case 'MATCH_REJOIN': {
            const { matchId } = payload as { matchId: string };
            handleMatchRejoin(client, matchId, connections);
            break;
        }

        // ========== Legacy Events ==========
        case WS_EVENTS.JOIN_LOBBY:
        case 'FIND_MATCH': {
            // Legacy: auto-queue for quick match
            const user = store.findUser(client.username);
            const deckId = user?.activeDeckId;
            if (deckId) {
                handleMatchmakeQueue(client, GAME_CONSTANTS.DEFAULT_FORMAT, deckId, connections);
            } else {
                sendError(client, ErrorCode.DECK_NOT_FOUND, 'No active deck set');
            }
            break;
        }

        case WS_EVENTS.PLAY_CARD: {
            if (client.matchId && payload?.cardId) {
                handleMatchAction(client, client.matchId, {
                    type: 'PLAY_CARD' as any,
                    cardId: payload.cardId,
                }, connections);
            }
            break;
        }

        case WS_EVENTS.END_TURN: {
            if (client.matchId) {
                handleMatchAction(client, client.matchId, {
                    type: 'END_TURN' as any,
                }, connections);
            }
            break;
        }

        default:
            sendError(client, ErrorCode.INVALID_ACTION, `Unknown message type: ${type}`);
    }
}

// ============================================
// Matchmaking Handlers
// ============================================

function handleMatchmakeQueue(
    client: AuthenticatedClient,
    formatId: string,
    deckId: string,
    connections: Map<string, AuthenticatedClient>
) {
    if (!client.username) return;

    // Check if already in queue
    if (store.isInQueue(client.username)) {
        sendError(client, ErrorCode.ALREADY_IN_QUEUE, 'Already in queue');
        return;
    }

    // Verify deck
    if (!store.isUserDeck(client.username, deckId)) {
        sendError(client, ErrorCode.DECK_NOT_FOUND, 'Invalid deck');
        return;
    }

    // Add to queue
    store.addToQueue(formatId, client.username, deckId);
    console.log(`WS: ${client.username} joined queue for ${formatId}`);

    // Check for match
    const pair = store.getQueuePair(formatId);
    if (pair) {
        const [p1, p2] = pair;
        const match = matchService.createMatch(p1.username, p1.deckId, p2.username, p2.deckId, formatId);

        // Notify both players
        const client1 = connections.get(p1.username);
        const client2 = connections.get(p2.username);

        if (client1) {
            client1.matchId = match.matchId;
            sendMessage(client1, ServerMessageType.MATCH_FOUND, { matchId: match.matchId });
            sendMessage(client1, ServerMessageType.MATCH_STATE, { matchState: match });
        }
        if (client2) {
            client2.matchId = match.matchId;
            sendMessage(client2, ServerMessageType.MATCH_FOUND, { matchId: match.matchId });
            sendMessage(client2, ServerMessageType.MATCH_STATE, { matchState: match });
        }

        console.log(`WS: Match created ${match.matchId} between ${p1.username} and ${p2.username}`);
    }
}

function handleMatchmakeCancel(client: AuthenticatedClient) {
    if (!client.username) return;
    store.removeFromAllQueues(client.username);
    console.log(`WS: ${client.username} left queue`);
}

// ============================================
// Lobby Handlers
// ============================================

function handleLobbyCreate(client: AuthenticatedClient, formatId: string) {
    if (!client.username) return;

    const result = lobbyService.createLobby(formatId, client.username);
    if (result.success && result.lobby) {
        client.lobbyId = result.lobby.lobbyId;
        sendMessage(client, ServerMessageType.LOBBY_STATE, { lobby: result.lobby });
        console.log(`WS: ${client.username} created lobby ${result.lobby.code}`);
    } else {
        sendError(client, ErrorCode.INVALID_ACTION, result.error || 'Failed to create lobby');
    }
}

function handleLobbyJoin(
    client: AuthenticatedClient,
    code: string,
    connections: Map<string, AuthenticatedClient>
) {
    if (!client.username) return;

    const result = lobbyService.joinLobby(code, client.username);
    if (result.success && result.lobby) {
        client.lobbyId = result.lobby.lobbyId;

        // Notify all players in lobby
        result.lobby.players.forEach(p => {
            const playerClient = connections.get(p.username);
            if (playerClient) {
                sendMessage(playerClient, ServerMessageType.LOBBY_STATE, { lobby: result.lobby! });
            }
        });

        console.log(`WS: ${client.username} joined lobby ${code}`);
    } else {
        sendError(client, ErrorCode.LOBBY_NOT_FOUND, result.error || 'Failed to join lobby');
    }
}

function handleLobbyReady(
    client: AuthenticatedClient,
    lobbyId: string,
    deckId: string,
    connections: Map<string, AuthenticatedClient>
) {
    if (!client.username) return;

    const result = lobbyService.setReady(lobbyId, client.username, deckId);
    if (!result.success) {
        sendError(client, ErrorCode.INVALID_ACTION, result.error || 'Failed to set ready');
        return;
    }

    const lobby = result.lobby!;

    // Notify all players
    lobby.players.forEach(p => {
        const playerClient = connections.get(p.username);
        if (playerClient) {
            sendMessage(playerClient, ServerMessageType.LOBBY_STATE, { lobby });
        }
    });

    // Check if match should start
    if (lobbyService.isLobbyReady(lobbyId)) {
        lobbyService.startMatch(lobbyId);

        const [p1, p2] = lobby.players;
        const match = matchService.createMatch(
            p1.username, p1.deckId!,
            p2.username, p2.deckId!,
            lobby.formatId
        );

        // Notify both and set matchId
        lobby.players.forEach(p => {
            const playerClient = connections.get(p.username);
            if (playerClient) {
                playerClient.matchId = match.matchId;
                playerClient.lobbyId = undefined;
                sendMessage(playerClient, ServerMessageType.MATCH_FOUND, { matchId: match.matchId });
                sendMessage(playerClient, ServerMessageType.MATCH_STATE, { matchState: match });
            }
        });

        console.log(`WS: Lobby ${lobbyId} started match ${match.matchId}`);
    }
}

function handleLobbyLeave(client: AuthenticatedClient, connections: Map<string, AuthenticatedClient>) {
    if (!client.username || !client.lobbyId) return;

    const lobby = lobbyService.getLobby(client.lobbyId);
    if (!lobby) return;

    const result = lobbyService.leaveLobby(client.lobbyId, client.username);
    client.lobbyId = undefined;

    // Notify remaining players
    if (result.lobby) {
        result.lobby.players.forEach(p => {
            const playerClient = connections.get(p.username);
            if (playerClient) {
                sendMessage(playerClient, ServerMessageType.LOBBY_STATE, { lobby: result.lobby! });
            }
        });
    }

    console.log(`WS: ${client.username} left lobby`);
}

// ============================================
// Match Action Handlers
// ============================================

function handleMatchAction(
    client: AuthenticatedClient,
    matchId: string,
    action: any,
    connections: Map<string, AuthenticatedClient>
) {
    if (!client.username) return;

    const match = store.getMatch(matchId);
    if (!match) {
        sendError(client, ErrorCode.MATCH_NOT_FOUND, 'Match not found');
        return;
    }

    // Verify it's this player's turn
    if (match.activePlayerId !== client.username) {
        sendError(client, ErrorCode.NOT_YOUR_TURN, 'Not your turn');
        return;
    }

    try {
        const updatedMatch = matchService.processAction(matchId, client.username, action);

        // Broadcast to both players
        match.playerOrder.forEach(username => {
            const playerClient = connections.get(username);
            if (playerClient) {
                sendMessage(playerClient, ServerMessageType.MATCH_STATE, { matchState: updatedMatch });

                // Check for game end
                if (updatedMatch.winner) {
                    sendMessage(playerClient, ServerMessageType.MATCH_ENDED, {
                        matchId: updatedMatch.matchId,
                        winner: updatedMatch.winner,
                        reason: updatedMatch.winReason || 'victory',
                    });
                    playerClient.matchId = undefined;
                }
            }
        });

    } catch (err: any) {
        sendError(client, ErrorCode.INVALID_ACTION, err.message || 'Invalid action');
    }
}

// Handle reconnection to a match (battle scene loading)
function handleMatchRejoin(
    client: AuthenticatedClient,
    matchId: string,
    connections: Map<string, AuthenticatedClient>
) {
    if (!client.username) return;

    const match = store.getMatch(matchId);
    if (!match) {
        sendError(client, ErrorCode.MATCH_NOT_FOUND, 'Match not found');
        return;
    }

    // Verify this player is in the match
    if (!match.playerOrder.includes(client.username)) {
        sendError(client, ErrorCode.INVALID_ACTION, 'Not a participant in this match');
        return;
    }

    // Update client's matchId
    client.matchId = matchId;

    // Re-register this client in the connections map (in case it's a new connection)
    connections.set(client.username, client);

    console.log(`WS: ${client.username} rejoined match ${matchId}`);

    // Send current match state
    sendMessage(client, ServerMessageType.MATCH_STATE, { matchState: match });
}

// ============================================
// Disconnect Handler
// ============================================

function handleDisconnect(client: AuthenticatedClient) {
    if (!client.username) return;

    // Remove from queue
    store.removeFromAllQueues(client.username);

    // Leave lobby if in one
    if (client.lobbyId) {
        lobbyService.leaveLobby(client.lobbyId, client.username);
    }

    // Handle match disconnect (could surrender or pause)
    // For MVP, just log it
    if (client.matchId) {
        console.log(`WS: ${client.username} disconnected from match ${client.matchId}`);
        // TODO: Handle match forfeit/pause
    }
}

// ============================================
// Helpers
// ============================================

function sendMessage<T>(client: WebSocket, type: ServerMessageType, payload: T) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, payload }));
    }
}

function sendError(client: WebSocket, code: ErrorCode | string, message: string) {
    sendMessage(client, ServerMessageType.ERROR, { code, message });
}
