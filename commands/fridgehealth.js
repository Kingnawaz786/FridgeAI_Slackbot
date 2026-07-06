const { getGroqCompletion } = require('../services/groq');

/**
 * Registers the /fridgehealth slash command and action button handlers.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  
  // 1. Slash Command Listener
  app.command('/fridgehealth', async ({ command, ack, respond, client }) => {
    await ack();

    const ingredients = command.text.trim();

    if (!ingredients) {
      await respond({
        text: '❌ *Error:* Please enter ingredients or a meal description to analyze health. \nExample: `/fridgehealth white rice, chicken breast, broccoli`',
        response_type: 'ephemeral'
      });
      return;
    }

    await handleHealthRequest({
      client,
      channelId: command.channel_id,
      userId: command.user_id,
      ingredients
    });
  });

  // 2. Action Button Listener (triggered from the /fridgecook recipe block)
  app.action('health_analysis_btn', async ({ ack, body, action, client }) => {
    await ack();

    const ingredients = action.value; // Retrieved from the button value
    const channelId = body.channel.id;
    const userId = body.user.id;

    await handleHealthRequest({
      client,
      channelId,
      userId,
      ingredients,
      isButtonTriggered: true
    });
  });
};

/**
 * Common health request processor. Generates prompt, calls Groq,
 * and outputs formatting with Block Kit sections.
 */
async function handleHealthRequest({ client, channelId, userId, ingredients, isButtonTriggered = false }) {
  try {
    // Notify the channel that the nutritionist is analyzing
    const statusText = isButtonTriggered 
      ? `🥗 Analyzing the nutritional health of the recipe ingredients for <@${userId}>...`
      : `🥗 *FridgeChef AI* is analyzing the nutritional health of: "${ingredients}" for <@${userId}>...`;

    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: statusText
    });

    const systemPrompt = `You are FridgeChef AI, an expert nutritionist and dietitian.
Analyze the user's list of ingredients or meal description and provide a healthy lifestyle score and macro estimation.

CRITICAL SLACK MARKDOWN RULES:
- Use single asterisks for bold text (e.g., *this is bold*). NEVER use double asterisks (e.g., **this is wrong**).
- Do NOT use standard markdown headers (like #, ##, or ###). Instead, make headers bold with single asterisks (e.g., *🏆 Health Score:*).
- Use lists formatted with simple bullet points (•) or numbers (1., 2.).
- Use emojis to make sections visually appealing.

Your response MUST contain the following sections:
*🏆 Health Score:* (Out of 10, e.g., 8/10. Include a brief summary justification)
*📊 Macronutrient Estimates:* (Provide estimated breakdown of Protein, Carbs, and Fats in grams, as well as total calories)
*🌱 Suggestions to Make it Healthier:* (Bullet points recommending additions, subtractions, or cooking method adjustments)`;

    const prompt = `Please analyze the health and nutrition for these ingredients/meal: ${ingredients}`;
    const healthResponse = await getGroqCompletion(prompt, systemPrompt);

    // Update the processing message with the final formatted response
    await client.chat.update({
      channel: channelId,
      ts: infoMessage.ts,
      text: healthResponse,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🥗 *FridgeChef AI Health & Nutrition Analysis* (Requested by <@${userId}>):\n\n${healthResponse}`
          }
        }
      ]
    });

  } catch (error) {
    console.error('Error in health analysis:', error);
    try {
      await client.chat.postMessage({
        channel: channelId,
        text: `⚠️ *FridgeChef AI Error:* Failed to complete the health analysis. (Error: ${error.message})`
      });
    } catch (err) {
      console.error(err);
    }
  }
}
