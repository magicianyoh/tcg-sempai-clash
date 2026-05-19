import { DeckData, MatchState } from '@tcg/shared/types';
import { LobbyState } from '@tcg/shared/protocol';

// ============================================
// User Model
// ============================================

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    activeDeckId?: string;
}

export interface AdminUiSettings {
    victoryImage: string;
    victorySound: string;
    defeatImage: string;
    defeatSound: string;
    playCardEffect: string;
    playCardSound: string;
    phaseAdvanceEffect: string;
    phaseAdvanceSound: string;
}

// ============================================
// Memory Store
// ============================================

export class MemoryStore {
    // Users indexed by username
    private users: Map<string, User> = new Map();

    // Decks indexed by deckId, grouped by user
    private decks: Map<string, DeckData> = new Map();
    private decksByUser: Map<string, string[]> = new Map(); // username -> deckIds

    // Matches
    private matches: Map<string, MatchState> = new Map();

    // Lobbies
    private lobbies: Map<string, LobbyState> = new Map();
    private lobbyByCode: Map<string, string> = new Map(); // code -> lobbyId

    // Quick Match Queue: formatId -> [{ username, deckId }]
    private queues: Map<string, Array<{ username: string; deckId: string }>> = new Map();

    private adminUiSettings: AdminUiSettings = {
        victoryImage: '',
        victorySound: '',
        defeatImage: '',
        defeatSound: '',
        playCardEffect: 'spark',
        playCardSound: '',
        phaseAdvanceEffect: 'arc-burst',
        phaseAdvanceSound: '',
    };

    // ========== User Methods ==========

    createUser(username: string, passwordHash: string): User {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        const user: User = { id, username, passwordHash };
        this.users.set(username, user);
        this.decksByUser.set(username, []);
        return user;
    }

    findUser(username: string): User | undefined {
        return this.users.get(username);
    }

    findUserById(id: string): User | undefined {
        for (const user of this.users.values()) {
            if (user.id === id) return user;
        }
        return undefined;
    }

    listUsers(): User[] {
        return Array.from(this.users.values());
    }

    deleteUser(username: string): boolean {
        if (!this.users.has(username)) return false;

        const deckIds = this.decksByUser.get(username) || [];
        deckIds.forEach(deckId => this.decks.delete(deckId));
        this.decksByUser.delete(username);
        this.users.delete(username);
        this.removeFromAllQueues(username);
        return true;
    }

    updateUserPassword(username: string, passwordHash: string): User | undefined {
        const user = this.users.get(username);
        if (!user) return undefined;
        user.passwordHash = passwordHash;
        this.users.set(username, user);
        return user;
    }

    setActiveDeck(username: string, deckId: string): void {
        const user = this.users.get(username);
        if (user) {
            user.activeDeckId = deckId;
        }
    }

    // ========== Deck Methods ==========

    createDeck(username: string, deck: Omit<DeckData, 'id' | 'createdAt' | 'updatedAt'>): DeckData {
        const id = 'deck_' + Math.random().toString(36).substr(2, 9);
        const now = Date.now();
        const fullDeck: DeckData = {
            ...deck,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.decks.set(id, fullDeck);

        const userDecks = this.decksByUser.get(username) || [];
        userDecks.push(id);
        this.decksByUser.set(username, userDecks);

        return fullDeck;
    }

    getDeck(deckId: string): DeckData | undefined {
        return this.decks.get(deckId);
    }

    getDecksForUser(username: string): DeckData[] {
        const deckIds = this.decksByUser.get(username) || [];
        return deckIds.map(id => this.decks.get(id)).filter((d): d is DeckData => !!d);
    }

    updateDeck(deckId: string, updates: Partial<Omit<DeckData, 'id' | 'createdAt'>>): DeckData | undefined {
        const deck = this.decks.get(deckId);
        if (!deck) return undefined;

        const updated: DeckData = {
            ...deck,
            ...updates,
            updatedAt: Date.now(),
        };
        this.decks.set(deckId, updated);
        return updated;
    }

    deleteDeck(username: string, deckId: string): boolean {
        const userDecks = this.decksByUser.get(username);
        if (!userDecks) return false;

        const index = userDecks.indexOf(deckId);
        if (index === -1) return false;

        userDecks.splice(index, 1);
        this.decks.delete(deckId);
        return true;
    }

    isUserDeck(username: string, deckId: string): boolean {
        const userDecks = this.decksByUser.get(username) || [];
        return userDecks.includes(deckId);
    }

    // ========== Match Methods ==========

    saveMatch(matchId: string, state: MatchState): void {
        this.matches.set(matchId, state);
    }

    getMatch(matchId: string): MatchState | undefined {
        return this.matches.get(matchId);
    }

    deleteMatch(matchId: string): void {
        this.matches.delete(matchId);
    }

    // ========== Lobby Methods ==========

    createLobby(lobby: LobbyState): void {
        this.lobbies.set(lobby.lobbyId, lobby);
        this.lobbyByCode.set(lobby.code, lobby.lobbyId);
    }

    getLobby(lobbyId: string): LobbyState | undefined {
        return this.lobbies.get(lobbyId);
    }

    getLobbyByCode(code: string): LobbyState | undefined {
        const lobbyId = this.lobbyByCode.get(code);
        return lobbyId ? this.lobbies.get(lobbyId) : undefined;
    }

    updateLobby(lobbyId: string, lobby: LobbyState): void {
        this.lobbies.set(lobbyId, lobby);
    }

    deleteLobby(lobbyId: string): void {
        const lobby = this.lobbies.get(lobbyId);
        if (lobby) {
            this.lobbyByCode.delete(lobby.code);
            this.lobbies.delete(lobbyId);
        }
    }

    // ========== Queue Methods ==========

    addToQueue(formatId: string, username: string, deckId: string): void {
        if (!this.queues.has(formatId)) {
            this.queues.set(formatId, []);
        }
        const queue = this.queues.get(formatId)!;
        // Avoid duplicates
        if (!queue.find(q => q.username === username)) {
            queue.push({ username, deckId });
        }
    }

    removeFromQueue(formatId: string, username: string): void {
        const queue = this.queues.get(formatId);
        if (queue) {
            const index = queue.findIndex(q => q.username === username);
            if (index !== -1) {
                queue.splice(index, 1);
            }
        }
    }

    getQueuePair(formatId: string): Array<{ username: string; deckId: string }> | null {
        const queue = this.queues.get(formatId);
        if (queue && queue.length >= 2) {
            return [queue.shift()!, queue.shift()!];
        }
        return null;
    }

    isInQueue(username: string): { formatId: string } | null {
        for (const [formatId, queue] of this.queues.entries()) {
            if (queue.find(q => q.username === username)) {
                return { formatId };
            }
        }
        return null;
    }

    removeFromAllQueues(username: string): void {
        for (const [formatId] of this.queues.entries()) {
            this.removeFromQueue(formatId, username);
        }
    }

    getAdminUiSettings(): AdminUiSettings {
        return { ...this.adminUiSettings };
    }

    updateAdminUiSettings(updates: Partial<AdminUiSettings>): AdminUiSettings {
        this.adminUiSettings = {
            ...this.adminUiSettings,
            ...updates,
        };
        return this.getAdminUiSettings();
    }
}

export const store = new MemoryStore();
