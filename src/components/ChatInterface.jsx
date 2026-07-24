import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AlertCircle, Cpu, LogOut, Send, Volume2, VolumeX } from 'lucide-react';
import useGame from '../engine/gameStore';
import { getGameOutcome, isActiveTurn } from '../engine/gameRules';
import {
  buildChatHistory,
  generateBotResponse,
  generateRoundSummary,
  MAX_MESSAGE_LENGTH,
} from '../engine/openai';
import { isSpeechSupported, speak, stopSpeaking } from '../engine/speech';
import ResultsScreen from './ResultsScreen';
import VotingOverlay from './VotingOverlay';

const ChatInterface = () => {
  const {
    players, messages, currentRound, isThinking, userPlayer, mode,
    turnQueue, activePlayerIndex, timeLeft, roundDeadline, isVoting,
    voiceEnabled, outcome,
  } = useGame();
  const [input, setInput] = useState('');
  const [apiError, setApiError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const botRequestRef = useRef(null);
  const summaryControllerRef = useRef(null);

  const currentPlayerId = turnQueue[activePlayerIndex];
  const isMyTurn = currentPlayerId === 'user';

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      setHasNewMessages(true);
      return;
    }
    const region = messagesRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    region?.scrollTo({ top: region.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!voiceEnabled || outcome) stopSpeaking();
  }, [voiceEnabled, outcome]);

  useEffect(() => {
    if (isMyTurn && !isVoting && !apiError && window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, [isMyTurn, isVoting, apiError]);

  useEffect(() => () => {
    botRequestRef.current?.controller.abort();
    summaryControllerRef.current?.abort();
    stopSpeaking();
  }, []);

  useEffect(() => {
    if (!roundDeadline || isVoting || outcome || players.length === 0) return undefined;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((roundDeadline - Date.now()) / 1000));
      const state = useGame.getState();
      state.setTimeLeft(remaining);
      if (remaining === 0) state.startVoting();
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [roundDeadline, isVoting, outcome, players.length]);

  const runBotTurn = useEffectEvent(async (player, round, controller, requestId) => {
    const state = useGame.getState();
    state.setThinking(true);

    try {
      const response = await generateBotResponse(
        state.apiKey,
        player,
        buildChatHistory(state.messages, round),
        state.getRoundMemory(),
        controller.signal,
      );
      if (controller.signal.aborted) return;

      const latest = useGame.getState();
      if (!isActiveTurn(latest, player.id, round)) return;

      if (response.error) {
        setApiError(response.content);
        return;
      }

      setApiError('');
      latest.addMessage({
        sender: player.id,
        text: response.content,
        isUser: false,
        avatar: player.avatar,
        name: player.name,
        round,
      });
      if (latest.voiceEnabled && isSpeechSupported()) {
        speak(response.content, player.id).catch(() => {});
      }
      latest.nextTurn();
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Bot turn failed:', error);
        setApiError('The bot turn failed. Retry or return to setup.');
      }
    } finally {
      if (botRequestRef.current?.id === requestId) {
        botRequestRef.current = null;
        useGame.getState().setThinking(false);
      }
    }
  });

  useEffect(() => {
    if (isVoting || outcome || !currentPlayerId) return undefined;
    const player = useGame.getState().players.find((candidate) => candidate.id === currentPlayerId);
    if (!player || player.isHuman || player.status !== 'ALIVE') {
      if (player?.status !== 'ALIVE') useGame.getState().nextTurn();
      return undefined;
    }

    const controller = new AbortController();
    const requestId = Symbol('bot-turn');
    botRequestRef.current = { controller, id: requestId };
    const timer = window.setTimeout(
      () => runBotTurn(player, currentRound, controller, requestId),
      0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentPlayerId, currentRound, isVoting, outcome, retryNonce]);

  const handleSend = (event) => {
    event.preventDefault();
    if (!isMyTurn || isVoting || outcome || !input.trim()) return;
    useGame.getState().addMessage({
      sender: 'user',
      text: input.trim(),
      isUser: true,
      name: userPlayer?.name || 'Player',
    });
    setInput('');
    useGame.getState().nextTurn();
  };

  const handleVoteComplete = async (eliminatedId) => {
    const state = useGame.getState();
    if (!eliminatedId) {
      state.addMessage({ sender: 'SYSTEM', text: 'No consensus reached. No one was eliminated.' });
      state.nextRound();
      return;
    }

    const eliminatedPlayer = state.players.find((player) => player.id === eliminatedId);
    state.addMessage({
      sender: 'SYSTEM',
      text: `${eliminatedPlayer?.name || 'Unknown'} has been eliminated.`,
    });

    const controller = new AbortController();
    summaryControllerRef.current = controller;
    const roundMessages = state.messages.filter((message) => message.round === state.currentRound);
    try {
      const summary = await generateRoundSummary(
        state.apiKey,
        roundMessages,
        eliminatedPlayer?.name || 'Unknown',
        state.currentRound,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      useGame.getState().addRoundSummary(summary);
    } catch (error) {
      if (!controller.signal.aborted) console.warn('Failed to summarize round:', error);
    } finally {
      if (summaryControllerRef.current === controller) summaryControllerRef.current = null;
    }

    if (controller.signal.aborted) return;
    const outcomeResult = getGameOutcome(state.mode, state.players, eliminatedId);
    if (outcomeResult) {
      useGame.getState().setOutcome(outcomeResult.outcome, outcomeResult.reason);
    } else {
      useGame.getState().nextRound();
    }
  };

  const exitGame = () => {
    botRequestRef.current?.controller.abort();
    summaryControllerRef.current?.abort();
    stopSpeaking();
    useGame.getState().resetGame();
  };

  const scrollToLatest = () => {
    shouldAutoScrollRef.current = true;
    setHasNewMessages(false);
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  };

  if (players.length === 0) return null;
  if (outcome) return <ResultsScreen />;

  const voiceSupported = isSpeechSupported();
  const activeName = players.find((player) => player.id === currentPlayerId)?.name || 'Waiting';

  return (
    <section className="relative flex h-[calc(100dvh-3rem)] min-h-[420px] max-h-[700px] w-full flex-col overflow-hidden rounded-lg border border-green-800 bg-black/40 sm:h-[calc(100dvh-5rem)]">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-green-800 bg-black/80 p-3 sm:p-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
            <Cpu size={20} aria-hidden="true" /> ROUND_{currentRound}
          </h1>
          <p className="text-xs text-green-300">MODE: {mode}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {voiceSupported && (
            <button
              type="button"
              onClick={useGame.getState().toggleVoice}
              aria-label={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              aria-pressed={voiceEnabled}
              className="rounded border border-green-600 p-2 text-green-300 hover:bg-green-900/40"
            >
              {voiceEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
            </button>
          )}
          <button
            type="button"
            onClick={exitGame}
            aria-label="Exit game"
            className="rounded border border-red-700 p-2 text-red-300 hover:bg-red-950"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
          <div className="flex flex-col items-end">
            <div
              role="timer"
              aria-label={`${timeLeft} seconds remaining`}
              className={`text-xl font-bold sm:text-2xl ${timeLeft < 10 ? 'animate-pulse text-red-400' : 'text-green-400'}`}
            >
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="hidden text-right text-xs text-green-200 sm:block">
              ACTIVE: <strong>{activeName}</strong>
            </div>
          </div>
        </div>
      </header>

      <ul aria-label="Players" className="flex gap-2 overflow-x-auto border-b border-green-900/60 bg-black/40 px-3 py-2">
        {players.map((player) => {
          const isCurrent = player.id === currentPlayerId;
          const isDead = player.status !== 'ALIVE';
          return (
            <li
              key={player.id}
              aria-current={isCurrent ? 'true' : undefined}
              className={`flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] ${
                isDead
                  ? 'border-red-700 text-red-300 line-through'
                  : isCurrent
                    ? 'border-green-300 bg-green-900/40 text-green-100'
                    : 'border-green-800 text-green-300'
              }`}
            >
              <span aria-hidden="true">{player.avatar}</span>
              <span>{player.name}{player.id === 'user' ? ' (you)' : ''}</span>
              <span className="sr-only">{isDead ? 'Eliminated' : isCurrent ? 'Current speaker' : 'Alive'}</span>
            </li>
          );
        })}
      </ul>

      {apiError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-red-700 bg-red-950/60 px-4 py-2 text-xs text-red-200">
          <AlertCircle size={14} aria-hidden="true" />
          <span className="flex-1">{apiError}</span>
          <button type="button" onClick={() => { setApiError(''); setRetryNonce((value) => value + 1); }} className="underline">Retry</button>
          <button type="button" onClick={exitGame} className="underline">Key settings</button>
        </div>
      )}

      <div
        ref={messagesRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        onScroll={(event) => {
          const region = event.currentTarget;
          shouldAutoScrollRef.current = region.scrollHeight - region.scrollTop - region.clientHeight < 80;
          if (shouldAutoScrollRef.current) setHasNewMessages(false);
        }}
        className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4"
      >
        {messages.map((message) => (
          <article key={message.id} className={`flex flex-col ${message.isUser ? 'items-end' : 'items-start'}`}>
            <div className={`flex max-w-[90%] items-end gap-2 sm:max-w-[80%] ${message.isUser ? 'flex-row-reverse' : ''}`}>
              {!message.isUser && message.sender !== 'SYSTEM' && (
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded border border-green-700 bg-green-900/30 text-lg">
                  {message.avatar || '?'}
                </span>
              )}
              <div className="flex flex-col">
                <span className="sr-only">{message.name || (message.sender === 'SYSTEM' ? 'System' : 'Player')} says:</span>
                {!message.isUser && message.sender !== 'SYSTEM' && <span className="mb-1 ml-1 text-[11px] text-green-300">{message.name}</span>}
                <div className={`rounded-lg p-3 text-sm ${
                  message.sender === 'SYSTEM'
                    ? 'border border-yellow-700 bg-yellow-900/20 text-xs italic text-yellow-200'
                    : message.isUser
                      ? 'rounded-tr-none border border-green-500 bg-green-700/20 text-green-100'
                      : 'rounded-tl-none border border-zinc-600 bg-zinc-800/60 text-green-200'
                }`}>
                  {message.text}
                </div>
              </div>
            </div>
          </article>
        ))}
        {isThinking && <div role="status" className="ml-10 animate-pulse text-xs text-green-300">[ NETWORK TRAFFIC DETECTED ]</div>}
      </div>

      {hasNewMessages && (
        <button type="button" onClick={scrollToLatest} className="mx-auto mb-2 rounded border border-green-600 bg-black px-3 py-1 text-xs text-green-200">
          NEW_MESSAGES
        </button>
      )}

      <form onSubmit={handleSend} className="relative flex gap-2 border-t border-green-800 bg-black/80 p-3 sm:p-4">
        <label htmlFor="chat-message" className="sr-only">Chat message</label>
        <input
          ref={inputRef}
          id="chat-message"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={isMyTurn ? 'Your turn...' : `Waiting for ${activeName}...`}
          disabled={!isMyTurn || isVoting || isThinking}
          className="min-w-0 flex-1 rounded border border-green-700 bg-black/50 px-3 py-3 font-mono text-green-300 placeholder-green-700 focus:border-green-300 focus:outline-none disabled:opacity-50 sm:px-4"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!isMyTurn || isVoting || isThinking || !input.trim()}
          className="rounded border border-green-600 bg-green-800/20 p-3 text-green-300 hover:bg-green-700/40 disabled:opacity-50"
        >
          <Send size={20} aria-hidden="true" />
        </button>
      </form>

      {isVoting && <VotingOverlay onVoteComplete={handleVoteComplete} onExit={exitGame} />}
    </section>
  );
};

export default ChatInterface;
