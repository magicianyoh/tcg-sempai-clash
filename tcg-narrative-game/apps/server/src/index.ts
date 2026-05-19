import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { authRoutes } from './http/auth.routes';
import { deckRoutes } from './http/deck.routes';
import { wsGateway } from './ws/ws.gateway';
import { CARDS } from '@tcg/game-engine/content/cards';

const server = Fastify({ logger: true });

server.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
});
server.register(jwt, { secret: 'supersecret' });

// HTTP Routes
server.register(authRoutes);
server.register(deckRoutes);

server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
});

server.get('/cards', async () => {
    const cardsByArchetype: Record<string, unknown[]> = {};

    for (const card of Object.values(CARDS)) {
        if (!cardsByArchetype[card.archetype]) {
            cardsByArchetype[card.archetype] = [];
        }

        cardsByArchetype[card.archetype].push({
            id: card.id,
            name: card.name,
            type: card.type,
            cost: card.cost,
            desc: card.description,
            backstory: card.backstory,
            maxCopies: card.maxCopies,
            prereqs: card.eventPrerequisites,
        });
    }

    return { cards: cardsByArchetype };
});

const start = async () => {
    try {
        await server.ready();
        wsGateway(server); // Attach WS
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server running on http://localhost:${port}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
