import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as argon2 from 'argon2';
import { CARDS } from '@tcg/game-engine/content/cards';
import { CardData } from '@tcg/shared/types';
import { store } from '../store/memory.store';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

type MutableCard = CardData & {
    sound?: string;
    likes?: string[];
    dislikes?: string[];
};

interface AdminLoginBody {
    username: string;
    password: string;
}

interface AdminCardUpdateBody {
    name?: string;
    desc?: string;
    description?: string;
    type?: string;
    cost?: number;
    archetype?: string;
    image?: string;
    sound?: string;
    likes?: string[];
    dislikes?: string[];
    requirements?: unknown[];
    effects?: unknown[];
    tags?: string[];
    maxCopies?: number;
}

interface AdminUserBody {
    username: string;
    password: string;
}

interface AdminCsvBody {
    csv: string;
}

function serializeCard(card: MutableCard) {
    return {
        id: card.id,
        name: card.name,
        type: card.type,
        cost: card.cost,
        archetype: card.archetype,
        desc: card.description,
        description: card.description,
        backstory: card.backstory,
        image: card.image,
        sound: card.sound || '',
        maxCopies: card.maxCopies,
        prereqs: card.eventPrerequisites || [],
        requirements: card.requirements || [],
        effects: card.effects || [],
        likes: card.likesData?.likes || card.likes || [],
        dislikes: card.likesData?.dislikes || card.dislikes || [],
        tags: card.tags || [],
    };
}

function parseList(value?: string): string[] {
    if (!value) return [];
    return value.split(/[|,]/).map(item => item.trim()).filter(Boolean);
}

function parseJsonList(value?: string): unknown[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseCsv(csv: string): Record<string, string>[] {
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
        const values: string[] = [];
        let current = '';
        let quoted = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const next = line[i + 1];

            if (char === '"' && quoted && next === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                quoted = !quoted;
            } else if (char === ',' && !quoted) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    };

    const headers = parseLine(lines[0]).map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = parseLine(line);
        return headers.reduce<Record<string, string>>((row, header, index) => {
            row[header] = values[index] || '';
            return row;
        }, {});
    });
}

function upsertCard(row: Record<string, string>): MutableCard {
    const id = row.id?.trim();
    if (!id) throw new Error('CSV row missing id');

    const existing = CARDS[id] as MutableCard | undefined;
    const card = existing || {
        id,
        name: id,
        type: 'PERSONAJE',
        cost: 1,
        description: '',
        effects: [],
        archetype: row.archetype || 'SHONEN',
        image: id,
    } as MutableCard;

    card.name = row.name || card.name;
    card.type = (row.type || card.type) as CardData['type'];
    card.cost = row.cost ? Number(row.cost) : card.cost;
    card.description = row.description || row.desc || card.description;
    card.archetype = row.archetype || card.archetype;
    card.image = row.image || card.image;
    card.sound = row.sound || card.sound || '';
    card.maxCopies = row.maxCopies ? Number(row.maxCopies) : card.maxCopies;
    card.tags = row.tags ? parseList(row.tags) : card.tags;
    card.eventPrerequisites = row.prereqs ? parseList(row.prereqs) : card.eventPrerequisites;
    card.requirements = row.requirements ? parseJsonList(row.requirements) as any : card.requirements;
    card.effects = row.effects ? parseJsonList(row.effects) as any : card.effects;
    card.likesData = {
        likes: row.likes ? parseList(row.likes) : card.likesData?.likes || [],
        dislikes: row.dislikes ? parseList(row.dislikes) : card.likesData?.dislikes || [],
    };

    (CARDS as Record<string, MutableCard>)[id] = card;
    return card;
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

    fastify.put<{ Params: { id: string }; Body: AdminCardUpdateBody }>('/admin/cards/:id', async (request, reply) => {
        const card = CARDS[request.params.id] as MutableCard | undefined;
        if (!card) return reply.code(404).send({ error: 'Card not found' });

        const body = request.body;
        card.name = body.name ?? card.name;
        card.description = body.description ?? body.desc ?? card.description;
        if (body.type) card.type = body.type as CardData['type'];
        if (body.cost !== undefined) card.cost = Number(body.cost);
        if (body.archetype) card.archetype = body.archetype;
        if (body.image !== undefined) card.image = body.image;
        if (body.sound !== undefined) card.sound = body.sound;
        if (body.maxCopies !== undefined) card.maxCopies = Number(body.maxCopies);
        if (body.tags) card.tags = body.tags;
        if (body.requirements) card.requirements = body.requirements as CardData['requirements'];
        if (body.effects) card.effects = body.effects as CardData['effects'];
        if (body.likes || body.dislikes) {
            card.likesData = {
                likes: body.likes || card.likesData?.likes || [],
                dislikes: body.dislikes || card.likesData?.dislikes || [],
            };
        }

        return { card: serializeCard(card) };
    });

    fastify.post<{ Body: AdminCsvBody }>('/admin/cards/import', async (request, reply) => {
        const rows = parseCsv(request.body.csv || '');
        const imported = rows.map(row => serializeCard(upsertCard(row)));
        return reply.code(201).send({ imported, count: imported.length });
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
}
