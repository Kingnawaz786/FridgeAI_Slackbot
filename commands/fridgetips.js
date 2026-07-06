const { getGroqCompletion } = require('../services/groq');

/**
 * Registers the /fridgetips slash command.
 * Provides AI-generated kitchen hacks, food preservation tips, and storage advice.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  app.command('/fridgetips', async ({ command, ack, respond, client }) => {
    await ack();

    let query = command.text.trim();
    
    // Default fallback query if none is provided
    if (!query) {
      query = 'general food preservation tips and kitchen organization hacks';
    }

    try {
      const userId = command.user_id;
      const channelId = command.channel_id;

      // 1. Post a loading status message
      const infoMessage = await client.chat.postMessage({
        channel: channelId,
        text: `💡 *FridgeChef AI* is looking up kitchen tips for <@${userId}> on: "${query}"...`
      });

      // 2. Define the system instructions for the Kitchen Consultant persona
      const systemPrompt = `You are FridgeChef AI, an expert kitchen consultant, food preservation specialist, and culinary hacker.
Provide practical, easy-to-read kitchen tips, hacks, or storage advice based on the user's query.

CRITICAL SLACK MARKDOWN RULES:
- Use single asterisks for bold text (e.g., *this is bold*). NEVER use double asterisks.
- Do NOT use standard markdown headers (like #, ##, or ###). Instead, use bold text (e.g., *💡 Storage Tip:*).
- Use lists formatted with simple bullet points (•) or numbers (1., 2.).
- Use emojis to make sections visually appealing.

Your response MUST contain:
- A brief introduction.
- 3 to 5 clear, actionable bullet points explaining the tips/hacks.
- An estimated extension of expiration/shelf-life where applicable.`;

      // 3. Call the reusable Groq API Service
      const prompt = `Please provide kitchen hacks, storage tips, or preservation advice for: ${query}`;
      const tipsResponse = await getGroqCompletion(prompt, systemPrompt);

      // 4. Update the message with Block Kit
      await client.chat.update({
        channel: channelId,
        ts: infoMessage.ts,
        text: tipsResponse,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💡 *FridgeChef AI Kitchen Tips & Hacks* (Requested by <@${userId}>):\n\n${tipsResponse}`
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error in /fridgetips command handler:', error);
      await respond({
        text: `⚠️ *FridgeChef AI Error:* Failed to fetch tips. (Error: ${error.message})`,
        response_type: 'ephemeral'
      });
    }
  });
};
