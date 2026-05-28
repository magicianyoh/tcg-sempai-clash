import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as argon2 from 'argon2';
import { CARDS } from '@tcg/game-engine/content/cards';
import { store } from '../store/memory.store';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';
import {
    AdminCardRecord,
    applyCardUpdate,
    auditCards,
    exportCardsCsvBlankTemplate,
    exportCardsCsvTemplate,
    importCsvCards,
    MutableCard,
    parseArchetypeCsv,
    serializeCard,
    validateArchetypeCsv,
    validateCsv,
} from '../content/card-catalog';
import { ARCHETYPE_INFO, GAME_CONSTANTS, V2_ARCHETYPES } from '@tcg/shared/constants';
import { CardType } from '@tcg/shared/types';

const isProduction = process.env.NODE_ENV === 'production';

function requiredInProduction(name: string, fallback: string): string {
    const value = process.env[name];
    if (isProduction && !value) {
        throw new Error(`${name} is required when NODE_ENV=production`);
    }
    return value || fallback;
}

const ADMIN_USERNAME = requiredInProduction('ADMIN_USERNAME', 'admin');
const ADMIN_PASSWORD = requiredInProduction('ADMIN_PASSWORD', 'admin1234');

interface AdminLoginBody {
    username: string;
    password: string;
}

type AdminCardUpdateBody = Partial<AdminCardRecord>;

interface AdminUserBody {
    username: string;
    password: string;
}

interface AdminCsvBody {
    csv: string;
    kind?: 'cards' | 'archetypes';
}

interface AdminMediaUploadBody {
    files: Array<{
        name: string;
        type: 'image' | 'audio' | 'other';
        mimeType: string;
        dataUrl: string;
        size: number;
    }>;
}

interface AdminWikiBody {
    rules?: string;
    modes?: string;
    mechanics?: string;
}

interface AdminPrebuiltDeckSettingsBody {
    enabled?: boolean;
    archetypes?: Record<string, boolean>;
    deckOverrides?: Record<string, string[]>;
}

interface AdminHomeNewsBody {
    id?: string;
    title?: string;
    body?: string;
    dateLabel?: string;
    image?: string;
    linkUrl?: string;
    linkLabel?: string;
    featured?: boolean;
}

function csvEscape(value: unknown): string {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: unknown[][]): string {
    return rows.map(row => row.map(csvEscape).join(',')).join('\n');
}

function exportArchetypesCsvTemplate(): string {
    const settings = store.getPrebuiltDeckSettings();
    const rows = V2_ARCHETYPES.map(id => {
        const info = ARCHETYPE_INFO[id as keyof typeof ARCHETYPE_INFO];
        return [id, info?.name || id, info?.description || '', settings.archetypes[id] !== false ? 'true' : 'false'];
    });
    return toCsv([['id', 'name', 'description', 'enabled'], ...rows]);
}

function validatePrebuiltDeckOverride(deckId: string, cards: string[]): string | null {
    const deck = getPrebuiltDecks({ enabled: true, archetypes: {}, deckOverrides: {} }).find(item => item.id === deckId);
    if (!deck) return `Deck pre-armado inexistente: ${deckId}`;
    if (cards.length !== GAME_CONSTANTS.DECK_SIZE) return `El deck debe tener ${GAME_CONSTANTS.DECK_SIZE} cartas.`;

    const counts: Record<string, number> = {};
    for (const id of cards) {
        const card = CARDS[id];
        if (!card) return `Carta inexistente: ${id}`;
        if (card.archetype !== deck.archetypeId) return `${card.name} no pertenece al arquetipo ${deck.archetypeId}.`;
        if (card.type === CardType.PROTAGONIST || card.type === CardType.PLOT_TWIST_EVENT) {
            return `${card.name} pertenece al avatar o a la respuesta Plot-Twist y no ocupa el deck.`;
        }
        if (card.protagonistId && card.protagonistId !== deck.protagonistId) {
            return `${card.name} no pertenece a la linea de ${deck.protagonistName}.`;
        }
        counts[id] = (counts[id] || 0) + 1;
        const max = card.maxCopies ?? GAME_CONSTANTS.MAX_COPIES_PER_CARD;
        if (counts[id] > max) return `Demasiadas copias de ${card.name}; maximo ${max}.`;
    }
    return null;
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
        const user = request.user as { role?: string };
        if (user.role !== 'admin') {
            return reply.code(403).send({ error: 'Forbidden' });
        }
    } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
    }
}

