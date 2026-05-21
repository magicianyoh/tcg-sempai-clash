import http from 'http';
import WebSocket from 'ws';

const baseUrl = process.env.E2E_BASE_URL || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3002';
const wsUrl = baseUrl.replace(/^http/, 'ws');

type JsonValue = Record<string, any>;

function request<T extends JsonValue>(method: string, path: string, body?: JsonValue, token?: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
        if (body) {
            headers['content-type'] = 'application/json';
            headers['content-length'] = String(Buffer.byteLength(payload));
        }
        const req = http.request(`${baseUrl}${path}`, {
            method,
            headers,
        }, response => {
            let raw = '';
            response.on('data', chunk => {
                raw += chunk;
            });
            response.on('end', () => {
                const parsed = raw ? JSON.parse(raw) : {};
                if ((response.statusCode || 500) >= 400) {
                    reject(new Error(`${method} ${path} failed: ${response.statusCode} ${raw}`));
                    return;
                }
                resolve(parsed as T);
            });
        });

        req.on('error', reject);
        req.end(payload);
    });
}

function waitForMatchState(
    token: string,
    matchId: string,
    afterOpen?: (ws: WebSocket) => void,
    predicate: (matchState: JsonValue) => boolean = () => true,
): Promise<JsonValue> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token)}`);
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error(`Timed out waiting for MATCH_STATE on ${matchId}`));
        }, 7000);

        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'MATCH_REJOIN', payload: { matchId } }));
            afterOpen?.(ws);
        });

        ws.on('message', raw => {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'MATCH_STATE' && predicate(msg.payload.matchState)) {
                clearTimeout(timeout);
                ws.close();
                resolve(msg.payload.matchState);
            }
        });

        ws.on('error', error => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

async function createDeckFromTemplate(token: string, name: string): Promise<{ deckId: string; archetypeId: string }> {
    const prebuilt = await request<{ decks: Array<{ archetypeId: string; cards: string[] }> }>('GET', '/prebuilt-decks', undefined, token);
    const template = prebuilt.decks[0];
    if (!template) throw new Error('No prebuilt deck available');

    const deck = await request<{ deck: { id: string; cards: string[] } }>('POST', '/decks', {
        name,
        archetypeId: template.archetypeId,
        cardIds: template.cards,
        backgroundId: 'bg_01',
    }, token);

    if (deck.deck.cards.length !== 20) {
        throw new Error(`Builder created deck with ${deck.deck.cards.length} cards`);
    }

    return { deckId: deck.deck.id, archetypeId: template.archetypeId };
}

async function createCpuMatchAndBattle(token: string, deckId: string, archetypeId: string): Promise<JsonValue> {
    const cpuMatch = await request<{ matchId: string; matchState: JsonValue }>('POST', '/cpu-match', {
        deckId,
        cpuArchetypeId: archetypeId,
        difficulty: 'normal',
        formatId: 'standard',
    }, token);

    const initial = await waitForMatchState(token, cpuMatch.matchId);
    if (!Array.isArray(initial.players) || initial.players.length !== 2) {
        throw new Error('Battle did not rejoin with two players');
    }

    const advanced = await waitForMatchState(
        token,
        cpuMatch.matchId,
        ws => ws.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: {
                matchId: cpuMatch.matchId,
                action: { type: 'END_TURN' },
            },
        })),
        state => Number(state.turnNumber || 0) >= 3 || state.phase === 'ended',
    );

    if (!Array.isArray(advanced.log) || advanced.log.length < 2) {
        throw new Error('Battle did not append match log entries');
    }

    return advanced;
}

async function main(): Promise<void> {
    const username = `e2e_${Math.random().toString(36).slice(2, 10)}`;
    const password = 'pass1234';

    const registered = await request<{ token: string; username: string }>('POST', '/auth/register', { username, password });
    const login = await request<{ token: string; username: string }>('POST', '/auth/login', { username, password });
    if (login.username !== username) throw new Error('Login returned unexpected user');

    const me = await request<{ username: string }>('GET', '/auth/me', undefined, login.token);
    if (me.username !== username) throw new Error('Authenticated /auth/me mismatch');

    const deck = await createDeckFromTemplate(login.token, 'Publication E2E Deck');
    const firstBattle = await createCpuMatchAndBattle(login.token, deck.deckId, deck.archetypeId);
    const rematch = await request<{ matchId: string; matchState: JsonValue }>('POST', '/cpu-match', {
        deckId: deck.deckId,
        cpuArchetypeId: deck.archetypeId,
        difficulty: 'normal',
        formatId: 'standard',
    }, login.token);

    if (!rematch.matchId || rematch.matchId === firstBattle.matchId) {
        throw new Error('Rematch did not create a fresh match');
    }

    const demo = await request<{ token: string; username: string; activeDeckId: string }>('POST', '/auth/demo');
    if (!demo.token || !demo.activeDeckId || !demo.username.startsWith('demo_')) {
        throw new Error('Demo mode did not return a playable session');
    }

    console.log(JSON.stringify({
        ok: true,
        baseUrl,
        registeredToken: Boolean(registered.token),
        username,
        deckId: deck.deckId,
        firstBattleTurn: firstBattle.turnNumber,
        rematchId: rematch.matchId,
        demoUser: demo.username,
        demoDeckId: demo.activeDeckId,
    }, null, 2));
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
