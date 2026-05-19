import { MatchState } from '@tcg/shared/types';

export function startTurn(match: MatchState) {
    match.turnNumber++;
    // Draw card logic
}

export function endTurn(match: MatchState) {
    // Switch active player
}
