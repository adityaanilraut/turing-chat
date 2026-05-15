import React, { useState } from 'react';
import useGame from '../engine/gameStore';
import { generateBotVote } from '../engine/openai';
import { AlertTriangle, UserX, Brain, Vote } from 'lucide-react';

const VotingOverlay = ({ onVoteComplete }) => {
  const { players, eliminatePlayer, apiKey, messages, userPlayer } = useGame();
  const [selectedId, setSelectedId] = useState(null);
  const [phase, setPhase] = useState('voting'); // 'voting' | 'deliberating' | 'revealing' | 'calculating'
  const [botVotes, setBotVotes] = useState({}); // { botId: { targetId, reasoning } }
  const [analyzingBots, setAnalyzingBots] = useState([]); // Bots currently "thinking"
  const [revealedVotes, setRevealedVotes] = useState([]); // Votes that have been revealed

  const alivePlayers = players.filter(p => p.status === 'ALIVE');
  const aliveBots = alivePlayers.filter(p => !p.isHuman);
  const alivePlayersExceptUser = alivePlayers.filter(p => p.id !== 'user');

  // Generate bot votes when user confirms their vote
  const handleVote = async () => {
    if (!selectedId) return;
    
    setPhase('deliberating');
    setAnalyzingBots(aliveBots.map(b => b.id));

    // Generate votes for all bots in parallel
    const votePromises = aliveBots.map(async (bot) => {
      const result = await generateBotVote(apiKey, bot, messages, alivePlayers);
      
      // Remove from analyzing list with slight delay for visual effect
      setTimeout(() => {
        setAnalyzingBots(prev => prev.filter(id => id !== bot.id));
      }, Math.random() * 1000 + 500);
      
      return { botId: bot.id, ...result };
    });

    const results = await Promise.all(votePromises);
    
    // Store all bot votes
    const votesMap = {};
    results.forEach(r => {
      votesMap[r.botId] = { targetId: r.targetId, reasoning: r.reasoning };
    });
    setBotVotes(votesMap);

    // Short delay then start revealing
    await new Promise(r => setTimeout(r, 300));
    setPhase('revealing');

    // Reveal votes one by one with dramatic effect
    for (let i = 0; i < results.length; i++) {
      await new Promise(r => setTimeout(r, 300));
      setRevealedVotes(prev => [...prev, results[i].botId]);
    }

    // Final calculation
    await new Promise(r => setTimeout(r, 500));
    setPhase('calculating');

    // Tally votes
    const votes = {};
    
    // User's vote
    votes[selectedId] = (votes[selectedId] || 0) + 1;
    
    // Bot votes
    Object.values(votesMap).forEach(v => {
      if (v.targetId) {
        votes[v.targetId] = (votes[v.targetId] || 0) + 1;
      }
    });

    // Find winner (most votes); break ties randomly among the leaders.
    let maxVotes = 0;
    Object.values(votes).forEach((count) => {
      if (count > maxVotes) maxVotes = count;
    });

    const leaders = Object.entries(votes)
      .filter(([, count]) => count === maxVotes && count > 0)
      .map(([pid]) => pid);

    let eliminatedId = null;
    if (leaders.length === 1) {
      eliminatedId = leaders[0];
    } else if (leaders.length > 1) {
      eliminatedId = leaders[Math.floor(Math.random() * leaders.length)];
    }

    // Show result briefly then eliminate
    await new Promise(r => setTimeout(r, 1500));
    if (eliminatedId) {
      eliminatePlayer(eliminatedId);
    }
    onVoteComplete(eliminatedId);
  };

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';
  const getPlayerAvatar = (id) => players.find(p => p.id === id)?.avatar || '?';

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="border border-red-600 bg-black p-8 rounded-lg max-w-2xl w-full text-center shadow-[0_0_30px_rgba(220,38,38,0.3)]">
        <h2 className="text-3xl font-bold text-red-500 mb-2 flex justify-center gap-2">
          <AlertTriangle /> VOTING_PHASE
        </h2>
        
        {/* Phase: User Voting */}
        {phase === 'voting' && (
          <>
            <p className="text-red-300 mb-6">Time Expired. Cast your vote to eliminate.</p>
            <div className="grid grid-cols-2 gap-2 mb-6 max-h-[300px] overflow-y-auto">
              {alivePlayersExceptUser.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`p-3 border rounded flex items-center gap-2 transition-all ${
                    selectedId === p.id 
                      ? 'bg-red-900/40 border-red-500 text-white' 
                      : 'border-red-900/30 hover:border-red-500/50 text-red-400'
                  }`}
                >
                  <span className="text-xl">{p.avatar}</span>
                  <span className="font-mono text-xs truncate">{p.name}</span>
                  {selectedId === p.id && <UserX size={14} />}
                </button>
              ))}
            </div>
    
            <button
              onClick={handleVote}
              disabled={!selectedId}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONFIRM_ELIMINATION
            </button>
          </>
        )}

        {/* Phase: Deliberation - Bots analyzing */}
        {phase === 'deliberating' && (
          <div className="py-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Brain className="text-yellow-500 animate-pulse" size={24} />
              <span className="text-yellow-400 text-lg">BOTS ANALYZING CONVERSATION...</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {aliveBots.map(bot => (
                <div 
                  key={bot.id}
                  className={`p-3 border rounded flex items-center gap-3 transition-all duration-500 ${
                    analyzingBots.includes(bot.id)
                      ? 'border-yellow-500/50 bg-yellow-900/20'
                      : 'border-green-500/50 bg-green-900/20'
                  }`}
                >
                  <span className="text-xl">{bot.avatar}</span>
                  <span className="font-mono text-xs flex-1">{bot.name}</span>
                  {analyzingBots.includes(bot.id) ? (
                    <span className="text-yellow-500 text-xs animate-pulse">thinking...</span>
                  ) : (
                    <span className="text-green-500 text-xs">✓ decided</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase: Revealing - Show votes one by one */}
        {phase === 'revealing' && (
          <div className="py-6">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Vote className="text-red-500" size={24} />
              <span className="text-red-400 text-lg">REVEALING VOTES...</span>
            </div>

            {/* User's vote */}
            <div className="mb-4 p-3 border border-green-600 rounded bg-green-900/20 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">👤</span>
                <span className="text-green-400 font-bold">{userPlayer?.name || 'Player'}</span>
                <span className="text-gray-500">voted for</span>
                <span className="text-red-400 font-bold">{getPlayerAvatar(selectedId)} {getPlayerName(selectedId)}</span>
              </div>
            </div>

            {/* Bot votes */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {aliveBots.map(bot => {
                const isRevealed = revealedVotes.includes(bot.id);
                const vote = botVotes[bot.id];
                
                return (
                  <div 
                    key={bot.id}
                    className={`p-3 border rounded text-left transition-all duration-300 ${
                      isRevealed 
                        ? 'border-red-600/50 bg-red-900/20 opacity-100' 
                        : 'border-gray-700 bg-gray-900/20 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{bot.avatar}</span>
                      <span className="text-gray-300 font-bold">{bot.name}</span>
                      {isRevealed && vote && (
                        <>
                          <span className="text-gray-500">voted for</span>
                          <span className="text-red-400 font-bold">
                            {getPlayerAvatar(vote.targetId)} {getPlayerName(vote.targetId)}
                          </span>
                        </>
                      )}
                    </div>
                    {isRevealed && vote?.reasoning && (
                      <p className="text-xs text-gray-500 italic ml-8">"{vote.reasoning}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase: Calculating */}
        {phase === 'calculating' && (
          <div className="py-12">
            <div className="text-2xl text-red-500 animate-pulse">
              CALCULATING CONSENSUS...
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Determining elimination target
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingOverlay;
