import React, { useState, useEffect, useRef } from 'react';
import useGame from '../engine/gameStore';

import { generateBotResponse, generateRoundSummary } from '../engine/openai';
import { speak, stopSpeaking, isSpeechSupported } from '../engine/speech';
import ThoughtBubble from './ThoughtBubble';
import VotingOverlay from './VotingOverlay';
import ResultsScreen from './ResultsScreen';
import { Send, Cpu, Volume2, VolumeX, AlertCircle } from 'lucide-react';

const ChatInterface = () => {
  const {
    players, messages, currentRound, isThinking,
    addMessage, setThinking, apiKey, userPlayer, mode,
    turnQueue, activePlayerIndex, nextTurn, timeLeft, setTimeLeft,
    startVoting, endVoting, isVoting, nextRound,
    voiceEnabled, toggleVoice,
    addRoundSummary, getRoundMemory,
    outcome, setOutcome,
  } = useGame();

  const [input, setInput] = useState('');
  const [apiError, setApiError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Stop any ongoing speech if voice gets toggled off
  useEffect(() => {
    if (!voiceEnabled) stopSpeaking();
  }, [voiceEnabled]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !isVoting && players.length > 0 && !outcome) {
      const timer = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isVoting && !outcome) {
      startVoting();
    }
  }, [timeLeft, isVoting, players, setTimeLeft, startVoting, outcome]);

  // Bot turn
  useEffect(() => {
    if (isVoting || outcome) return;

    const currentPlayerId = turnQueue[activePlayerIndex];
    if (!currentPlayerId) return;

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer || currentPlayer.status !== 'ALIVE') {
      nextTurn();
      return;
    }

    if (!currentPlayer.isHuman && !isThinking) {
      const runBotTurn = async () => {
        setThinking(true);

        const response = await generateBotResponse(
          apiKey,
          currentPlayer,
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
          }),
          getRoundMemory()
        );

        if (response.error === 'INVALID_API_KEY' || response.error === 'NO_API_KEY') {
          setApiError(response.content);
        } else if (response.error) {
          setApiError('Network error talking to OpenAI. Retrying on next turn.');
        } else {
          setApiError('');
        }

        addMessage({
          sender: currentPlayer.id,
          text: response.content,
          thought: response.thought,
          isUser: false,
          avatar: currentPlayer.avatar,
          name: currentPlayer.name
        });

        if (voiceEnabled && isSpeechSupported() && !response.error) {
          // Don't await — let it play in background while game proceeds
          speak(response.content, currentPlayer.id).catch(() => {});
        }

        setThinking(false);
        nextTurn();
      };
      runBotTurn();
    }
  }, [activePlayerIndex, isVoting, turnQueue, players, isThinking, apiKey, messages, addMessage, setThinking, nextTurn, getRoundMemory, voiceEnabled, outcome]);

  const handleSend = async () => {
    const currentPlayerId = turnQueue[activePlayerIndex];
    if (currentPlayerId !== 'user' || isVoting || outcome) return;
    if (!input.trim()) return;

    addMessage({ sender: 'user', text: input, isUser: true, name: userPlayer?.name || 'Player' });
    setInput('');
    nextTurn();
  };

  const handleVoteComplete = async (eliminatedId) => {
    endVoting();

    if (!eliminatedId) {
      addMessage({ sender: 'SYSTEM', text: 'No consensus reached. No one was eliminated this round.' });
      nextRound();
      return;
    }

    const eliminatedPlayer = players.find(p => p.id === eliminatedId);
    addMessage({
      sender: 'SYSTEM',
      text: `${eliminatedPlayer?.name || 'Unknown'} has been eliminated.`
    });

    // Build a round summary for bot memory before checking win conditions
    try {
      const summary = await generateRoundSummary(
        apiKey,
        messages,
        eliminatedPlayer?.name || 'Unknown',
        currentRound
      );
      addRoundSummary(summary);
    } catch (err) {
      console.warn('Failed to generate round summary', err);
    }

    // Determine outcome based on mode
    const userJustEliminated = eliminatedId === 'user';
    const aliveAfter = players.filter(p => p.status === 'ALIVE' && p.id !== eliminatedId);
    const aliveBotsAfter = aliveAfter.filter(p => !p.isHuman).length;
    const userAliveAfter = !userJustEliminated;

    if (mode === 'IMPOSTOR') {
      // Impostor: lose if you're voted out (the bots found you).
      // Win if you survive until only you + 1 bot remain (you outlasted the swarm).
      if (userJustEliminated) {
        setOutcome('LOSS', 'The bots identified you as the human impostor.');
        return;
      }
      if (userAliveAfter && aliveBotsAfter <= 1) {
        setOutcome('WIN', 'You outlasted the swarm. The bots never figured you out.');
        return;
      }
    } else {
      // Defense: lose if voted out. Win if all bots eliminated.
      if (userJustEliminated) {
        setOutcome('LOSS', 'The group voted you out. Your humanity went undefended.');
        return;
      }
      if (userAliveAfter && aliveBotsAfter === 0) {
        setOutcome('WIN', 'All AIs identified. Humanity defended.');
        return;
      }
    }

    nextRound();
  };

  if (players.length === 0) return null;

  if (outcome) {
    return <ResultsScreen />;
  }

  const currentPlayerId = turnQueue[activePlayerIndex];
  const isMyTurn = currentPlayerId === 'user';
  const voiceSupported = isSpeechSupported();

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
        <div className="flex items-center gap-3">
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              className={`p-2 border rounded transition-colors ${
                voiceEnabled
                  ? 'border-green-500 bg-green-900/30 text-green-300'
                  : 'border-green-800 text-green-700 hover:text-green-400'
              }`}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
          <div className="flex flex-col items-end">
            <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-right opacity-70">
              ACTIVE_SPEAKER: <span className="text-white font-bold bg-green-900/50 px-1 rounded">{players.find(p => p.id === currentPlayerId)?.name || '...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player roster strip */}
      <div className="px-3 py-2 border-b border-green-900/60 bg-black/40 flex gap-2 overflow-x-auto">
        {players.map(p => {
          const isCurrent = p.id === currentPlayerId;
          const isDead = p.status !== 'ALIVE';
          return (
            <div
              key={p.id}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] whitespace-nowrap font-mono ${
                isDead
                  ? 'border-red-900/50 text-red-700/60 line-through'
                  : isCurrent
                    ? 'border-green-400 bg-green-900/40 text-green-200'
                    : 'border-green-900/60 text-green-500/80'
              }`}
              title={isDead ? 'Eliminated' : isCurrent ? 'Speaking now' : 'Alive'}
            >
              <span>{p.avatar}</span>
              <span>{p.name}</span>
              {p.id === 'user' && <span className="text-yellow-400">★</span>}
            </div>
          );
        })}
      </div>

      {apiError && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-800 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle size={14} /> {apiError}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              {!msg.isUser && msg.sender !== 'SYSTEM' && (
                <div className="w-8 h-8 rounded bg-green-900/30 border border-green-700 flex items-center justify-center text-lg">
                  {msg.avatar || '?'}
                </div>
              )}

              <div className="flex flex-col">
                {!msg.isUser && msg.sender !== 'SYSTEM' && <span className="text-[10px] text-green-500/50 mb-1 ml-1">{msg.name}</span>}

                {msg.thought && <ThoughtBubble thought={msg.thought} isVisible={true} />}

                <div className={`p-3 rounded-lg text-sm ${
                  msg.sender === 'SYSTEM'
                    ? 'bg-yellow-900/10 border border-yellow-800/40 text-yellow-300/80 italic text-xs'
                    : msg.isUser
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

      {/* Input */}
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
          disabled={!isMyTurn || isVoting}
          className="flex-1 bg-black/50 border border-green-700 px-4 py-3 rounded text-green-400 focus:outline-none focus:border-green-400 placeholder-green-800 font-mono disabled:opacity-50"
          autoFocus={isMyTurn}
        />
        <button
          onClick={handleSend}
          disabled={!isMyTurn || isVoting}
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
