import { describe, expect, it } from 'vitest';
import { getGameOutcome, isActiveTurn, resolveElimination } from './gameRules';

const players = [
  { id: 'user', isHuman: true, status: 'ALIVE' },
  { id: 'bot-1', isHuman: false, status: 'ALIVE' },
  { id: 'bot-2', isHuman: false, status: 'ALIVE' },
];

describe('resolveElimination', () => {
  it('selects the vote leader', () => {
    expect(resolveElimination(['bot-1', 'bot-1', 'bot-2'])).toBe('bot-1');
  });

  it('uses the supplied random source for ties', () => {
    expect(resolveElimination(['bot-1', 'bot-2'], () => 0.99)).toBe('bot-2');
  });
});

describe('getGameOutcome', () => {
  it('loses either mode when the user is eliminated', () => {
    expect(getGameOutcome('IMPOSTOR', players, 'user')?.outcome).toBe('LOSS');
    expect(getGameOutcome('DEFENSE', players, 'user')?.outcome).toBe('LOSS');
  });

  it('wins impostor mode with one bot remaining', () => {
    expect(getGameOutcome('IMPOSTOR', players, 'bot-1')?.outcome).toBe('WIN');
  });

  it('wins defense mode when the final bot is eliminated', () => {
    const finalRound = [players[0], players[1], { ...players[2], status: 'ELIMINATED' }];
    expect(getGameOutcome('DEFENSE', finalRound, 'bot-1')?.outcome).toBe('WIN');
  });
});

describe('isActiveTurn', () => {
  const state = {
    currentRound: 2,
    isVoting: false,
    outcome: null,
    turnQueue: ['user', 'bot-1'],
    activePlayerIndex: 1,
  };

  it('rejects stale work after the round or phase changes', () => {
    expect(isActiveTurn(state, 'bot-1', 2)).toBe(true);
    expect(isActiveTurn({ ...state, currentRound: 3 }, 'bot-1', 2)).toBe(false);
    expect(isActiveTurn({ ...state, isVoting: true }, 'bot-1', 2)).toBe(false);
  });
});
