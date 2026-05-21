import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { store } from '../store/memory.store';
import { DeckData } from '@tcg/shared/types';
import { GAME_CONSTANTS, ARCHETYPES } from '@tcg/shared/constants';
import { CARDS } from '@tcg/game-engine/content/cards';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';

// ============================================
// Deck Validation
// ============================================

interface CreateDeckBody {
    name: string;
    archetypeId: string;
    cardIds: string[];
    backgroundId?: string;
}

interface UpdateDeckBody {
    name?: string;
    cardIds?: string[];
    backgroundId?: string;
}

interface DeckParams {
    id: string;
}

function validateDeck(archetypeId: string, cardIds: string[]): { valid: boolean; error?: string } {
    // Check deck size
    if (cardIds.length !== GAME_CONSTANTS.DECK_SIZE) {
        return { valid: false, error: `Deck must have exactly ${GAME_CONSTANTS.DECK_SIZE} cards` };
    }

    // Check archetype is valid
    const validArchetypes = Object.values(ARCHETYPES);
    if (!validArchetypes.includes(archetypeId as any)) {
        return { valid: false, error: `Invalid archetype: ${archetypeId}` };
    }

    // Count card copies
    const cardCount: Record<string, number> = {};
    for (const cardId of cardIds) {
        cardCount[cardId] = (cardCount[cardId] || 0) + 1;
    }

    // Validate each card
    for (const cardId of Object.keys(cardCount)) {
        const card = CARDS[cardId];
        if (!card) {
            return { valid: false, error: `Card not found: ${cardId}` };
        }

        // Check card belongs to archetype
        if (card.archetype !== archetypeId) {
            return { valid: false, error: `Card ${cardId} does not belong to archetype ${archetypeId}` };
        }

        // Check max copies
        const maxCopies = card.maxCopies ?? GAME_CONSTANTS.MAX_COPIES_PER_CARD;
        if (cardCount[cardId] > maxCopies) {
            return { valid: false, error: `Too many copies of ${card.name} (max: ${maxCopies})` };
        }
    }

    return { valid: true };
}

// ============================================
// Routes
// ============================================

export async function deckRoutes(fastify: FastifyInstance) {
    fastify.get('/prebuilt-decks', async () => {
        return { decks: getPrebuiltDecks(store.getPrebuiltDeckSettings()) };
    });

    // Auth hook for all deck routes
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        if (request.url.startsWith('/prebuilt-decks')) return;

        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });

    // GET /decks - List user's decks
    fastify.get('/decks', async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as { username: string };
        const decks = store.getDecksForUser(user.username);
        return { decks };
    });

    // GET /decks/:id - Get single deck
    fastify.get<{ Params: DeckParams }>('/decks/:id', async (request, reply) => {
        const user = request.user as { username: string };
        const { id } = request.params;

        if (!store.isUserDeck(user.username, id)) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        const deck = store.getDeck(id);
        return { deck };
    });

    // POST /decks - Create new deck
    fastify.post<{ Body: CreateDeckBody }>('/decks', async (request, reply) => {
        const user = request.user as { username: string };
        const { name, archetypeId, cardIds, backgroundId } = request.body;

        if (!name || !archetypeId || !cardIds) {
            return reply.code(400).send({ error: 'Missing required fields: name, archetypeId, cardIds' });
        }

        const validation = validateDeck(archetypeId, cardIds);
        if (!validation.valid) {
            return reply.code(400).send({ error: validation.error });
        }

        const deck = store.createDeck(user.username, {
            name,
            archetypeId,
            cards: cardIds,
            backgroundId,
        });

        // Set as active deck
        store.setActiveDeck(user.username, deck.id);

        return reply.code(201).send({ deck });
    });

    // PUT /decks/:id - Update deck
    fastify.put<{ Params: DeckParams; Body: UpdateDeckBody }>('/decks/:id', async (request, reply) => {
        const user = request.user as { username: string };
        const { id } = request.params;
        const { name, cardIds, backgroundId } = request.body;

        if (!store.isUserDeck(user.username, id)) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        const existingDeck = store.getDeck(id);
        if (!existingDeck) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        // Validate cards if updating
        if (cardIds) {
            const validation = validateDeck(existingDeck.archetypeId as string, cardIds);
            if (!validation.valid) {
                return reply.code(400).send({ error: validation.error });
            }
        }

        const updated = store.updateDeck(id, {
            ...(name && { name }),
            ...(cardIds && { cards: cardIds }),
            ...(backgroundId && { backgroundId }),
        });

        return { deck: updated };
    });

    // DELETE /decks/:id - Delete deck
    fastify.delete<{ Params: DeckParams }>('/decks/:id', async (request, reply) => {
        const user = request.user as { username: string };
        const { id } = request.params;

        if (!store.isUserDeck(user.username, id)) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        store.deleteDeck(user.username, id);
        return { success: true };
    });

    // POST /decks/:id/activate - Set as active deck
    fastify.post<{ Params: DeckParams }>('/decks/:id/activate', async (request, reply) => {
        const user = request.user as { username: string };
        const { id } = request.params;

        if (!store.isUserDeck(user.username, id)) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        store.setActiveDeck(user.username, id);
        return { success: true, activeDeckId: id };
    });
}
