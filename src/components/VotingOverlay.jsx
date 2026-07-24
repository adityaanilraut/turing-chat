import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Brain, LogOut, UserX, Vote } from 'lucide-react';
import useGame from '../engine/gameStore';
import { resolveElimination } from '../engine/gameRules';
import { generateBotVote } from '../engine/openai';

const VotingOverlay = ({ onVoteComplete, onExit }) => {
  const { players, apiKey, messages, userPlayer, mode, currentRound } = useGame();
  const [selectedId, setSelectedId] = useState(null);
  const [phase, setPhase] = useState('voting');
  const [botVotes, setBotVotes] = useState([]);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const requestControllerRef = useRef(null);

  const alivePlayers = players.filter((player) => player.status === 'ALIVE');
  const aliveBots = alivePlayers.filter((player) => !player.isHuman);
  const voteTargets = alivePlayers.filter((player) => player.id !== 'user');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      requestControllerRef.current?.abort();
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  const handleExit = () => {
    requestControllerRef.current?.abort();
    onExit();
  };

  const handleVote = async () => {
    if (!selectedId || phase !== 'voting') return;
    setError('');
    setPhase('deliberating');
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const roundMessages = messages.filter((message) => message.round === currentRound);

    const settledVotes = await Promise.allSettled(
      aliveBots.map(async (bot) => ({
        bot,
        ...(await generateBotVote(apiKey, bot, roundMessages, alivePlayers, mode, controller.signal)),
      })),
    );
    if (controller.signal.aborted) return;

    const failed = settledVotes.some((result) => result.status === 'rejected');
    if (failed) {
      setError('One or more bot votes failed. Check your key or connection, then retry.');
      setPhase('voting');
      requestControllerRef.current = null;
      return;
    }

    const votes = settledVotes.map((result) => result.value);
    const eliminatedId = resolveElimination([selectedId, ...votes.map((vote) => vote.targetId)]);
    setBotVotes(votes);
    setPhase('revealing');
    if (eliminatedId) useGame.getState().eliminatePlayer(eliminatedId);

    window.setTimeout(() => {
      if (!controller.signal.aborted) onVoteComplete(eliminatedId);
    }, 1200);
  };

  const getPlayer = (id) => players.find((player) => player.id === id);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="voting-title"
      onCancel={(event) => { event.preventDefault(); handleExit(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-red-600 bg-black p-4 text-center text-green-300 shadow-[0_0_30px_rgba(220,38,38,0.3)] backdrop:bg-black/90 sm:p-8"
    >
      <h2
        id="voting-title"
        ref={headingRef}
        tabIndex="-1"
        className="mb-2 flex justify-center gap-2 text-2xl font-bold text-red-400 outline-none sm:text-3xl"
      >
        <AlertTriangle aria-hidden="true" /> VOTING_PHASE
      </h2>

      {phase === 'voting' && (
        <>
          <p className="mb-6 text-red-200">Time expired. Cast your vote to eliminate a player.</p>
          {error && <p role="alert" className="mb-4 border border-red-700 bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <div className="mb-6 grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {voteTargets.map((player) => (
              <button
                type="button"
                key={player.id}
                onClick={() => setSelectedId(player.id)}
                aria-pressed={selectedId === player.id}
                className={`flex items-center gap-2 rounded border p-3 ${
                  selectedId === player.id
                    ? 'border-red-400 bg-red-900/50 text-white'
                    : 'border-red-800 text-red-200 hover:border-red-400'
                }`}
              >
                <span aria-hidden="true" className="text-xl">{player.avatar}</span>
                <span className="truncate font-mono text-xs">{player.name}</span>
                {selectedId === player.id && <UserX size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleVote}
            disabled={!selectedId}
            className="w-full bg-red-600 py-4 font-bold uppercase tracking-widest text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            CONFIRM_ELIMINATION
          </button>
          <button type="button" onClick={handleExit} className="mx-auto mt-4 flex items-center gap-2 text-sm text-red-200 underline">
            <LogOut size={14} aria-hidden="true" /> Exit game
          </button>
        </>
      )}

      {phase === 'deliberating' && (
        <div role="status" className="py-12">
          <Brain className="mx-auto mb-4 animate-pulse text-yellow-400" size={32} aria-hidden="true" />
          <p className="text-lg text-yellow-300">BOTS ANALYZING CONVERSATION...</p>
          <p className="mt-2 text-sm text-green-200">Requests time out after 30 seconds.</p>
        </div>
      )}

      {phase === 'revealing' && (
        <div role="status" className="py-4 text-left">
          <p className="mb-5 flex items-center justify-center gap-2 text-lg text-red-300">
            <Vote aria-hidden="true" /> VOTES_RECORDED
          </p>
          <div className="mb-3 rounded border border-green-600 bg-green-900/20 p-3">
            <strong>{userPlayer?.name || 'Player'} (you)</strong> voted for{' '}
            <span className="text-red-300">{getPlayer(selectedId)?.name || 'Unknown'}</span>
          </div>
          <ul className="max-h-[300px] space-y-2 overflow-y-auto">
            {botVotes.map(({ bot, targetId, reasoning }) => (
              <li key={bot.id} className="rounded border border-red-700 bg-red-950/30 p-3">
                <div><strong>{bot.name}</strong> voted for <span className="text-red-300">{getPlayer(targetId)?.name || 'Unknown'}</span></div>
                <p className="mt-1 text-xs text-gray-300">{reasoning}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </dialog>
  );
};

export default VotingOverlay;
