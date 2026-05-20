import * as os from 'os';
import * as path from 'path';

process.env.STORE_DB_PATH ||= path.join(os.tmpdir(), `sempai-balance-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

import { ARCHETYPES, GAME_CONSTANTS } from '@tcg/shared/constants';
import { MatchState } from '@tcg/shared/types';
import { MatchActionType } from '@tcg/shared/protocol';
import { getPrebuiltDecks, PrebuiltDeckData } from '../decks/prebuilt-decks';
import { store } from '../store/memory.store';
import { matchService, CpuDifficulty } from '../ws/match.service';
import { chooseCpuPlay } from '../ws/cpu.strategy';

type SimulationSummary = {
    archetype: string;
    games: number;
    wins: number;
    losses: number;
    avgTurns: number;
    minTurns: number;
    maxTurns: number;
    avgCompletedEvents: number;
    earlyEnds: number;
    finalEventWins: number;
    fillerWins: number;
    timeouts: number;
};

type SimulationResult = {
    archetype: string;
    turns: number;
    winner: string;
    winReason: string;
    completedEvents: number;
    timedOut: boolean;
};

const gamesPerArchetype = Number(process.env.BALANCE_GAMES_PER_ARCHETYPE || 4);
const maxTurns = Number(process.env.BALANCE_MAX_TURNS || 32);
const difficulty = (process.env.BALANCE_DIFFICULTY || 'normal') as CpuDifficulty;
const maxHumanPlays = difficulty === 'hard' ? 3 : difficulty === 'easy' ? 1 : 2;

function ensureUser(username: string): void {
    if (!store.findUser(username)) {
        store.createUser(username, 'balance-test-password-hash');
    }
}

function createDeck(username: string, template: PrebuiltDeckData): string {
    return store.createDeck(username, {
        name: template.name,
        archetypeId: template.archetypeId,
        cards: template.cards,
        backgroundId: template.backgroundId,
    }).id;
}

function actionFromPlan(plan: ReturnType<typeof chooseCpuPlay>) {
    if (!plan) return null;
    if (plan.isEventActivation) {
        return {
            type: MatchActionType.ACTIVATE_EVENT,
            cardId: plan.cardId,
        };
    }

    return {
        type: MatchActionType.PLAY_CARD,
        cardId: plan.cardId,
        slotPosition: plan.slotPosition,
    };
}

function progressHumanTurn(match: MatchState, username: string): MatchState {
    let current = match;
    let plays = 0;

    while (!current.winner && current.activePlayerId === username && plays < maxHumanPlays) {
        const playerIndex = current.playerOrder.indexOf(username);
        const plan = chooseCpuPlay(current, playerIndex);
        const action = actionFromPlan(plan);
        if (!action) break;
        current = matchService.processAction(current.matchId, username, action);
        plays++;
    }

    if (!current.winner && current.activePlayerId === username) {
        current = matchService.processAction(current.matchId, username, { type: MatchActionType.END_TURN });
    }

    return current;
}

function simulateGame(template: PrebuiltDeckData, runIndex: number): SimulationResult {
    const username = `balance_${template.archetypeId.toLowerCase()}_${runIndex}_${Math.random().toString(36).slice(2, 7)}`;
    ensureUser(username);
    const deckId = createDeck(username, template);
    let match = matchService.createCpuMatch(username, deckId, template.archetypeId, difficulty, GAME_CONSTANTS.DEFAULT_FORMAT);

    while (!match.winner && match.turnNumber < maxTurns) {
        if (match.activePlayerId === username) {
            match = progressHumanTurn(match, username);
        } else {
            match = matchService.processAction(match.matchId, match.activePlayerId, { type: MatchActionType.END_TURN });
        }
    }

    const human = match.players[0];
    const cpu = match.players[1];
    return {
        archetype: template.archetypeId,
        turns: match.turnNumber,
        winner: match.winner || 'timeout',
        winReason: match.winReason || (match.winner ? 'unknown' : 'timeout'),
        completedEvents: human.completedEvents.length + cpu.completedEvents.length,
        timedOut: !match.winner,
    };
}

function summarize(archetype: string, results: SimulationResult[]): SimulationSummary {
    const turns = results.map(result => result.turns);
    const completedEvents = results.map(result => result.completedEvents);
    return {
        archetype,
        games: results.length,
        wins: results.filter(result => result.winner.startsWith('balance_')).length,
        losses: results.filter(result => result.winner.startsWith('CPU')).length,
        avgTurns: Number((turns.reduce((sum, value) => sum + value, 0) / results.length).toFixed(2)),
        minTurns: Math.min(...turns),
        maxTurns: Math.max(...turns),
        avgCompletedEvents: Number((completedEvents.reduce((sum, value) => sum + value, 0) / results.length).toFixed(2)),
        earlyEnds: results.filter(result => result.turns < 8).length,
        finalEventWins: results.filter(result => result.winReason === 'final_event').length,
        fillerWins: results.filter(result => result.winReason === 'opponent_filler').length,
        timeouts: results.filter(result => result.timedOut).length,
    };
}

const templatesByArchetype = new Map<string, PrebuiltDeckData>();
for (const deck of getPrebuiltDecks({ enabled: true, archetypes: {} })) {
    if (!templatesByArchetype.has(deck.archetypeId)) {
        templatesByArchetype.set(deck.archetypeId, deck);
    }
}

const allResults: SimulationResult[] = [];
for (const archetype of Object.values(ARCHETYPES)) {
    const template = templatesByArchetype.get(archetype);
    if (!template) continue;
    for (let i = 0; i < gamesPerArchetype; i++) {
        allResults.push(simulateGame(template, i));
    }
}

const summaries = Array.from(new Set(allResults.map(result => result.archetype)))
    .map(archetype => summarize(archetype, allResults.filter(result => result.archetype === archetype)));

const failed = summaries.filter(summary =>
    summary.earlyEnds > Math.ceil(summary.games * 0.25)
    || summary.avgCompletedEvents < 1
    || summary.timeouts > Math.ceil(summary.games * 0.5)
);

console.log(JSON.stringify({
    settings: {
        gamesPerArchetype,
        maxTurns,
        difficulty,
        maxHumanPlays,
    },
    summaries,
    failed,
}, null, 2));

if (failed.length > 0) {
    process.exitCode = 1;
}