export async function adminRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: AdminLoginBody }>('/admin/login', async (request, reply) => {
        const { username, password } = request.body;
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return reply.code(401).send({ error: 'Invalid admin credentials' });
        }

        const token = fastify.jwt.sign({ username, role: 'admin' });
        return { token, username, role: 'admin' };
    });

    fastify.addHook('onRequest', async (request, reply) => {
        if (!request.url.startsWith('/admin/') || request.url === '/admin/login') return;
        return requireAdmin(request, reply);
    });

    fastify.get('/admin/cards', async () => {
        return { cards: Object.values(CARDS).map(card => serializeCard(card as MutableCard)) };
    });

    fastify.get('/admin/cards/audit', async () => {
        return { audit: auditCards() };
    });

    fastify.put<{ Params: { id: string }; Body: AdminCardUpdateBody }>('/admin/cards/:id', async (request, reply) => {
        try {
            const card = applyCardUpdate(request.params.id, request.body);
            if (!card) return reply.code(404).send({ error: 'Card not found' });
            return { card };
        } catch (error: any) {
            return reply.code(400).send({ error: error.message || 'Invalid card data' });
        }
    });

    fastify.get<{ Params: { kind: string }; Querystring: { blank?: string } }>('/admin/csv/templates/:kind', async (request, reply) => {
        const kind = request.params.kind;
        if (kind === 'cards') {
            return {
                filename: 'sempai-cards-template.csv',
                csv: request.query.blank === 'true' ? exportCardsCsvBlankTemplate() : exportCardsCsvTemplate(),
            };
        }
        if (kind === 'archetypes') {
            return { filename: 'sempai-archetypes-template.csv', csv: exportArchetypesCsvTemplate() };
        }
        return reply.code(404).send({ error: 'Unknown CSV template kind' });
    });

    fastify.post<{ Body: AdminCsvBody }>('/admin/cards/validate-import', async (request) => {
        const kind = request.body.kind || 'cards';
        return { validation: kind === 'archetypes' ? validateArchetypeCsv(request.body.csv || '') : validateCsv(request.body.csv || '') };
    });

    fastify.post<{ Body: AdminCsvBody }>('/admin/cards/import', async (request, reply) => {
        try {
            if ((request.body.kind || 'cards') === 'archetypes') {
                const imported = parseArchetypeCsv(request.body.csv || '');
                const archetypes = Object.fromEntries(imported.map(item => [item.id, item.enabled]));
                const settings = store.updatePrebuiltDeckSettings({ archetypes });
                return reply.code(201).send({ imported, count: imported.length, settings });
            }

            const imported = importCsvCards(request.body.csv || '');
            return reply.code(201).send({ imported, count: imported.length, audit: auditCards() });
        } catch (error: any) {
            if (error.validation) {
                return reply.code(400).send({ error: 'CSV validation failed', validation: error.validation });
            }
            return reply.code(400).send({ error: error.message || 'CSV import failed' });
        }
    });

    fastify.get('/admin/users', async () => {
        return {
            users: store.listUsers().map(user => ({
                id: user.id,
                username: user.username,
                activeDeckId: user.activeDeckId || '',
            })),
        };
    });

    fastify.post<{ Body: AdminUserBody }>('/admin/users', async (request, reply) => {
        const { username, password } = request.body;
        if (!username || !password) return reply.code(400).send({ error: 'username and password required' });
        if (store.findUser(username)) return reply.code(400).send({ error: 'User already exists' });

        const user = store.createUser(username, await argon2.hash(password));
        return reply.code(201).send({ user: { id: user.id, username: user.username, activeDeckId: user.activeDeckId || '' } });
    });

    fastify.put<{ Params: { username: string }; Body: { password?: string } }>('/admin/users/:username', async (request, reply) => {
        if (!request.body.password) return reply.code(400).send({ error: 'password required' });
        const user = store.updateUserPassword(request.params.username, await argon2.hash(request.body.password));
        if (!user) return reply.code(404).send({ error: 'User not found' });
        return { user: { id: user.id, username: user.username, activeDeckId: user.activeDeckId || '' } };
    });

    fastify.delete<{ Params: { username: string } }>('/admin/users/:username', async (request, reply) => {
        const deleted = store.deleteUser(request.params.username);
        if (!deleted) return reply.code(404).send({ error: 'User not found' });
        return { success: true };
    });

    fastify.get('/admin/ui-settings', async () => {
        return { settings: store.getAdminUiSettings() };
    });

    fastify.put<{ Body: Record<string, string> }>('/admin/ui-settings', async (request) => {
        return { settings: store.updateAdminUiSettings(request.body) };
    });

    fastify.get('/admin/media', async () => {
        return { media: store.listMediaAssets() };
    });

    fastify.post<{ Body: AdminMediaUploadBody }>('/admin/media', async (request, reply) => {
        const files = request.body.files || [];
        const media = files.map(file => store.addMediaAsset({
            name: file.name,
            type: file.type,
            mimeType: file.mimeType,
            dataUrl: file.dataUrl,
            size: file.size,
        }));
        return reply.code(201).send({ media, count: media.length });
    });

    fastify.delete<{ Params: { id: string } }>('/admin/media/:id', async (request, reply) => {
        const deleted = store.deleteMediaAsset(request.params.id);
        if (!deleted) return reply.code(404).send({ error: 'Media not found' });
        return { success: true };
    });

    fastify.get('/admin/wiki-content', async () => {
        return { content: store.getWikiContent() };
    });

    fastify.put<{ Body: AdminWikiBody }>('/admin/wiki-content', async (request) => {
        return { content: store.updateWikiContent(request.body) };
    });

    fastify.get('/admin/home-news', async () => {
        return { news: store.listHomeNews() };
    });

    fastify.post<{ Body: AdminHomeNewsBody }>('/admin/home-news', async (request, reply) => {
        if (!request.body.title?.trim() || !request.body.body?.trim()) {
            return reply.code(400).send({ error: 'Title and body are required' });
        }
        return reply.code(201).send({ newsItem: store.upsertHomeNews(request.body as AdminHomeNewsBody & { title: string; body: string }) });
    });

    fastify.put<{ Params: { id: string }; Body: AdminHomeNewsBody }>('/admin/home-news/:id', async (request, reply) => {
        if (!request.body.title?.trim() || !request.body.body?.trim()) {
            return reply.code(400).send({ error: 'Title and body are required' });
        }
        return { newsItem: store.upsertHomeNews({ ...request.body, id: request.params.id } as AdminHomeNewsBody & { title: string; body: string }) };
    });

    fastify.delete<{ Params: { id: string } }>('/admin/home-news/:id', async (request, reply) => {
        const deleted = store.deleteHomeNews(request.params.id);
        if (!deleted) return reply.code(404).send({ error: 'News item not found' });
        return { success: true };
    });

    fastify.get('/admin/prebuilt-decks/settings', async () => {
        const settings = store.getPrebuiltDeckSettings();
        return {
            settings,
            decks: getPrebuiltDecks({ enabled: true, archetypes: {}, deckOverrides: settings.deckOverrides || {} }),
        };
    });

    fastify.put<{ Body: AdminPrebuiltDeckSettingsBody }>('/admin/prebuilt-decks/settings', async (request, reply) => {
        for (const [deckId, cards] of Object.entries(request.body.deckOverrides || {})) {
            const error = validatePrebuiltDeckOverride(deckId, cards);
            if (error) return reply.code(400).send({ error });
        }

        return {
            settings: store.updatePrebuiltDeckSettings(request.body),
        };
    });

}
