import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as argon2 from 'argon2';
import { store } from '../store/memory.store';

interface AuthBody {
    username: string;
    password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
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
