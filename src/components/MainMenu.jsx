import React, { useState } from 'react';
import useGame from '../engine/gameStore';
import { Shield, Smartphone, Terminal, Lock } from 'lucide-react';

const MainMenu = () => {
  const { apiKey, setApiKey, startGame } = useGame();
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSaveKey = () => {
    setApiKey(localKey);
  };

  return (
    <div className="flex flex-col gap-8 text-center animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-6xl font-bold glow flicker mb-2">TURING_CHAT_V.2.0</h1>
        <p className="text-xl text-green-400 opacity-80">Social Deduction // AI Protocol</p>
      </div>

      <div className="bg-zinc-900/50 p-6 rounded border border-green-900 text-left">
        <label className="block text-sm mb-2 text-green-300">OPENAI_API_KEY_REQUIRED</label>
        <div className="flex gap-2">
          <input 
            type={showKey ? "text" : "password"} 
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 bg-black border border-green-700 px-3 py-2 text-green-500 focus:outline-none focus:border-green-400 font-mono z-20 relative"
          />
          <button 
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setLocalKey(text);
              } catch (err) {
                console.error('Failed to read clipboard', err);
                alert("Clipboard permission denied. Please type manually.");
              }
            }}
            className="px-3 border border-green-700 hover:bg-green-900/40 text-xs"
            title="Paste from Clipboard"
          >
            NOTEPAD
          </button>
          <button 
            onClick={() => setShowKey(!showKey)}
            className="px-3 border border-green-700 hover:bg-green-900/40"
          >
            {showKey ? "HIDE" : "SHOW"}
          </button>
          <button 
            onClick={handleSaveKey}
            className="px-4 bg-green-900/40 border border-green-600 hover:bg-green-700 hover:text-white transition-colors"
          >
            SAVE
          </button>
        </div>
        <p className="text-xs text-stone-500 mt-2">Key is stored locally. If paste fails, type manually or check permissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => startGame('IMPOSTOR')}
          disabled={!apiKey}
          className="group relative p-8 border border-green-600 hover:bg-green-900/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <div className="absolute top-2 right-2 opacity-50"><Smartphone size={24} /></div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-white">IMPOSTOR_PROTOCOL</h2>
          <p className="text-sm opacity-70">Role: Human Impostor</p>
          <p className="text-xs mt-2 text-green-300">"Blend in with the Bots"</p>
        </button>

        <button 
          onClick={() => startGame('DEFENSE')}
          disabled={!apiKey}
          className="group relative p-8 border border-green-600 hover:bg-green-900/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <div className="absolute top-2 right-2 opacity-50"><Shield size={24} /></div>
          <h2 className="text-2xl font-bold mb-2 group-hover:text-white">HUMANITY_DEFENSE</h2>
          <p className="text-sm opacity-70">Role: Human Defender</p>
          <p className="text-xs mt-2 text-green-300">"Prove your existence"</p>
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
