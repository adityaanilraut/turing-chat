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

1. **Enter your OpenAI API key** (stored locally, never sent to any server)
2. **Choose a game mode**
3. **Chat with 4 AI bots** - each with unique personalities
4. **5 minutes on the clock** - make your case
5. **Voting phase** - everyone votes to eliminate one player
6. **Survive to win**

## 🧠 Bot Personalities

| Role | Behavior |
|------|----------|
| Skeptic | Suspicious of everyone, asks sharp questions |
| Gamer | Chill vibes, uses slang (bruh, fr, cap) |
| Boomer | Polite but confused by technology... |
| Logic | Analytical, fact-driven, denies being robotic |
| Mimic | Desperate to fit in, agrees with previous speaker |
| Chaos | Random, unpredictable responses |

## 🛠️ Tech Stack

- **React 19** - UI framework
- **Vite 7** - Build tool
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **OpenAI API** - GPT-4o-mini for bot responses
- **Lucide React** - Icons

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
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
│   ├── ChatInterface.jsx   # Main game chat UI
│   ├── Layout.jsx          # CRT terminal wrapper
│   ├── MainMenu.jsx        # Start screen & API key input
│   ├── ResultsScreen.jsx   # Win/lose screen
│   ├── ThoughtBubble.jsx   # Bot internal thoughts display
│   └── VotingOverlay.jsx   # Elimination voting UI
├── engine/
│   ├── gameStore.js        # Zustand state management
│   ├── openai.js           # OpenAI API integration
│   └── personalities.js    # Bot personality definitions
├── App.jsx
├── main.jsx
└── index.css               # Terminal aesthetics & animations
```

## ⚙️ Configuration

The game uses your OpenAI API key for bot responses. The key is:
- Stored in `localStorage` 
- Never sent to any external server
- Used client-side only (via `dangerouslyAllowBrowser: true`)

**Note:** API calls are made directly from the browser. For production use, consider proxying through a backend.

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

