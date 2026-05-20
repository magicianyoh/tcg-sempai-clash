import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { authRoutes } from './http/auth.routes';
import { deckRoutes } from './http/deck.routes';
import { adminRoutes } from './http/admin.routes';
import { wsGateway } from './ws/ws.gateway';
import { CARDS } from '@tcg/game-engine/content/cards';
import { matchService, CpuDifficulty } from './ws/match.service';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { store } from './store/memory.store';
import { applyPersistedCardOverrides, MutableCard, serializeCard } from './content/card-catalog';

const server = Fastify({ logger: true });
const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev-secret-change-me');
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
    : !isProduction;

if (!jwtSecret) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
}

applyPersistedCardOverrides();

server.register(cors, {
    origin: corsOrigin,
    credentials: true,
});
server.register(jwt, { secret: jwtSecret });

// HTTP Routes
server.register(authRoutes);
server.register(deckRoutes);
server.register(adminRoutes);

server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
});

server.get('/ui-settings', async () => {
    return { settings: store.getAdminUiSettings() };
});

server.get('/wiki-content', async () => {
    return { content: store.getWikiContent() };
});

server.get('/cards', async () => {
    const cardsByArchetype: Record<string, unknown[]> = {};

    for (const card of Object.values(CARDS)) {
        if (!cardsByArchetype[card.archetype]) {
            cardsByArchetype[card.archetype] = [];
        }

        cardsByArchetype[card.archetype].push(serializeCard(card as MutableCard));
    }

    return { cards: cardsByArchetype };
});

server.post('/cpu-match', async (request, reply) => {
    try {
        await request.jwtVerify();
    } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = request.user as { username: string };
    const body = request.body as {
        deckId?: string;
        cpuArchetypeId?: string;
        difficulty?: CpuDifficulty;
        formatId?: string;
    };

    const deckId = body?.deckId;
    const cpuArchetypeId = body?.cpuArchetypeId;
    const difficulty = body?.difficulty || 'normal';
    const formatId = body?.formatId || GAME_CONSTANTS.DEFAULT_FORMAT;

    if (!deckId || !cpuArchetypeId) {
        return reply.code(400).send({ error: 'Missing required fields: deckId, cpuArchetypeId' });
    }

    if (!['easy', 'normal', 'hard'].includes(difficulty)) {
        return reply.code(400).send({ error: 'Invalid difficulty' });
    }

    try {
        const match = matchService.createCpuMatch(user.username, deckId, cpuArchetypeId, difficulty, formatId);
        return reply.code(201).send({ matchId: match.matchId, matchState: match });
    } catch (err: any) {
        return reply.code(400).send({ error: err.message || 'Could not create CPU match' });
    }
});

const start = async () => {
    try {
        await server.ready();
        wsGateway(server); // Attach WS
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server running on http://0.0.0.0:${port}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
