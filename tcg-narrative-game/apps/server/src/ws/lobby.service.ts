import { store } from '../store/memory.store';
import { LobbyState, LobbyPlayer, LobbyMatchSummary } from '@tcg/shared/protocol';

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

export interface LobbyChallenge {
    challengeId: string;
    lobbyId: string;
    fromUsername: string;
    toUsername: string;
    fromDeckId: string;
    timerEnabled: boolean;
    privateMatch: boolean;
}

export interface LobbyChallengeResult extends LobbyServiceResult {
    challenge?: LobbyChallenge;
}

export class LobbyService {
    private readonly challenges = new Map<string, LobbyChallenge>();
    private readonly matchLobbies = new Map<string, string>();
    private readonly authorizedSpectators = new Map<string, Set<string>>();

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
            activeMatches: [],
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

        if (lobby.players.length >= 24) {
            return { success: false, error: 'Lobby is full' };
        }

        if (lobby.players.find(p => p.username === username)) {
            return { success: true, lobby };
        }

        const newPlayer: LobbyPlayer = {
            username,
            ready: false,
        };

        lobby.players.push(newPlayer);
        store.updateLobby(lobby.lobbyId, lobby);

        return { success: true, lobby };
    }

    createChallenge(
        lobbyId: string,
        fromUsername: string,
        toUsername: string,
        fromDeckId: string,
        timerEnabled: boolean,
        privateMatch: boolean,
    ): LobbyChallengeResult {
        const lobby = store.getLobby(lobbyId);
        if (!lobby || !lobby.players.some(player => player.username === fromUsername)) {
            return { success: false, error: 'Not in this lobby' };
        }
        if (fromUsername === toUsername || !lobby.players.some(player => player.username === toUsername)) {
            return { success: false, error: 'Player is not available in this lobby' };
        }
        if (!store.isUserDeck(fromUsername, fromDeckId)) {
            return { success: false, error: 'Invalid deck' };
        }
        const challenge: LobbyChallenge = {
            challengeId: `challenge_${Math.random().toString(36).slice(2, 11)}`,
            lobbyId,
            fromUsername,
            toUsername,
            fromDeckId,
            timerEnabled,
            privateMatch,
        };
        this.challenges.set(challenge.challengeId, challenge);
        return { success: true, lobby, challenge };
    }

    answerChallenge(
        challengeId: string,
        username: string,
        accepted: boolean,
        deckId?: string,
    ): LobbyChallengeResult {
        const challenge = this.challenges.get(challengeId);
        if (!challenge || challenge.toUsername !== username) {
            return { success: false, error: 'Invitation not found' };
        }
        const lobby = store.getLobby(challenge.lobbyId);
        if (!lobby || !lobby.players.some(player => player.username === challenge.fromUsername)) {
            this.challenges.delete(challengeId);
            return { success: false, error: 'Lobby is no longer available' };
        }
        if (accepted && (!deckId || !store.isUserDeck(username, deckId))) {
            return { success: false, error: 'Invalid deck' };
        }
        this.challenges.delete(challengeId);
        return { success: true, lobby, challenge };
    }

    recordMatch(lobbyId: string, summary: LobbyMatchSummary): LobbyState | undefined {
        const lobby = store.getLobby(lobbyId);
        if (!lobby) return undefined;
        lobby.activeMatches = [...(lobby.activeMatches || []).filter(match => match.matchId !== summary.matchId), summary];
        lobby.players.forEach(player => {
            if (summary.players.includes(player.username)) player.activeMatchId = summary.matchId;
        });
        this.matchLobbies.set(summary.matchId, lobbyId);
        store.updateLobby(lobbyId, lobby);
        return lobby;
    }

    completeMatch(matchId: string, winner?: string): LobbyState | undefined {
        const lobbyId = this.matchLobbies.get(matchId);
        const lobby = lobbyId ? store.getLobby(lobbyId) : undefined;
        if (!lobby) return undefined;
        const summary = (lobby.activeMatches || []).find(match => match.matchId === matchId);
        if (summary) {
            summary.status = 'ended';
            summary.winner = winner;
        }
        lobby.players.forEach(player => {
            if (player.activeMatchId === matchId) player.activeMatchId = undefined;
        });
        store.updateLobby(lobby.lobbyId, lobby);
        return lobby;
    }

    authorizeSpectator(matchId: string, username: string, lobbyId?: string): boolean {
        const sourceLobbyId = this.matchLobbies.get(matchId);
        const lobby = sourceLobbyId ? store.getLobby(sourceLobbyId) : undefined;
        const summary = lobby?.activeMatches?.find(match => match.matchId === matchId && match.status === 'active');
        const isLobbyMember = !!lobbyId && sourceLobbyId === lobbyId && !!lobby?.players.some(player => player.username === username);
        const alreadyAuthorized = this.authorizedSpectators.get(matchId)?.has(username) === true;
        if (!summary || summary.privateMatch || (!isLobbyMember && !alreadyAuthorized)) return false;
        const spectators = this.authorizedSpectators.get(matchId) || new Set<string>();
        spectators.add(username);
        this.authorizedSpectators.set(matchId, spectators);
        return true;
    }

    canReadMatch(matchId: string, username: string): boolean {
        return this.authorizedSpectators.get(matchId)?.has(username) === true;
    }

    // Set player ready with deck
    setReady(lobbyId: string, username: string, deckId: string, timerEnabled = false): LobbyServiceResult {
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
        player.timerEnabled = timerEnabled;

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
