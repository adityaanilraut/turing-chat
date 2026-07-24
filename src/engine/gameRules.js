export const resolveElimination = (targets, random = Math.random) => {
  const totals = new Map();
  targets.filter(Boolean).forEach((id) => totals.set(id, (totals.get(id) || 0) + 1));
  if (totals.size === 0) return null;

  const highest = Math.max(...totals.values());
  const leaders = [...totals.entries()]
    .filter(([, count]) => count === highest)
    .map(([id]) => id);

  return leaders[Math.floor(random() * leaders.length)];
};

export const isActiveTurn = (state, playerId, round) => (
  state.currentRound === round
  && !state.isVoting
  && !state.outcome
  && state.turnQueue[state.activePlayerIndex] === playerId
);

export const getGameOutcome = (mode, players, eliminatedId) => {
  if (eliminatedId === 'user') {
    return mode === 'IMPOSTOR'
      ? { outcome: 'LOSS', reason: 'The bots identified you as the human impostor.' }
      : { outcome: 'LOSS', reason: 'The group voted you out. Your humanity went undefended.' };
  }

  const aliveBots = players.filter(
    (player) => player.status === 'ALIVE' && !player.isHuman && player.id !== eliminatedId,
  ).length;

  if (mode === 'IMPOSTOR' && aliveBots <= 1) {
    return { outcome: 'WIN', reason: 'You outlasted the swarm. The bots never figured you out.' };
  }

  if (mode !== 'IMPOSTOR' && aliveBots === 0) {
    return { outcome: 'WIN', reason: 'All AIs identified. Humanity defended.' };
  }

  return null;
};
