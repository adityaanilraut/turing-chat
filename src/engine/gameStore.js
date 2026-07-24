import { create } from 'zustand';
import { generateBots } from './personalities';

export const ROUND_DURATION_MS = 5 * 60 * 1000;

const readStorage = (type, key) => {
  try {
    return typeof window === 'undefined' ? null : window[type].getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (type, key, value) => {
  try {
    window[type].setItem(key, value);
  } catch {
    // Storage is optional; state still works for the current page session.
  }
};

try {
  // Older versions persisted credentials indefinitely.
  window.localStorage.removeItem('openai_key');
} catch {
  // Ignore unavailable browser storage.
}

const generateUserName = () => {
  const NAMES_PREFIX = ['Neo', 'Glitch', 'User', 'Anon', 'System', 'Data', 'Byte', 'Pixel', 'Void', 'Null', 'Echo', 'Cyber', 'Flux', 'Zero'];
  const NAMES_SUFFIX = ['_77', '_X', '_01', '.exe', '_Core', '_V2', '404', '_Log', '_Watcher', '_Ghost'];
  const prefix = NAMES_PREFIX[Math.floor(Math.random() * NAMES_PREFIX.length)];
  const suffix = NAMES_SUFFIX[Math.floor(Math.random() * NAMES_SUFFIX.length)];
  return `${prefix}${suffix}`;
};

const useGame = create((set, get) => ({
  apiKey: readStorage('sessionStorage', 'openai_key') || '',
  mode: 'MENU',
  players: [],
  messages: [],
  currentRound: 1,
  userPlayer: null,
  isThinking: false,

  turnQueue: [],
  activePlayerIndex: 0,
  timeLeft: 60,
  roundDeadline: null,
  isVoting: false,

  voiceEnabled: readStorage('localStorage', 'voice_enabled') === 'true',

  roundSummaries: [],

  // Game outcome — null while playing, 'WIN' or 'LOSS' when settled.
  outcome: null,
  outcomeReason: '',

  setApiKey: (key) => {
    const trimmedKey = key.trim();
    writeStorage('sessionStorage', 'openai_key', trimmedKey);
    set({ apiKey: trimmedKey });
  },

  clearApiKey: () => {
    writeStorage('sessionStorage', 'openai_key', '');
    set({ apiKey: '' });
  },

  startGame: (selectedMode) => {
    const userName = generateUserName();
    const bots = generateBots(4, selectedMode, new Set([userName]));
    const user = { id: 'user', name: userName, isHuman: true, avatar: '👤', status: 'ALIVE' };

    const allPlayers = [user, ...bots].sort(() => Math.random() - 0.5);

    const intro = selectedMode === 'IMPOSTOR'
      ? 'Connection Established. IMPOSTOR_PROTOCOL active. You are the human among bots — blend in. 5 minute timer started.'
      : 'Connection Established. HUMANITY_DEFENSE active. AIs are hiding among the players — find them. 5 minute timer started.';

    set({
      mode: selectedMode,
      players: allPlayers,
      userPlayer: user,
      messages: [{ id: 0, sender: 'SYSTEM', text: intro, round: 1 }],
      currentRound: 1,
      isThinking: false,
      turnQueue: allPlayers.map(p => p.id),
      activePlayerIndex: 0,
      timeLeft: 300,
      roundDeadline: Date.now() + ROUND_DURATION_MS,
      isVoting: false,
      roundSummaries: [],
      outcome: null,
      outcomeReason: '',
    });
  },

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, {
      ...msg,
      id: state.messages.length,
      round: msg.round ?? state.currentRound,
    }]
  })),

  nextTurn: () => set((state) => {
    if (state.turnQueue.length === 0) return state;
    const nextIndex = (state.activePlayerIndex + 1) % state.turnQueue.length;
    return { activePlayerIndex: nextIndex };
  }),

  setTimeLeft: (time) => set((state) => state.timeLeft === time ? state : { timeLeft: time }),

  startVoting: () => set({ isVoting: true, isThinking: false, timeLeft: 0 }),

  toggleVoice: () => set((state) => {
    const newValue = !state.voiceEnabled;
    writeStorage('localStorage', 'voice_enabled', newValue.toString());
    return { voiceEnabled: newValue };
  }),

  addRoundSummary: (summary) => set((state) => ({
    roundSummaries: [...state.roundSummaries, summary]
  })),

  getRoundMemory: () => {
    const state = get();
    return state.roundSummaries.join('\n\n');
  },

  setOutcome: (outcome, reason = '') => set({
    outcome,
    outcomeReason: reason,
    isVoting: false,
    isThinking: false,
  }),

  nextRound: () => set((state) => {
    const alivePlayers = state.players.filter(p => p.status === 'ALIVE');
    return {
      currentRound: state.currentRound + 1,
      timeLeft: 300,
      roundDeadline: Date.now() + ROUND_DURATION_MS,
      activePlayerIndex: 0,
      turnQueue: alivePlayers.map(p => p.id),
      isVoting: false,
      isThinking: false,
    };
  }),

  setThinking: (status) => set({ isThinking: status }),

  eliminatePlayer: (playerId) =>
    set((state) => {
      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, status: 'ELIMINATED' } : p
      );
      const updatedUserPlayer =
        playerId === 'user'
          ? { ...(state.userPlayer ?? { id: 'user', name: generateUserName(), isHuman: true, avatar: '👤' }), status: 'ELIMINATED' }
          : state.userPlayer;

      return { players: updatedPlayers, userPlayer: updatedUserPlayer };
    }),

  resetGame: () =>
    set({
      mode: 'MENU',
      players: [],
      messages: [],
      currentRound: 1,
      userPlayer: null,
      isThinking: false,
      turnQueue: [],
      activePlayerIndex: 0,
      timeLeft: 60,
      roundDeadline: null,
      isVoting: false,
      roundSummaries: [],
      outcome: null,
      outcomeReason: '',
    })
}));

export default useGame;
