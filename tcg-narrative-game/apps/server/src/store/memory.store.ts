import { CardData, DeckData, MatchState } from '@tcg/shared/types';
import { LobbyState } from '@tcg/shared/protocol';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { CARDS } from '@tcg/game-engine/content/cards';
import * as fs from 'fs';
import * as path from 'path';

const CATALOG_CONTENT_VERSION = 6;
const REBUILT_ROUTE_PROTAGONISTS = new Set([
    'mecha-hero-brave-gai',
    'shonen-hero-dragon-ryu',
    'shonen-hero-kenji-forms',
    'shonen-hero-nakama-hiro',
    'shonen-hero-spirit-aya',
    'isekai-hero-slime-rimu',
    'isekai-hero-villainess-ema',
    'isekai-hero-artisan-nia',
    'isekai-hero-refused-yuna',
    'isekai-hero-bartender-zatos-last-call',
    'isekai-hero-bartender-zatos-rainwood',
]);

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

export interface PrebuiltDeckSettings {
    enabled: boolean;
    archetypes: Record<string, boolean>;
    deckOverrides?: Record<string, string[]>;
}

export interface HomeNewsItem {
    id: string;
    title: string;
    body: string;
    dateLabel: string;
    image?: string;
    linkUrl?: string;
    linkLabel?: string;
    featured?: boolean;
    createdAt: number;
    updatedAt: number;
}

export type PersistedCardData = CardData & {
    sound?: string;
    extendedLore?: string;
    endingTitle?: string;
    endingLore?: string;
    endingImage?: string;
    endingSound?: string;
    likes?: string[];
    dislikes?: string[];
};

interface PersistedStoreState {
    version: 2;
    catalogContentVersion?: number;
    users: Array<[string, User]>;
    decks: Array<[string, DeckData]>;
    decksByUser: Array<[string, string[]]>;
    adminUiSettings: Partial<AdminUiSettings>;
    mediaAssets: Array<[string, MediaAsset]>;
    wikiContent: Partial<WikiContent>;
    prebuiltDeckSettings?: Partial<PrebuiltDeckSettings>;
    cardOverrides?: Array<[string, PersistedCardData]>;
    homeNews?: HomeNewsItem[];
}

// ============================================
// Memory Store
// ============================================

export class MemoryStore {
    private readonly dbFilePath = path.resolve(process.env.STORE_DB_PATH || path.join(process.cwd(), 'data', 'db.json'));

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
    private queues: Map<string, Array<{ username: string; deckId: string; timerEnabled?: boolean }>> = new Map();

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
    private cardOverrides: Map<string, PersistedCardData> = new Map();
    private homeNews: HomeNewsItem[] = [
        {
            id: 'news-climax-plot-twist',
            title: 'Climax and Plot-Twist endings',
            body: 'Protagonists now evolve through arcs before the final Climax. Plot-Twist responses keep the ending tense until the last score check.',
            dateLabel: 'MAY 2026',
            featured: true,
            createdAt: 1716681600000,
            updatedAt: 1716681600000,
        },
        {
            id: 'news-opening-balance',
            title: 'More reliable opening arcs',
            body: 'Opening hands and early draws now favor first-event setup cards without removing deck-building decisions.',
            dateLabel: 'BALANCE',
            createdAt: 1716681600001,
            updatedAt: 1716681600001,
        },
        {
            id: 'news-mobile-field',
            title: 'Mobile field and Quick Events',
            body: 'Hand swipe, Cemetery browsing, and immediate Quick Event presentation were cleaned up for mobile play.',
            dateLabel: 'UI',
            createdAt: 1716681600002,
            updatedAt: 1716681600002,
        },
    ];

    private prebuiltDeckSettings: PrebuiltDeckSettings = {
        enabled: true,
        archetypes: {},
        deckOverrides: {},
    };

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

    constructor() {
        this.loadFromDisk();
    }

