import { useState } from 'react';
import { Shield, Smartphone } from 'lucide-react';
import useGame from '../engine/gameStore';

const MainMenu = () => {
  const { apiKey, setApiKey, clearApiKey, startGame } = useGame();
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');

  const beginGame = (mode) => {
    const key = localKey.trim();
    if (!key) {
      setMessage('Enter an OpenAI API key before starting.');
      return;
    }
    setApiKey(key);
    startGame(mode);
  };

  const pasteKey = async () => {
    try {
      setLocalKey((await navigator.clipboard.readText()).trim());
      setMessage('Key pasted. It will be kept for this browser session only.');
    } catch (error) {
      console.warn('Clipboard permission denied:', error);
      setMessage('Clipboard permission was denied. Type or paste the key manually.');
    }
  };

  const clearKey = () => {
    clearApiKey();
    setLocalKey('');
    setMessage('Stored session key cleared.');
  };

  return (
    <div className="flex flex-col gap-6 text-center sm:gap-8">
      <header>
        <h1 className="break-words text-3xl font-bold glow flicker sm:text-5xl lg:text-6xl">TURING_CHAT_V.2.0</h1>
        <p className="mt-2 text-base text-green-300 sm:text-xl">Social Deduction // AI Protocol</p>
      </header>

      <section aria-labelledby="api-key-title" className="rounded border border-green-800 bg-zinc-900/60 p-4 text-left sm:p-6">
        <h2 id="api-key-title" className="mb-2 text-sm text-green-200">OPENAI_API_KEY_REQUIRED</h2>
        <label htmlFor="openai-key" className="sr-only">OpenAI API key</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="openai-key"
            type={showKey ? 'text' : 'password'}
            value={localKey}
            onChange={(event) => { setLocalKey(event.target.value); setMessage(''); }}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck="false"
            className="min-w-0 flex-1 border border-green-700 bg-black px-3 py-2 font-mono text-green-300 focus:border-green-300 focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <button type="button" onClick={pasteKey} className="border border-green-700 px-3 py-2 text-xs hover:bg-green-900/40">PASTE</button>
            <button
              type="button"
              onClick={() => setShowKey((visible) => !visible)}
              aria-pressed={showKey}
              className="border border-green-700 px-3 py-2 text-xs hover:bg-green-900/40"
            >
              {showKey ? 'HIDE' : 'SHOW'}
            </button>
            <button type="button" onClick={clearKey} className="border border-red-800 px-3 py-2 text-xs text-red-200 hover:bg-red-950">CLEAR</button>
          </div>
        </div>
        {message && <p role="status" className="mt-2 text-xs text-yellow-200">{message}</p>}
        <p className="mt-2 text-xs text-gray-300">
          The key stays in session storage until this tab session ends and is sent directly to OpenAI with game messages. Use a restricted key with a spending limit.
        </p>
      </section>

      <section aria-label="Game modes" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => beginGame('IMPOSTOR')}
          disabled={!localKey.trim()}
          className="group relative border border-green-600 p-5 transition-colors hover:bg-green-900/20 disabled:cursor-not-allowed disabled:opacity-40 sm:p-8"
        >
          <Smartphone aria-hidden="true" className="absolute right-2 top-2 opacity-60" size={24} />
          <h2 className="mb-2 break-words text-xl font-bold group-hover:text-white sm:text-2xl">IMPOSTOR_PROTOCOL</h2>
          <p className="text-sm text-green-200">Role: Human Impostor</p>
          <p className="mt-2 text-xs text-green-300">Blend in with the bots</p>
        </button>

        <button
          type="button"
          onClick={() => beginGame('DEFENSE')}
          disabled={!localKey.trim()}
          className="group relative border border-green-600 p-5 transition-colors hover:bg-green-900/20 disabled:cursor-not-allowed disabled:opacity-40 sm:p-8"
        >
          <Shield aria-hidden="true" className="absolute right-2 top-2 opacity-60" size={24} />
          <h2 className="mb-2 break-words text-xl font-bold group-hover:text-white sm:text-2xl">HUMANITY_DEFENSE</h2>
          <p className="text-sm text-green-200">Role: Human Defender</p>
          <p className="mt-2 text-xs text-green-300">Prove your existence</p>
        </button>
      </section>
    </div>
  );
};

export default MainMenu;
