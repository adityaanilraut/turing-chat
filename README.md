# TURING_CHAT_V.2.0

A social deduction game where you chat with AI bots and try to survive the vote. Can you tell the difference between human and machine?

![Terminal Aesthetic](https://img.shields.io/badge/aesthetic-terminal-green?style=flat-square)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-7-purple?style=flat-square)

## 🎮 Game Modes

### IMPOSTOR_PROTOCOL
You're a human pretending to be a bot. Blend in with the AI players and avoid detection. If the bots vote you out, you lose.

### HUMANITY_DEFENSE  
You're a human trying to prove your existence. Convince the group you're real while identifying the bots. Survive the vote to win.

## 🤖 How It Works

1. **Enter your OpenAI API key** (kept for the browser session and sent directly to OpenAI)
2. **Choose a game mode**
3. **Chat with 4 AI bots** - each with unique personalities
4. **5 minutes on the clock** - make your case
5. **Voting phase** - everyone votes to eliminate one player
6. **Bots remember** - each round's events are summarized and fed to the bots next round
7. **Survive to win** (mode-specific — see below)

### Win Conditions

| Mode | You win when... | You lose when... |
|------|-----------------|------------------|
| HUMANITY_DEFENSE | All bots are voted out | You are voted out |
| IMPOSTOR_PROTOCOL | Only you + 1 bot remain | The bots vote you out |

## 🧠 Bot Personalities

| Role | Behavior |
|------|----------|
| Skeptic | Suspicious, asks pointed questions, won't let inconsistencies slide |
| Gamer | Chill vibes, casual slang ("ngl", "lowkey", "sus") |
| Newbie | Friendly but confused, asks for clarification, trusts easily |
| Analyst | Logical pattern-spotter, statistical framing |
| Peacekeeper | Builds bridges, finds common ground, dislikes conflict |
| Deflector | Charming and evasive, redirects attention smoothly |

## 🔊 Voice Mode

Toggle the speaker icon in the chat header to have bot messages spoken aloud via the Web Speech API. Each bot is assigned a consistent voice/pitch based on its ID.

## 🛠️ Tech Stack

- **React 19** - UI framework
- **Vite 7** - Build tool
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **OpenAI API** - `gpt-5.4-mini` for bot responses, voting, and round summaries
- **Web Speech API** - Optional TTS for bot messages
- **Lucide React** - Icons

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd turing-chat

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatInterface.jsx   # Main game chat UI + roster + voice toggle
│   ├── Layout.jsx          # CRT terminal wrapper
│   ├── MainMenu.jsx        # Start screen & API key input
│   ├── ResultsScreen.jsx   # Win/lose screen
│   └── VotingOverlay.jsx   # Elimination voting UI
├── engine/
│   ├── gameStore.js        # Zustand state management
│   ├── openai.js           # OpenAI API integration
│   ├── gameRules.js        # Voting and win/loss rules
│   ├── personalities.js    # Bot personality + mode definitions
│   └── speech.js           # Web Speech API wrapper for TTS
├── App.jsx
├── main.jsx
└── index.css               # Terminal aesthetics & animations
```

## ⚙️ Configuration

The game uses your OpenAI API key for bot responses. The key is:
- Stored in `sessionStorage`, not persisted indefinitely
- Sent directly from the browser to OpenAI with game messages
- Cleared with the setup-screen button or when the browser session ends
- Used client-side via `dangerouslyAllowBrowser: true`

Use a restricted API key with a spending limit. For a public production deployment, proxy requests through a rate-limited backend and keep credentials server-side.

## ✅ Verification

```bash
npm run lint
npm test
npm run build
```

## 🎨 Aesthetics

- CRT scanline effect
- Flickering terminal text
- Green-on-black color scheme
- Monospace typography
- Glowing text shadows

## 📜 License

MIT

---

*"Connection Established. Protocol Initiated."*
