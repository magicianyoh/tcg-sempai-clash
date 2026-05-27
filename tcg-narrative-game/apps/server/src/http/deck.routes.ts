import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { store } from '../store/memory.store';
import { CardData, CardType, DeckData } from '@tcg/shared/types';
import { GAME_CONSTANTS, V2_ARCHETYPES } from '@tcg/shared/constants';
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
    protagonistId: string;
}

interface UpdateDeckBody {
    name?: string;
    cardIds?: string[];
    backgroundId?: string;
    protagonistId?: string;
}

interface DeckParams {
    id: string;
}

function narrativeRoute(card: CardData): string | undefined {
    if (card.type !== CardType.EVENT && card.type !== CardType.CLIMAX_EVENT) return undefined;
    return card.tags?.find(tag => tag.startsWith('route:'))?.slice('route:'.length);
}

function validateDeck(archetypeId: string, protagonistId: string | undefined, cardIds: string[]): { valid: boolean; error?: string } {
    // Check deck size
    if (cardIds.length !== GAME_CONSTANTS.DECK_SIZE) {
        return { valid: false, error: `Deck must have exactly ${GAME_CONSTANTS.DECK_SIZE} cards` };
    }

    // Check archetype is valid
    const validArchetypes = [...V2_ARCHETYPES];
    if (!validArchetypes.includes(archetypeId as any)) {
        return { valid: false, error: `Invalid archetype: ${archetypeId}` };
    }
    const protagonist = protagonistId ? CARDS[protagonistId] : undefined;
    if (!protagonist || protagonist.type !== CardType.PROTAGONIST || protagonist.formIndex !== 0 || protagonist.archetype !== archetypeId) {
        return { valid: false, error: 'Select a valid V2 protagonist for this archetype' };
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
        if (card.type === CardType.PROTAGONIST || card.type === CardType.PLOT_TWIST_EVENT) {
            return { valid: false, error: `${card.name} is associated with the protagonist and is not part of the ${GAME_CONSTANTS.DECK_SIZE}-card deck` };
        }
        if (card.tags?.includes('external-only')) {
            return { valid: false, error: `${card.name} can only be invoked by a card effect` };
        }
        if (card.protagonistId && card.protagonistId !== protagonistId) {
            return { valid: false, error: `${card.name} belongs to another protagonist route` };
        }

        // Check max copies
        const maxCopies = card.maxCopies ?? GAME_CONSTANTS.MAX_COPIES_PER_CARD;
        if (cardCount[cardId] > maxCopies) {
            return { valid: false, error: `Too many copies of ${card.name} (max: ${maxCopies})` };
        }
    }

    const routes = new Set(cardIds
        .map(cardId => narrativeRoute(CARDS[cardId]))
        .filter((route): route is string => Boolean(route)));
    if (routes.size > 1) {
        return { valid: false, error: 'El mazo debe elegir una sola ruta narrativa de Eventos para su protagonista.' };
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
        const { name, archetypeId, cardIds, backgroundId, protagonistId } = request.body;

        if (!name || !archetypeId || !protagonistId || !cardIds) {
            return reply.code(400).send({ error: 'Missing required fields: name, archetypeId, protagonistId, cardIds' });
        }

        const validation = validateDeck(archetypeId, protagonistId, cardIds);
        if (!validation.valid) {
            return reply.code(400).send({ error: validation.error });
        }

        const deck = store.createDeck(user.username, {
            name,
            archetypeId,
            cards: cardIds,
            backgroundId,
            protagonistId,
        });

        // Set as active deck
        store.setActiveDeck(user.username, deck.id);

        return reply.code(201).send({ deck });
    });

    // PUT /decks/:id - Update deck
    fastify.put<{ Params: DeckParams; Body: UpdateDeckBody }>('/decks/:id', async (request, reply) => {
        const user = request.user as { username: string };
        const { id } = request.params;
        const { name, cardIds, backgroundId, protagonistId } = request.body;

        if (!store.isUserDeck(user.username, id)) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        const existingDeck = store.getDeck(id);
        if (!existingDeck) {
            return reply.code(404).send({ error: 'Deck not found' });
        }

        // Validate cards if updating
        if (cardIds) {
            const validation = validateDeck(existingDeck.archetypeId as string, protagonistId || existingDeck.protagonistId, cardIds);
            if (!validation.valid) {
                return reply.code(400).send({ error: validation.error });
            }
        }

        const updated = store.updateDeck(id, {
            ...(name && { name }),
            ...(cardIds && { cards: cardIds }),
            ...(backgroundId && { backgroundId }),
            ...(protagonistId && { protagonistId }),
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
