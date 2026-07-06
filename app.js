// Load environment variables from the .env file
require('dotenv').config();

const { App, ExpressReceiver } = require('@slack/bolt');

// Verify that critical environment variables are set
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'GROQ_API_KEY'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`❌ Critical Error: Missing environment variables: ${missingVars.join(', ')}`);
  console.error('Please populate these values in your .env file before starting the application.');
  process.exit(1);
}

// 1. Initialize ExpressReceiver
// This allows us to handle both Slack Events (via HTTP POST) and custom HTTP endpoints (like GET health checks)
// which is extremely important for hosting platforms like Render.
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events' // Slack slash commands and events will hit: http://your-domain.com/slack/events
});

// 2. Initialize the Slack Bolt App
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// 3. Add a simple GET handler for health checks
// Render requires an HTTP server to respond with a 200 OK to keep the deployment active.
receiver.router.get('/', (req, res) => {
  res.status(200).send('🍳 FridgeChef AI Slack Bot is active and running!');
});

receiver.router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 4. Register Slash Commands
// Each command logic is defined inside the 'commands/' directory
require('./commands/fridgecook')(app);
require('./commands/fridgehealth')(app);
require('./commands/fridgeshop')(app);

// 5. Start the Application Server
(async () => {
  const port = process.env.PORT || 3000;
  try {
    await app.start(port);
    console.log(`\n==================================================`);
    console.log(`⚡️ FridgeChef AI Slack Bot is running on port ${port}!`);
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`==================================================\n`);
  } catch (error) {
    console.error('❌ Failed to start the FridgeChef AI Slack App:', error);
    process.exit(1);
  }
})();
