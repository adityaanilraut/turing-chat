/**
 * Text-to-Speech utility using the Web Speech API
 * Assigns different voices to different bots for variety
 */

// Store voice assignments for consistency
const voiceAssignments = new Map();

// Get available voices (may need to wait for them to load)
let availableVoices = [];

const loadVoices = () => {
  availableVoices = speechSynthesis.getVoices();
  return availableVoices;
};

// Load voices when they become available
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Get a voice for a specific bot (consistent across the session)
 * @param {string} botId - The bot's ID
 * @returns {SpeechSynthesisVoice|null}
 */
const getVoiceForBot = (botId) => {
  // Return cached assignment if exists
  if (voiceAssignments.has(botId)) {
    return voiceAssignments.get(botId);
  }

  // Ensure voices are loaded
  if (availableVoices.length === 0) {
    availableVoices = loadVoices();
  }

  if (availableVoices.length === 0) {
    return null;
  }

  // Filter for English voices that sound good
  const englishVoices = availableVoices.filter(v => 
    v.lang.startsWith('en') && !v.name.includes('Compact')
  );

  const voicePool = englishVoices.length > 0 ? englishVoices : availableVoices;

  // Assign a voice based on botId hash for consistency
  const hash = botId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const voiceIndex = hash % voicePool.length;
  const selectedVoice = voicePool[voiceIndex];

  voiceAssignments.set(botId, selectedVoice);
  return selectedVoice;
};

/**
 * Speak a message using TTS
 * @param {string} text - The text to speak
 * @param {string} speakerId - The speaker's ID (for voice selection)
 * @param {object} options - Optional settings
 * @returns {Promise<void>}
 */
export const speak = (text, speakerId, options = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get voice for this speaker
    const voice = getVoiceForBot(speakerId);
    if (voice) {
      utterance.voice = voice;
    }

    // Configure speech settings
    utterance.rate = options.rate || 1.0; // Speed
    utterance.pitch = options.pitch || 1.0; // Pitch
    utterance.volume = options.volume || 0.8; // Volume

    // Vary pitch slightly based on speaker for more variety
    const pitchVariation = (speakerId.charCodeAt(0) % 5) * 0.1 - 0.2; // -0.2 to +0.2
    utterance.pitch = Math.max(0.5, Math.min(1.5, utterance.pitch + pitchVariation));

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      resolve(); // Resolve anyway to not block the game
    };

    speechSynthesis.speak(utterance);
  });
};

/**
 * Stop any ongoing speech
 */
export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
};

/**
 * Check if TTS is supported
 */
export const isSpeechSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/**
 * Get list of available voices (for debugging/settings)
 */
export const getAvailableVoices = () => {
  if (availableVoices.length === 0) {
    loadVoices();
  }
  return availableVoices;
};