    private loadFromDisk(): void {
        try {
            if (!fs.existsSync(this.dbFilePath)) return;

            const raw = fs.readFileSync(this.dbFilePath, 'utf8');
            const parsed = JSON.parse(raw) as Partial<PersistedStoreState> & { version?: number };

            if (Array.isArray(parsed.users)) {
                this.users = new Map(parsed.users);
            }
            if (Array.isArray(parsed.decks)) {
                this.decks = new Map(parsed.decks);
            }
            if (Array.isArray(parsed.decksByUser)) {
                this.decksByUser = new Map(parsed.decksByUser);
            }
            if (Array.isArray(parsed.mediaAssets)) {
                this.mediaAssets = new Map(parsed.mediaAssets);
            }
            if (Array.isArray(parsed.cardOverrides)) {
                this.cardOverrides = new Map(parsed.cardOverrides);
            }
            if (Array.isArray(parsed.homeNews)) {
                this.homeNews = parsed.homeNews
                    .filter(item => item && typeof item.id === 'string')
                    .map(item => ({ ...item }))
                    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
            }
            if (parsed.adminUiSettings && typeof parsed.adminUiSettings === 'object') {
                this.adminUiSettings = {
                    ...this.adminUiSettings,
                    ...parsed.adminUiSettings,
                };
            }
            if (parsed.wikiContent && typeof parsed.wikiContent === 'object') {
                this.wikiContent = {
                    ...this.wikiContent,
                    ...parsed.wikiContent,
                };
            }
            if (parsed.prebuiltDeckSettings && typeof parsed.prebuiltDeckSettings === 'object') {
                this.prebuiltDeckSettings = {
                    ...this.prebuiltDeckSettings,
                    ...parsed.prebuiltDeckSettings,
                    archetypes: {
                        ...this.prebuiltDeckSettings.archetypes,
                        ...(parsed.prebuiltDeckSettings.archetypes || {}),
                    },
                    deckOverrides: {
                        ...this.prebuiltDeckSettings.deckOverrides,
                        ...(parsed.prebuiltDeckSettings.deckOverrides || {}),
                    },
                };
            }
                        if (parsed.version !== 2) {
                            this.backupLegacyDatabase();
                            this.decks.clear();
                            this.decksByUser = new Map(Array.from(this.users.keys()).map(username => [username, []]));
                            this.users.forEach(user => delete user.activeDeckId);
                            this.cardOverrides.clear();
                            this.prebuiltDeckSettings.deckOverrides = {};
                            this.saveToDisk();
                        } else {
                            let changed = this.removeIncompatibleV2Decks();
                            if (parsed.catalogContentVersion !== CATALOG_CONTENT_VERSION) {
                                this.backupCatalogDatabase();
                                this.cardOverrides.clear();
                                this.prebuiltDeckSettings.deckOverrides = {};
                                this.removeChangedRouteDecks();
                                changed = true;
                            }
                            if (changed) this.saveToDisk();
                        }
        } catch {
            // Keep the in-code defaults when the local JSON database is missing or invalid.
        }
    }

