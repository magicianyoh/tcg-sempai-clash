import http from 'http';
import WebSocket from 'ws';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3002';
const wsUrl = baseUrl.replace(/^http/, 'ws');

type JsonValue = Record<string, unknown>;

function request<T extends JsonValue>(method: string, path: string, body?: JsonValue, token?: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const req = http.request(`${baseUrl}${path}`, {
            method,
            headers: {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
                ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
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

async function waitForMatchState(
    token: string,
    matchId: string,
    afterOpen?: (ws: WebSocket) => void,
    predicate: (matchState: JsonValue) => boolean = () => true,
): Promise<JsonValue> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token)}`);
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Timed out waiting for MATCH_STATE'));
        }, 5000);

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

async function main(): Promise<void> {
    const username = `smoke_${Math.random().toString(36).slice(2, 10)}`;
    const auth = await request<{ token: string; username: string }>('POST', '/auth/register', {
        username,
        password: 'pass1234',
    });

    const prebuilt = await request<{ decks: Array<{ id: string; archetypeId: string; cards: string[] }> }>('GET', '/prebuilt-decks', undefined, auth.token);
    const template = prebuilt.decks[0];
    if (!template) throw new Error('No prebuilt decks returned');

    const deck = await request<{ deck: { id: string; cards: string[] } }>('POST', '/decks', {
        name: 'Smoke Deck',
        archetypeId: template.archetypeId,
        cardIds: template.cards,
        backgroundId: 'bg_01',
    }, auth.token);

    if (deck.deck.cards.length !== 20) {
        throw new Error(`Expected 20 deck cards, got ${deck.deck.cards.length}`);
    }

    const cpuMatch = await request<{ matchId: string; matchState: JsonValue }>('POST', '/cpu-match', {
        deckId: deck.deck.id,
        cpuArchetypeId: template.archetypeId,
        difficulty: 'normal',
    }, auth.token);

    const matchState = await waitForMatchState(auth.token, cpuMatch.matchId);
    const players = matchState.players as unknown[];
    if (!Array.isArray(players) || players.length !== 2) {
        throw new Error('Expected MATCH_STATE with two players');
    }

    const afterEndTurn = await waitForMatchState(
        auth.token,
        cpuMatch.matchId,
        ws => {
            ws.send(JSON.stringify({
                type: 'MATCH_ACTION',
                payload: {
                    matchId: cpuMatch.matchId,
                    action: { type: 'END_TURN' },
                },
            }));
        },
        state => Number(state.turnNumber || 0) >= 3,
    );

    if (afterEndTurn.activePlayerId !== username) {
        throw new Error(`Expected turn to return to ${username}, got ${String(afterEndTurn.activePlayerId)}`);
    }

    const log = afterEndTurn.log as Array<{ action: string }> | undefined;
    if (!log?.some(entry => entry.action === 'cpu_decision' || entry.action === 'turn_start')) {
        throw new Error('Expected match log to include CPU/turn progression after END_TURN');
    }

    console.log(JSON.stringify({
        ok: true,
        baseUrl,
        username,
        archetype: template.archetypeId,
        deckId: deck.deck.id,
        matchId: cpuMatch.matchId,
        turnAfterEndTurn: afterEndTurn.turnNumber,
    }, null, 2));
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
