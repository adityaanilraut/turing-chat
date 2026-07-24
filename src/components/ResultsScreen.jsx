import { useEffect, useRef } from 'react';
import useGame from '../engine/gameStore';
import { Skull, Trophy, RefreshCcw } from 'lucide-react';

const ResultsScreen = () => {
  const { players, resetGame, outcome, outcomeReason, mode } = useGame();

  const isVictory = outcome === 'WIN';
  const defaultReason = isVictory
    ? 'You successfully maintained your cover. The system accepts your identity.'
    : 'Your anomaly score exceeded the threshold. Protocol terminated.';
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center sm:p-8">
      <div className="mb-6">
        {isVictory ? (
          <Trophy size={64} aria-hidden="true" className="mx-auto mb-4 text-yellow-500" />
        ) : (
          <Skull size={64} aria-hidden="true" className="mx-auto mb-4 text-red-500" />
        )}
        <h1 ref={headingRef} tabIndex="-1" className={`break-words text-3xl font-bold outline-none sm:text-5xl ${isVictory ? 'text-yellow-300' : 'text-red-400'} glow`}>
          {isVictory ? 'MISSION_SUCCESS' : 'ELIMINATED'}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-green-300">
          MODE: {mode}
        </p>
        <p className="mx-auto mt-4 max-w-md text-lg text-green-200 sm:text-xl">
          {outcomeReason || defaultReason}
        </p>
      </div>

      <section aria-labelledby="session-log-title" className="mb-8 w-full max-w-md rounded-lg border border-green-800 bg-black/50 p-4 sm:p-6">
        <h2 id="session-log-title" className="mb-4 border-b border-green-800 pb-2 text-left text-sm text-green-300">SESSION_LOG</h2>
        <ul>
        {players.map(p => (
           <li key={p.id} className="flex flex-col justify-between gap-1 border-b border-green-900/30 py-2 font-mono text-sm sm:flex-row sm:items-center">
             <div className="flex items-center gap-2">
               <span aria-hidden="true">{p.avatar}</span>
               <span className={p.id === 'user' ? 'text-yellow-400' : 'text-green-400'}>{p.name} {p.id === 'user' && '(YOU)'}</span>
             </div>
              <div className="text-xs text-green-200">
               {p.isHuman ? '[HUMAN]' : '[BOT_AI]'} :: {p.status}
             </div>
            </li>
        ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={resetGame}
        className="flex items-center gap-2 px-8 py-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold tracking-widest transition-all"
      >
        <RefreshCcw size={18} aria-hidden="true" /> REBOOT_SYSTEM
      </button>
    </div>
  );
};

export default ResultsScreen;
