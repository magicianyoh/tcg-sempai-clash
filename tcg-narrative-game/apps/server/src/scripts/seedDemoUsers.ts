import * as argon2 from 'argon2';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';
import { store } from '../store/memory.store';

const password = process.env.DEMO_PASSWORD || 'demo1234';
const count = Number(process.env.DEMO_USER_COUNT || 10);

async function main(): Promise<void> {
    const templates = getPrebuiltDecks(store.getPrebuiltDeckSettings());
    if (templates.length === 0) {
        throw new Error('No prebuilt decks available for demo seed users');
    }

    const passwordHash = await argon2.hash(password);
    const users: Array<{ username: string; password: string; activeDeckId: string }> = [];

    for (let index = 1; index <= count; index++) {
        const username = `demo${String(index).padStart(2, '0')}`;
        const template = templates[(index - 1) % templates.length];
        let user = store.findUser(username);

        if (!user) {
            user = store.createUser(username, passwordHash);
        }

        const existingDeck = store.getDecksForUser(username).find(deck => deck.name.startsWith('Demo - '));
        const deck = existingDeck || store.createDeck(username, {
            name: `Demo - ${template.name}`,
            archetypeId: template.archetypeId,
            cards: template.cards,
            backgroundId: `bg_0${((index - 1) % 4) + 1}`,
        });

        store.setActiveDeck(username, deck.id);
        users.push({ username, password, activeDeckId: deck.id });
    }

    console.log(JSON.stringify({
        ok: true,
        count: users.length,
        password,
        users,
    }, null, 2));
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
