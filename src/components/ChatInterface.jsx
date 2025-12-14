import React, { useState, useEffect, useRef } from 'react';
import useGame from '../engine/gameStore';

import { generateBotResponse } from '../engine/openai';
import ThoughtBubble from './ThoughtBubble';
import VotingOverlay from './VotingOverlay';
import ResultsScreen from './ResultsScreen';
import { Send, Cpu } from 'lucide-react';

const ChatInterface = () => {
  const { 
    players, messages, currentRound, isThinking, 
    addMessage, setThinking, apiKey, userPlayer, mode,
    turnQueue, activePlayerIndex, nextTurn, timeLeft, setTimeLeft,
    startVoting, endVoting, isVoting, nextRound
  } = useGame();
  
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0 && !isVoting && players.length > 0) {
      const timer = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isVoting) {
       startVoting();
    }
  }, [timeLeft, isVoting, players, setTimeLeft, startVoting]);

  // Turn Logic
  useEffect(() => {
    if (isVoting) return;

    const currentPlayerId = turnQueue[activePlayerIndex];
    if (!currentPlayerId) return;

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer || currentPlayer.status !== 'ALIVE') {
       // Skip dead players
       nextTurn();
       return;
    }

    if (!currentPlayer.isHuman && !isThinking) {
      // Bot Turn
      const runBotTurn = async () => {
        setThinking(true);
        // Faster delay for 11 players flow
        //await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
        
        const response = await generateBotResponse(
            apiKey, 
            currentPlayer, 
            // Treat all chat history as "user" content. This avoids confusing the model by
            // mixing in "assistant" turns for other bots (multi-agent transcript).
            messages.map((m) => {
              const name =
                m?.name ?? (m?.sender === 'SYSTEM' ? 'SYSTEM' : String(m?.sender ?? 'UNKNOWN'));
              const text = String(m?.text ?? '')
                .replace(/<thought>[\s\S]*?<\/thought>/g, '')
                .trim();
              return {
                role: 'user',
                content: `${name}: ${text}`,
              };
            })
        );

        addMessage({ 
            sender: currentPlayer.id, 
            text: response.content, 
            thought: response.thought,
            isUser: false,
            avatar: currentPlayer.avatar,
            name: currentPlayer.name
        });
        
        setThinking(false);
        nextTurn();
      };
      runBotTurn();
    }
    // If Human, wait for input
  }, [activePlayerIndex, isVoting, turnQueue, players, isThinking, apiKey, messages, addMessage, setThinking, nextTurn]);

  // Debugging
  useEffect(() => {
    console.log("Turn Update:", { activePlayerIndex, currentPlayer: turnQueue[activePlayerIndex], isThinking });
  }, [activePlayerIndex, isThinking, turnQueue]);

  const handleSend = async () => {
    const currentPlayerId = turnQueue[activePlayerIndex];
    // Block if not user's turn
    if (currentPlayerId !== 'user') return;

    if (!input.trim()) return;
    
    addMessage({ sender: 'user', text: input, isUser: true, name: userPlayer?.name || 'Player' });
    setInput('');
    nextTurn();
  };
  
  const handleVoteComplete = (eliminatedId) => {
    // End voting phase
    endVoting();
    
    // Add system message about elimination
    const eliminatedPlayer = players.find(p => p.id === eliminatedId);
    addMessage({ 
      id: messages.length, 
      sender: 'SYSTEM', 
      text: `${eliminatedPlayer?.name || 'Unknown'} has been eliminated.` 
    });
    
    // Start next round with fresh timer
    nextRound();
  };

  if (players.length === 0) return null; // Loading

  // Check game over conditions
  const alivePlayers = players.filter(p => p.status === 'ALIVE');
  const aliveBotsCount = alivePlayers.filter(p => !p.isHuman).length;
  
  // User eliminated = loss, or all bots eliminated = win
  if (userPlayer?.status === 'ELIMINATED' || aliveBotsCount === 0) {
    return <ResultsScreen />;
  }

  const currentPlayerId = turnQueue[activePlayerIndex];
  const isMyTurn = currentPlayerId === 'user';

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl border border-green-800 bg-black/40 rounded-lg overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-green-800 bg-black/60 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Cpu size={20} /> ROUND_{currentRound}
          </h2>
          <p className="text-xs text-green-500/60">MODE: {mode}</p>
        </div>
        <div className="flex flex-col items-end">
           <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
             {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
           </div>
           <div className="text-xs text-right opacity-70">
             ACTIVE_SPEAKER: <span className="text-white font-bold bg-green-900/50 px-1 rounded">{players.find(p => p.id === currentPlayerId)?.name || '...'}</span>
           </div>
           <div className="text-[10px] opacity-30">
              IDX: {activePlayerIndex} / {turnQueue.length}
           </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              {!msg.isUser && (
                <div className="w-8 h-8 rounded bg-green-900/30 border border-green-700 flex items-center justify-center text-lg">
                  {msg.avatar || '?'}
                </div>
              )}
              
              <div className="flex flex-col">
                {!msg.isUser && <span className="text-[10px] text-green-500/50 mb-1 ml-1">{msg.name}</span>}
                
                {msg.thought && <ThoughtBubble thought={msg.thought} isVisible={true} />}
                
                <div className={`p-3 rounded-lg text-sm ${
                  msg.isUser 
                    ? 'bg-green-700/20 border border-green-500/50 text-green-100 rounded-tr-none' 
                    : 'bg-zinc-800/40 border border-zinc-700 text-green-300 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
           <div className="text-xs text-green-500/50 animate-pulse ml-10">
             [ NETWORK TRAFFIC DETECTED ]
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-green-800 bg-black/60 flex gap-2 relative">
        {!isMyTurn && (
           <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center text-green-500/50 text-sm italic cursor-not-allowed">
              WAITING FOR TURN...
           </div>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isMyTurn ? "Your turn..." : "Waiting..."}
          disabled={!isMyTurn}
          className="flex-1 bg-black/50 border border-green-700 px-4 py-3 rounded text-green-400 focus:outline-none focus:border-green-400 placeholder-green-800 font-mono disabled:opacity-50"
          autoFocus={isMyTurn}
        />
        <button 
          onClick={handleSend}
          disabled={!isMyTurn}
          className="p-3 bg-green-800/20 border border-green-600 rounded hover:bg-green-700/40 transition-colors text-green-400 disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>

      {isVoting && <VotingOverlay onVoteComplete={handleVoteComplete} />}
    </div>
  );
};

export default ChatInterface;
