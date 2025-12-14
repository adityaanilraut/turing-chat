import { create } from 'zustand';
import { generateBots } from './personalities';

// Generate a random name for the user player
const generateUserName = () => {
  const NAMES_PREFIX = ['Neo', 'Glitch', 'User', 'Anon', 'System', 'Data', 'Byte', 'Pixel', 'Void', 'Null', 'Echo', 'Cyber', 'Flux', 'Zero'];
  const NAMES_SUFFIX = ['_77', '_X', '_01', '.exe', '_Core', '_V2', '404', '_Log', '_Watcher', '_Ghost'];
  const prefix = NAMES_PREFIX[Math.floor(Math.random() * NAMES_PREFIX.length)];
  const suffix = NAMES_SUFFIX[Math.floor(Math.random() * NAMES_SUFFIX.length)];
  return `${prefix}${suffix}`;
};

const useGame = create((set, get) => ({
  apiKey: localStorage.getItem('openai_key') || '',
  mode: 'MENU', 
  players: [],
  messages: [],
  currentRound: 1,
  userPlayer: null,
  isThinking: false,
  
  // Turn System
  turnQueue: [], // Array of Player IDs
  activePlayerIndex: 0,
  timeLeft: 60,
  isVoting: false,

  // Voice Mode
  voiceEnabled: localStorage.getItem('voice_enabled') === 'true',

  // Bot Memory - stores summaries from previous rounds
  roundSummaries: [],

  setApiKey: (key) => {
    localStorage.setItem('openai_key', key);
    set({ apiKey: key });
  },

  startGame: (selectedMode) => {
    // Generate bots
    const bots = generateBots(4);
    
    const userName = generateUserName();
    const user = { id: 'user', name: userName, isHuman: true, avatar: '👤', status: 'ALIVE' };
    
    // Shuffle all players
    const allPlayers = [user, ...bots].sort(() => Math.random() - 0.5);

    set({
      mode: selectedMode,
      players: allPlayers,
      userPlayer: user,
      messages: [{ id: 0, sender: 'SYSTEM', text: 'Connection Established. Protocol Initiated. 5 Minute Timer Started.' }],
      currentRound: 1,
      isThinking: false,
      turnQueue: allPlayers.map(p => p.id),
      activePlayerIndex: 0,
      timeLeft: 300,
      isVoting: false,
      roundSummaries: [] // Reset memory for new game
    });
  },

  addMessage: (msg) => set((state) => ({ 
    messages: [...state.messages, { ...msg, id: state.messages.length }] 
  })),

  // Turn Logic
  nextTurn: () => set((state) => {
    const nextIndex = (state.activePlayerIndex + 1) % state.turnQueue.length;
    return { activePlayerIndex: nextIndex };
  }),

  setTimeLeft: (time) => set({ timeLeft: time }),
  
  startVoting: () => set({ isVoting: true }),
  endVoting: () => set({ isVoting: false }),

  // Voice toggle
  toggleVoice: () => set((state) => {
    const newValue = !state.voiceEnabled;
    localStorage.setItem('voice_enabled', newValue.toString());
    return { voiceEnabled: newValue };
  }),

  // Bot Memory
  addRoundSummary: (summary) => set((state) => ({
    roundSummaries: [...state.roundSummaries, summary]
  })),

  getRoundMemory: () => {
    const state = get();
    return state.roundSummaries.join('\n\n');
  },

  nextRound: () => set((state) => {
    // Filter to only alive players for the new turn queue
    const alivePlayers = state.players.filter(p => p.status === 'ALIVE');
    return {
      currentRound: state.currentRound + 1,
      timeLeft: 300, // Reset to 5 minutes
      activePlayerIndex: 0,
      turnQueue: alivePlayers.map(p => p.id)
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
      isVoting: false,
    })
}));

export default useGame;
