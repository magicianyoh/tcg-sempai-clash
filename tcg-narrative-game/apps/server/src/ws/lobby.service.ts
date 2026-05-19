import { store } from '../store/memory.store';
import { LobbyState, LobbyPlayer } from '@tcg/shared/protocol';
import { GAME_CONSTANTS } from '@tcg/shared/constants';

// ============================================
// Lobby Service
// ============================================

function generateLobbyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid similar chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateLobbyId(): string {
    return 'lobby_' + Math.random().toString(36).substr(2, 9);
}

export interface LobbyServiceResult {
    success: boolean;
    lobby?: LobbyState;
    error?: string;
}

export class LobbyService {
    // Create a new lobby
    createLobby(formatId: string, ownerUsername: string): LobbyServiceResult {
        const lobbyId = generateLobbyId();
        const code = generateLobbyCode();

        const owner: LobbyPlayer = {
            username: ownerUsername,
            ready: false,
        };

        const lobby: LobbyState = {
            lobbyId,
            code,
            formatId,
            players: [owner],
            status: 'waiting',
        };

        store.createLobby(lobby);
        return { success: true, lobby };
    }

    // Join an existing lobby by code
    joinLobby(code: string, username: string): LobbyServiceResult {
        const lobby = store.getLobbyByCode(code);

        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        if (lobby.status !== 'waiting') {
            return { success: false, error: 'Lobby is not accepting players' };
        }

        if (lobby.players.length >= 2) {
            return { success: false, error: 'Lobby is full' };
        }

        // Check if player already in lobby
        if (lobby.players.find(p => p.username === username)) {
            return { success: false, error: 'Already in this lobby' };
        }

        const newPlayer: LobbyPlayer = {
            username,
            ready: false,
        };

        lobby.players.push(newPlayer);
        store.updateLobby(lobby.lobbyId, lobby);

        return { success: true, lobby };
    }

    // Set player ready with deck
    setReady(lobbyId: string, username: string, deckId: string): LobbyServiceResult {
        const lobby = store.getLobby(lobbyId);

        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        const player = lobby.players.find(p => p.username === username);
        if (!player) {
            return { success: false, error: 'Not in this lobby' };
        }

        // Verify deck exists and belongs to user
        if (!store.isUserDeck(username, deckId)) {
            return { success: false, error: 'Invalid deck' };
        }

        player.deckId = deckId;
        player.ready = true;

        // Check if all players ready
        const allReady = lobby.players.length === 2 && lobby.players.every(p => p.ready);
        if (allReady) {
            lobby.status = 'ready';
        }

        store.updateLobby(lobbyId, lobby);

        return { success: true, lobby };
    }

    // Leave a lobby
    leaveLobby(lobbyId: string, username: string): LobbyServiceResult {
        const lobby = store.getLobby(lobbyId);

        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        const playerIndex = lobby.players.findIndex(p => p.username === username);
        if (playerIndex === -1) {
            return { success: false, error: 'Not in this lobby' };
        }

        // Remove player
        lobby.players.splice(playerIndex, 1);

        // If lobby is empty, delete it
        if (lobby.players.length === 0) {
            store.deleteLobby(lobbyId);
            return { success: true };
        }

        // Reset remaining player's ready status
        lobby.players.forEach(p => {
            p.ready = false;
        });
        lobby.status = 'waiting';

        store.updateLobby(lobbyId, lobby);

        return { success: true, lobby };
    }

    // Get lobby state
    getLobby(lobbyId: string): LobbyState | undefined {
        return store.getLobby(lobbyId);
    }

    // Check if lobby is ready to start match
    isLobbyReady(lobbyId: string): boolean {
        const lobby = store.getLobby(lobbyId);
        return lobby?.status === 'ready';
    }

    // Mark lobby as started
    startMatch(lobbyId: string): void {
        const lobby = store.getLobby(lobbyId);
        if (lobby) {
            lobby.status = 'started';
            store.updateLobby(lobbyId, lobby);
        }
    }
}

export const lobbyService = new LobbyService();
