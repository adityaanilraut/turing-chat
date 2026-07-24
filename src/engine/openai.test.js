import { describe, expect, it } from 'vitest';
import {
  buildChatHistory,
  getVoteObjective,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
} from './openai';

describe('buildChatHistory', () => {
  it('keeps only bounded messages from the requested round', () => {
    const messages = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, index) => ({
      sender: 'user',
      name: 'Player',
      text: 'x'.repeat(MAX_MESSAGE_LENGTH + 20),
      round: index === 0 ? 1 : 2,
    }));
    const history = buildChatHistory(messages, 2);

    expect(history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(history[0].content.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH + 'Player: '.length);
  });
});

describe('getVoteObjective', () => {
  it('asks impostor bots to identify the human', () => {
    expect(getVoteObjective('IMPOSTOR')).toContain('HUMAN');
    expect(getVoteObjective('DEFENSE')).toContain('protects your cover');
  });
});
