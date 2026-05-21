import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as argon2 from 'argon2';
import { store } from '../store/memory.store';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';

interface AuthBody {
    username: string;
    password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/auth/demo', async () => {
        const username = `demo_${Math.random().toString(36).slice(2, 8)}`;
        const passwordHash = await argon2.hash(Math.random().toString(36));
        const user = store.createUser(username, passwordHash);
        const template = getPrebuiltDecks(store.getPrebuiltDeckSettings())[0];

        if (!template) {
            throw new Error('No prebuilt decks available for demo mode');
        }

        const deck = store.createDeck(username, {
            name: `${template.name} Demo`,
            archetypeId: template.archetypeId,
            cards: template.cards,
            backgroundId: 'bg_01',
        });
        store.setActiveDeck(username, deck.id);

        const token = fastify.jwt.sign({ id: user.id, username: user.username });
        return { id: user.id, username: user.username, token, activeDeckId: deck.id, deck };
    });

    // POST /auth/register
    fastify.post<{ Body: AuthBody }>('/auth/register', async (request, reply) => {
        const { username, password } = request.body;

        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password required' });
        }

        if (store.findUser(username)) {
            return reply.code(400).send({ error: 'User already exists' });
        }

        const hash = await argon2.hash(password);
        const user = store.createUser(username, hash);
        const token = fastify.jwt.sign({ id: user.id, username: user.username });

        return { id: user.id, username: user.username, token };
    });

    // POST /auth/login
    fastify.post<{ Body: AuthBody }>('/auth/login', async (request, reply) => {
        const { username, password } = request.body;

        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password required' });
        }

        const user = store.findUser(username);
        if (!user || !(await argon2.verify(user.passwordHash, password))) {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const token = fastify.jwt.sign({ id: user.id, username: user.username });
        return { token, username: user.username };
    });

    // GET /auth/me - Get current user info
    fastify.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
            const user = request.user as { id: string; username: string };
            const userData = store.findUser(user.username);
            return {
                id: user.id,
                username: user.username,
                activeDeckId: userData?.activeDeckId
            };
        } catch (err) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
    });
}
