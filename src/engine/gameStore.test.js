import { beforeEach, describe, expect, it } from 'vitest';
import useGame from './gameStore';

describe('game store transitions', () => {
  beforeEach(() => useGame.getState().resetGame());

  it('does not create an invalid turn index for an empty queue', () => {
    useGame.getState().nextTurn();
    expect(useGame.getState().activePlayerIndex).toBe(0);
  });

  it('ends voting atomically when the next round starts', () => {
    useGame.getState().startGame('DEFENSE');
    useGame.getState().startVoting();
    useGame.getState().nextRound();

    const state = useGame.getState();
    expect(state.isVoting).toBe(false);
    expect(state.timeLeft).toBe(300);
    expect(state.roundDeadline).toBeGreaterThan(Date.now());
    expect(state.activePlayerIndex).toBe(0);
  });

  it('tags messages with their round', () => {
    useGame.getState().startGame('DEFENSE');
    useGame.getState().addMessage({ sender: 'user', text: 'hello' });
    expect(useGame.getState().messages.at(-1).round).toBe(1);
  });
});
