const Groq = require('groq-sdk');

// Initialize Groq client using environment variable API key
let groq;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  } else {
    console.warn('WARNING: GROQ_API_KEY is not defined in the environment variables.');
  }
} catch (error) {
  console.error('Failed to initialize Groq SDK:', error);
}

/**
 * Sends a prompt to the Groq API and returns the text completion.
 * @param {string} prompt - The user prompt.
 * @param {string} systemPrompt - Optional system instruction to guide the AI behavior.
 * @returns {Promise<string>} The generated response text.
 */
async function getGroqCompletion(prompt, systemPrompt = 'You are a helpful culinary AI assistant.') {
  if (!groq) {
    throw new Error('Groq client is not initialized. Please check your GROQ_API_KEY environment variable.');
  }

  try {
    // We use a high-performance, fast model: llama-3.3-70b-versatile
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024
    });

    if (response && response.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.content;
    } else {
      throw new Error('Invalid response structure received from Groq API.');
    }
  } catch (error) {
    console.error('Groq Service Error:', error);
    throw error;
  }
}

module.exports = {
  getGroqCompletion
};
