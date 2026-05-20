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
    handHoverEffect: string;
    slotIdleEffect: string;
    slotValidDropEffect: string;
    eventReadyEffect: string;
    eventResolveEffect: string;
    victoryEffect: string;
    defeatEffect: string;
    boardBackgroundImage: string;
    turnBannerImage: string;
}

export interface MediaAsset {
    id: string;
    name: string;
    type: 'image' | 'audio' | 'other';
    mimeType: string;
    dataUrl: string;
    size: number;
    createdAt: number;
}

export interface WikiContent {
    rules: string;
    modes: string;
    mechanics: string;
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
        handHoverEffect: 'lift-glow',
        slotIdleEffect: 'thin-outline',
        slotValidDropEffect: 'cyan-pulse',
        eventReadyEffect: 'gold-pulse',
        eventResolveEffect: 'arc-burst',
        victoryEffect: 'screen-flash',
        defeatEffect: 'desaturate',
        boardBackgroundImage: '',
        turnBannerImage: '',
    };

    private mediaAssets: Map<string, MediaAsset> = new Map();

    private wikiContent: WikiContent = {
        rules: [
            'El objetivo es avanzar arcos narrativos completando eventos.',
            'Las cartas normales se colocan en slots del campo.',
            'Una carta normal solo puede volver a la mano durante el mismo turno en que fue jugada; al cambiar el turno queda fijada al campo.',
            'Las cartas de evento se preparan en el centro y se resuelven al presionar Siguiente Arco/Pasar turno si sus requisitos se cumplen.',
            'El Filler ejerce presion, pero no decide la partida antes del Acto III.',
            'Los eventos finales representan el cierre de temporada y pueden ganar la partida.',
        ].join('\n'),
        modes: [
            'Quick Match: emparejamiento contra otro jugador.',
            'Lobby: partida privada por codigo.',
            'CPU: partida contra IA con arquetipo y dificultad seleccionables.',
        ].join('\n'),
        mechanics: [
            'Slots: cada arco usa cuatro slots visibles para cartas normales.',
            'Evento clave: se coloca en el centro y revisa requisitos contra el campo.',
            'Siguiente Arco: aparece cuando el evento preparado ya cumple sus requisitos.',
            'Checkpoints de acto: al cerrar el primer y tercer arco se compara tempo narrativo. Quien lidera gana Story; quien queda atras roba cartas y reduce Filler.',
        ].join('\n'),
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

    listMediaAssets(): MediaAsset[] {
        return Array.from(this.mediaAssets.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    addMediaAsset(asset: Omit<MediaAsset, 'id' | 'createdAt'>): MediaAsset {
        const fullAsset: MediaAsset = {
            ...asset,
            id: 'media_' + Math.random().toString(36).slice(2, 11),
            createdAt: Date.now(),
        };
        this.mediaAssets.set(fullAsset.id, fullAsset);
        return fullAsset;
    }

    deleteMediaAsset(id: string): boolean {
        return this.mediaAssets.delete(id);
    }

    getWikiContent(): WikiContent {
        return { ...this.wikiContent };
    }

    updateWikiContent(updates: Partial<WikiContent>): WikiContent {
        this.wikiContent = {
            ...this.wikiContent,
            ...updates,
        };
        return this.getWikiContent();
    }
}

export const store = new MemoryStore();