    private backupLegacyDatabase(): void {
        try {
            const backupPath = path.join(path.dirname(this.dbFilePath), 'db.v1.backup.json');
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(this.dbFilePath, backupPath);
                }

        } catch {
            // A failed backup must not prevent startup; existing file remains intact.
        }
    }

    private backupCatalogDatabase(): void {
        try {
            const backupPath = path.join(path.dirname(this.dbFilePath), 'db.catalog-v5.backup.json');
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(this.dbFilePath, backupPath);
            }
        } catch {
            // A failed backup must not prevent startup; existing file remains intact.
        }
    }

    private removeIncompatibleV2Decks(): boolean {
        const activeArchetypes = new Set(['SHONEN', 'MECHA', 'SHOJO', 'ISEKAI']);
        let changed = false;
        const incompatible = new Set(
            Array.from(this.decks.entries())
                .filter(([, deck]) => !deck.protagonistId
                    || !activeArchetypes.has(deck.archetypeId)
                    || deck.cards.length !== GAME_CONSTANTS.DECK_SIZE
                    || !CARDS[deck.protagonistId]
                    || deck.cards.some(cardId => !CARDS[cardId]))
                .map(([id]) => id)
        );
        for (const [id, cards] of Object.entries(this.prebuiltDeckSettings.deckOverrides || {})) {
            if (cards.length !== GAME_CONSTANTS.DECK_SIZE) {
                delete this.prebuiltDeckSettings.deckOverrides?.[id];
                changed = true;
            }
        }
        if (incompatible.size === 0) return changed;

        incompatible.forEach(id => this.decks.delete(id));
        this.decksByUser.forEach((deckIds, username) => {
            this.decksByUser.set(username, deckIds.filter(id => !incompatible.has(id)));
        });
        this.users.forEach(user => {
            if (user.activeDeckId && incompatible.has(user.activeDeckId)) {
                delete user.activeDeckId;
            }
        });
        return true;
    }

    private removeChangedRouteDecks(): void {
        const removed = new Set(Array.from(this.decks.entries())
            .filter(([, deck]) => Boolean(deck.protagonistId && REBUILT_ROUTE_PROTAGONISTS.has(deck.protagonistId)))
            .map(([id]) => id));
        if (!removed.size) return;
        removed.forEach(id => this.decks.delete(id));
        this.decksByUser.forEach((deckIds, username) => {
            this.decksByUser.set(username, deckIds.filter(id => !removed.has(id)));
        });
        this.users.forEach(user => {
            if (user.activeDeckId && removed.has(user.activeDeckId)) delete user.activeDeckId;
        });
    }

    private saveToDisk(): void {
        try {
            const dir = path.dirname(this.dbFilePath);
            fs.mkdirSync(dir, { recursive: true });

            const state: PersistedStoreState = {
                version: 2,
                catalogContentVersion: CATALOG_CONTENT_VERSION,
                users: Array.from(this.users.entries()),
                decks: Array.from(this.decks.entries()),
                decksByUser: Array.from(this.decksByUser.entries()),
                adminUiSettings: this.getAdminUiSettings(),
                mediaAssets: Array.from(this.mediaAssets.entries()),
                wikiContent: this.getWikiContent(),
                prebuiltDeckSettings: this.getPrebuiltDeckSettings(),
                cardOverrides: Array.from(this.cardOverrides.entries()),
                homeNews: this.listHomeNews(),
            };

            const tempPath = `${this.dbFilePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
            fs.renameSync(tempPath, this.dbFilePath);
        } catch {
            // Persistence failure should not break live gameplay; state remains in memory.
        }
    }

    // ========== User Methods ==========

    createUser(username: string, passwordHash: string): User {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        const user: User = { id, username, passwordHash };
        this.users.set(username, user);
        this.decksByUser.set(username, []);
        this.saveToDisk();
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
        this.saveToDisk();
        return true;
    }

    updateUserPassword(username: string, passwordHash: string): User | undefined {
        const user = this.users.get(username);
        if (!user) return undefined;
        user.passwordHash = passwordHash;
        this.users.set(username, user);
        this.saveToDisk();
        return user;
    }

    setActiveDeck(username: string, deckId: string): void {
        const user = this.users.get(username);
        if (user) {
            user.activeDeckId = deckId;
            this.saveToDisk();
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

        this.saveToDisk();
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
        this.saveToDisk();
        return updated;
    }

    deleteDeck(username: string, deckId: string): boolean {
        const userDecks = this.decksByUser.get(username);
        if (!userDecks) return false;

        const index = userDecks.indexOf(deckId);
        if (index === -1) return false;

        userDecks.splice(index, 1);
        this.decks.delete(deckId);
        this.saveToDisk();
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

    addToQueue(formatId: string, username: string, deckId: string, timerEnabled = false): void {
        if (!this.queues.has(formatId)) {
            this.queues.set(formatId, []);
        }
        const queue = this.queues.get(formatId)!;
        // Avoid duplicates
        if (!queue.find(q => q.username === username)) {
            queue.push({ username, deckId, timerEnabled });
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

    getQueuePair(formatId: string): Array<{ username: string; deckId: string; timerEnabled?: boolean }> | null {
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
        this.saveToDisk();
        return this.getAdminUiSettings();
    }

    getPrebuiltDeckSettings(): PrebuiltDeckSettings {
        return {
            enabled: this.prebuiltDeckSettings.enabled,
            archetypes: { ...this.prebuiltDeckSettings.archetypes },
            deckOverrides: Object.fromEntries(
                Object.entries(this.prebuiltDeckSettings.deckOverrides || {}).map(([id, cards]) => [id, [...cards]])
            ),
        };
    }

    updatePrebuiltDeckSettings(updates: Partial<PrebuiltDeckSettings>): PrebuiltDeckSettings {
        this.prebuiltDeckSettings = {
            ...this.prebuiltDeckSettings,
            ...updates,
            archetypes: {
                ...this.prebuiltDeckSettings.archetypes,
                ...(updates.archetypes || {}),
            },
            deckOverrides: updates.deckOverrides !== undefined
                ? Object.fromEntries(Object.entries(updates.deckOverrides).map(([id, cards]) => [id, [...cards]]))
                : { ...(this.prebuiltDeckSettings.deckOverrides || {}) },
        };
        this.saveToDisk();
        return this.getPrebuiltDeckSettings();
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
        this.saveToDisk();
        return fullAsset;
    }

    deleteMediaAsset(id: string): boolean {
        const deleted = this.mediaAssets.delete(id);
        if (deleted) this.saveToDisk();
        return deleted;
    }

    getWikiContent(): WikiContent {
        return { ...this.wikiContent };
    }

    updateWikiContent(updates: Partial<WikiContent>): WikiContent {
        this.wikiContent = {
            ...this.wikiContent,
            ...updates,
        };
        this.saveToDisk();
        return this.getWikiContent();
    }

    listHomeNews(): HomeNewsItem[] {
        return this.homeNews
            .map(item => ({ ...item }))
            .sort((a, b) => {
                if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
                return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
            });
    }

    upsertHomeNews(input: Partial<HomeNewsItem> & { title: string; body: string }): HomeNewsItem {
        const now = Date.now();
        const existing = input.id ? this.homeNews.find(item => item.id === input.id) : undefined;
        const id = existing?.id || input.id || `news_${Math.random().toString(36).slice(2, 11)}`;
        const item: HomeNewsItem = {
            id,
            title: input.title.trim(),
            body: input.body.trim(),
            dateLabel: (input.dateLabel || '').trim() || new Date(now).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
            image: input.image || '',
            linkUrl: input.linkUrl || '',
            linkLabel: input.linkLabel || '',
            featured: Boolean(input.featured),
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        };
        if (item.featured) {
            this.homeNews = this.homeNews.map(news => news.id === id ? news : { ...news, featured: false });
        }
        this.homeNews = existing
            ? this.homeNews.map(news => news.id === id ? item : news)
            : [item, ...this.homeNews];
        this.saveToDisk();
        return { ...item };
    }

    deleteHomeNews(id: string): boolean {
        const before = this.homeNews.length;
        this.homeNews = this.homeNews.filter(item => item.id !== id);
        const deleted = this.homeNews.length !== before;
        if (deleted) this.saveToDisk();
        return deleted;
    }

    listCardOverrides(): PersistedCardData[] {
        return Array.from(this.cardOverrides.values()).map(card => ({
            ...card,
            requirements: card.requirements ? [...card.requirements] : undefined,
            effects: card.effects ? [...card.effects] : [],
            tags: card.tags ? [...card.tags] : undefined,
            likes: card.likes ? [...card.likes] : undefined,
            dislikes: card.dislikes ? [...card.dislikes] : undefined,
            likesData: card.likesData ? {
                likes: [...card.likesData.likes],
                dislikes: [...card.likesData.dislikes],
            } : undefined,
            affinity: card.affinity ? {
                compatibleWith: [...card.affinity.compatibleWith],
            } : undefined,
        }));
    }

    upsertCardOverride(card: PersistedCardData): PersistedCardData {
        const saved: PersistedCardData = {
            ...card,
            requirements: card.requirements ? [...card.requirements] : undefined,
            effects: card.effects ? [...card.effects] : [],
            tags: card.tags ? [...card.tags] : undefined,
            likes: card.likes ? [...card.likes] : undefined,
            dislikes: card.dislikes ? [...card.dislikes] : undefined,
            likesData: card.likesData ? {
                likes: [...card.likesData.likes],
                dislikes: [...card.likesData.dislikes],
            } : undefined,
            affinity: card.affinity ? {
                compatibleWith: [...card.affinity.compatibleWith],
            } : undefined,
        };
        this.cardOverrides.set(saved.id, saved);
        this.saveToDisk();
        return { ...saved };
    }

    deleteCardOverride(id: string): boolean {
        const deleted = this.cardOverrides.delete(id);
        if (deleted) this.saveToDisk();
        return deleted;
    }
}

export const store = new MemoryStore();
