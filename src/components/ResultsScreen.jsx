import React from 'react';
import useGame from '../engine/gameStore';
import { Skull, Trophy, RefreshCcw } from 'lucide-react';

const ResultsScreen = () => {
  const { players, resetGame, outcome, outcomeReason, mode } = useGame();

  const isVictory = outcome === 'WIN';
  const defaultReason = isVictory
    ? 'You successfully maintained your cover. The system accepts your identity.'
    : 'Your anomaly score exceeded the threshold. Protocol terminated.';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
      <div className="mb-6">
        {isVictory ? (
          <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
        ) : (
          <Skull size={64} className="text-red-500 mx-auto mb-4" />
        )}
        <h1 className={`text-5xl font-bold ${isVictory ? 'text-yellow-400' : 'text-red-500'} glow`}>
          {isVictory ? 'MISSION_SUCCESS' : 'ELIMINATED'}
        </h1>
        <p className="text-xs uppercase tracking-widest mt-2 text-green-500/60">
          MODE: {mode}
        </p>
        <p className="text-xl mt-4 max-w-md mx-auto text-green-300 opacity-80">
          {outcomeReason || defaultReason}
        </p>
      </div>

      <div className="border border-green-800 bg-black/50 p-6 rounded-lg w-full max-w-md mb-8">
        <h3 className="border-b border-green-800 pb-2 mb-4 text-left text-sm text-green-500">SESSION_LOG</h3>
        {players.map(p => (
           <div key={p.id} className="flex justify-between items-center py-2 border-b border-green-900/30 font-mono text-sm">
             <div className="flex items-center gap-2">
               <span>{p.avatar}</span>
               <span className={p.id === 'user' ? 'text-yellow-400' : 'text-green-400'}>{p.name} {p.id === 'user' && '(YOU)'}</span>
             </div>
             <div className="text-xs opacity-60">
               {p.isHuman ? '[HUMAN]' : '[BOT_AI]'} :: {p.status}
             </div>
           </div>
        ))}
      </div>

      <button
        onClick={resetGame}
        className="flex items-center gap-2 px-8 py-3 bg-green-700 hover:bg-green-600 text-white rounded font-bold tracking-widest transition-all"
      >
        <RefreshCcw size={18} /> REBOOT_SYSTEM
      </button>
    </div>
  );
};

export default ResultsScreen;
