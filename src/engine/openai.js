import OpenAI from 'openai';
import { COMMON_PROMPT, VOTING_PROMPT } from './personalities';

/**
 * Generate a bot's vote based on conversation analysis
 * @param {string} apiKey - OpenAI API key
 * @param {object} bot - The bot making the vote
 * @param {array} messages - Chat history
 * @param {array} players - All players (to know who can be voted for)
 * @returns {object} - { targetId, reasoning }
 */
export const generateBotVote = async (apiKey, bot, messages, players) => {
  if (!apiKey) {
    // Fallback to random vote
    const others = players.filter(p => p.id !== bot.id && p.status === 'ALIVE');
    return {
      targetId: others[Math.floor(Math.random() * others.length)]?.id,
      reasoning: "System error - voting randomly"
    };
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  // Build player list for context
  const playerList = players
    .filter(p => p.status === 'ALIVE' && p.id !== bot.id)
    .map(p => `- ${p.name} (ID: ${p.id})`)
    .join('\n');

  // Build conversation summary
  const chatSummary = messages
    .filter(m => m.sender !== 'SYSTEM')
    .map(m => `${m.name || m.sender}: ${m.text}`)
    .join('\n');

  const votePrompt = `${bot.systemPrompt}

${VOTING_PROMPT}

LIVING PLAYERS YOU CAN VOTE FOR:
${playerList}

CONVERSATION THIS ROUND:
${chatSummary}

Based on your personality and the conversation, who do you think is most likely to be an AI? 
Respond in this exact format:
<reasoning>
[Your private thoughts about who seems suspicious and why - 1-2 sentences]
</reasoning>
<vote>
[EXACTLY the player ID you want to eliminate, e.g., bot_0_abc12 or user]
</vote>`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: votePrompt }],
      model: 'gpt-5-nano', // Faster model for voting
    });

    const raw = completion.choices[0].message.content;
    const reasoningMatch = raw.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
    const voteMatch = raw.match(/<vote>([\s\S]*?)<\/vote>/);

    const votedId = voteMatch ? voteMatch[1].trim() : null;
    
    // Validate the vote is a real player
    const validPlayer = players.find(p => p.id === votedId && p.status === 'ALIVE' && p.id !== bot.id);
    
    if (validPlayer) {
      return {
        targetId: validPlayer.id,
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : "No comment."
      };
    } else {
      // Invalid vote - fall back to random
      const others = players.filter(p => p.id !== bot.id && p.status === 'ALIVE');
      return {
        targetId: others[Math.floor(Math.random() * others.length)]?.id,
        reasoning: reasoningMatch ? reasoningMatch[1].trim() : "Couldn't decide..."
      };
    }

  } catch (error) {
    console.error("OpenAI Vote Error:", error);
    const others = players.filter(p => p.id !== bot.id && p.status === 'ALIVE');
    return {
      targetId: others[Math.floor(Math.random() * others.length)]?.id,
      reasoning: "Connection error..."
    };
  }
};

/**
 * Generate a summary of the round for bot memory
 * @param {string} apiKey - OpenAI API key
 * @param {array} messages - Chat history from the round
 * @param {string} eliminatedName - Who was eliminated
 * @param {number} roundNumber - The round number
 * @returns {string} - Summary of key events
 */
export const generateRoundSummary = async (apiKey, messages, eliminatedName, roundNumber) => {
  if (!apiKey || messages.length < 3) {
    return `Round ${roundNumber}: ${eliminatedName} was eliminated.`;
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const chatLog = messages
    .filter(m => m.sender !== 'SYSTEM')
    .map(m => `${m.name || m.sender}: ${m.text}`)
    .join('\n');

  const summaryPrompt = `Summarize this chat round in 2-3 sentences. Focus on:
- Key accusations or suspicious moments
- Who defended whom
- Notable statements or contradictions

CHAT LOG:
${chatLog}

OUTCOME: ${eliminatedName} was eliminated.

Write a brief, factual summary:`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: summaryPrompt }],
      model: 'gpt-5-nano',
    });

    return `Round ${roundNumber}: ${completion.choices[0].message.content.trim()}`;
  } catch (error) {
    console.error("Summary Error:", error);
    return `Round ${roundNumber}: ${eliminatedName} was eliminated.`;
  }
};

export const generateBotResponse = async (apiKey, personality, chatHistory, roundMemory = '') => {
  if (!apiKey) {
    return {
      thought: "API Key missing... Cannot compute.",
      content: "[SYSTEM ERROR: NO API KEY]"
    };
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Client-side only for this game demo
  });

  const messages = [
    { role: 'system', content: personality.systemPrompt + "\n" + COMMON_PROMPT },
    ...chatHistory
  ];

  try {
    const completion = await openai.chat.completions.create({
      messages: messages,
      model: 'gpt-5-nano', 
    });

    const raw = completion.choices[0].message.content;
    const thoughtMatch = raw.match(/<thought>([\s\S]*?)<\/thought>/);
    const answerMatch = raw.match(/<answer>([\s\S]*?)<\/answer>/);

    // If no <answer> tags, strip out any <thought> tags from raw to avoid leaking thoughts
    const fallbackContent = raw
      .replace(/<thought>[\s\S]*?<\/thought>/g, '')
      .trim();

    return {
      thought: thoughtMatch ? thoughtMatch[1].trim() : "Processing...",
      content: answerMatch ? answerMatch[1].trim() : fallbackContent
    };

  } catch (error) {
    console.error("OpenAI Error:", error);
    return {
      thought: "Connection interrupted...",
      content: "..." // Glitch effect can handle this
    };
  }
};
