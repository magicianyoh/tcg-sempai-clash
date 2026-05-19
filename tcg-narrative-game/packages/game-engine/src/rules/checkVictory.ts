import { MatchState } from '@tcg/shared/types';

export function checkVictory(match: MatchState) {
    if (match.winner) return match.winner;
    return null;
}
