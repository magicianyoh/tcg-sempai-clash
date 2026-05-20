import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as argon2 from 'argon2';
import { CARDS } from '@tcg/game-engine/content/cards';
import { store } from '../store/memory.store';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';
import {
    AdminCardRecord,
    applyCardUpdate,
    auditCards,
    importCsvCards,
    MutableCard,
    serializeCard,
    validateCsv,
} from '../content/card-catalog';

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

    fastify.post<{ Body: AdminCsvBody }>('/admin/cards/validate-import', async (request) => {
        return { validation: validateCsv(request.body.csv || '') };
    });

    fastify.post<{ Body: AdminCsvBody }>('/admin/cards/import', async (request, reply) => {
        try {
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

    fastify.get('/admin/prebuilt-decks/settings', async () => {
        return {
            settings: store.getPrebuiltDeckSettings(),
            decks: getPrebuiltDecks({ enabled: true, archetypes: {} }),
        };
    });

    fastify.put<{ Body: AdminPrebuiltDeckSettingsBody }>('/admin/prebuilt-decks/settings', async (request) => {
        return {
            settings: store.updatePrebuiltDeckSettings(request.body),
        };
    });
}
