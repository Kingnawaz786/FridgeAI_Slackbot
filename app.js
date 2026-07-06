// Load environment variables from the .env file
require('dotenv').config();

const { App } = require('@slack/bolt');
const express = require('express');
const { getGroqCompletion } = require('./services/groq');

// Verify that critical environment variables are set
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_APP_LEVEL_TOKEN', 'GROQ_API_KEY'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`❌ Critical Error: Missing environment variables: ${missingVars.join(', ')}`);
  console.error('Please populate these values in your .env file before starting the application.');
  process.exit(1);
}

// 1. Initialize the Slack Bolt App in Socket Mode
// Socket Mode connects directly using WebSockets, removing the need for public webhook tunnels (like ngrok/tunnelmole) locally.
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_LEVEL_TOKEN,
  socketMode: true
});

// 2. Start a standalone Express app for HTTP health checks
// Render requires an HTTP port to open and return a 200 status, otherwise the deployment is considered failed.
const expressApp = express();
const port = process.env.PORT || 3000;

expressApp.get('/', (req, res) => {
  res.status(200).send('🍳 FridgeChef AI Slack Bot is active and running in Socket Mode!');
});

expressApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', socketMode: true, timestamp: new Date().toISOString() });
});

// Start Express server
const httpServer = expressApp.listen(port, () => {
  console.log(`📡 Express health check server listening on port ${port}`);
});

// 3. Register Slash Commands
// Each command logic is defined inside the 'commands/' directory
require('./commands/fridgecook')(app);
require('./commands/fridgehealth')(app);
require('./commands/fridgeshop')(app);
require('./commands/fridgeinventory')(app);
require('./commands/fridgeshare')(app);
require('./commands/fridgetips')(app);

// 4. Register Event Listeners (e.g. app_mention)
// Handles direct mentions: @FridgeChef AI chicken, eggs, rice
app.event('app_mention', async ({ event, client, say }) => {
  try {
    // Extract the message text without the bot mention tag
    const cleanText = event.text.replace(/<@.*?>/g, '').trim();

    if (!cleanText) {
      await say({
        text: `👋 Hi <@${event.user}>! Tell me what's in your fridge, and I will recommend a recipe. (e.g., mention me and say "garlic, cheese, pasta")`,
        thread_ts: event.ts // Reply in a thread to keep channels tidy
      });
      return;
    }

    // Acknowledge by stating the AI is cooking
    const thinkingMsg = await say({
      text: `🍳 *FridgeChef AI* is compiling a recipe for you, <@${event.user}>...`,
      thread_ts: event.ts
    });

    const systemPrompt = `You are FridgeChef AI, a professional chef.
Suggest a delicious recipe using the ingredients mentioned by the user.

CRITICAL SLACK MARKDOWN RULES:
- Use single asterisks for bold text (e.g., *this is bold*). NEVER use double asterisks.
- Do NOT use standard markdown headers (like #, ##, or ###). Instead, use bold text (e.g., *⭐ Recipe Name:*).
- Use lists formatted with simple bullet points (•) or numbers (1., 2.).
- Use emojis to make sections visually appealing.

Your response MUST contain the following sections:
*⭐ Recipe Name:* (Make it catchy)
*🛒 Ingredients Used:* (Mention quantities, highlight items from their list)
*📝 Step-by-step Instructions:* (Numbered list, clear and easy to follow)
*⏱️ Cooking Time:* (Prep time and cook time)
*🔥 Estimated Calories:* (Approximate calories per serving)`;

    const recipeResponse = await getGroqCompletion(cleanText, systemPrompt);

    // Update the message in thread with the final response and action buttons
    await client.chat.update({
      channel: event.channel,
      ts: thinkingMsg.ts,
      text: recipeResponse,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🍳 *FridgeChef AI* has a recipe recommendation for you, <@${event.user}>:\n\n${recipeResponse}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🥗 Analyze Health'
              },
              value: cleanText, // Pass the ingredients so the button handler knows what to analyze
              action_id: 'health_analysis_btn'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🛒 Get Shopping List'
              },
              value: cleanText,
              action_id: 'shopping_list_btn'
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Error handling app mention event:', error);
    try {
      await say({
        text: `⚠️ *FridgeChef AI Error:* Encountered an error compiling your request. (Error: ${error.message})`,
        thread_ts: event.ts
      });
    } catch (e) {
      console.error(e);
    }
  }
});

// 5. Start the Socket Mode Client
(async () => {
  try {
    await app.start();
    console.log(`\n==================================================`);
    console.log(`⚡️ FridgeChef AI is running in Socket Mode!`);
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`==================================================\n`);
  } catch (error) {
    console.error('❌ Failed to start the FridgeChef AI Socket Mode Client:', error);
    httpServer.close();
    process.exit(1);
  }
})();
