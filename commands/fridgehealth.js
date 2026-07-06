const { getGroqCompletion } = require('../services/groq');

// In-memory wellness store, keyed by Slack User ID
const waterLogs = {};
const calorieLogs = {};
const userAllergies = {};

/**
 * Registers the /fridgehealth slash command, wellness dashboards, modals, and actions.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  
  // 1. Slash Command Listener
  app.command('/fridgehealth', async ({ command, ack, respond, client }) => {
    await ack();

    const ingredients = command.text.trim();

    // If ingredients/meal are provided, perform nutrition analysis immediately
    if (ingredients) {
      await handleHealthRequest({
        client,
        channelId: command.channel_id,
        userId: command.user_id,
        ingredients
      });
      return;
    }

    // Otherwise, post the Interactive Wellness Dashboard
    const userId = command.user_id;
    await sendWellnessDashboard(client, command.channel_id, userId);
  });

  // 2. Action Buttons Listeners for Wellness Dashboard
  
  // (a) Log Water (+250ml)
  app.action('log_water_250_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    waterLogs[userId] = (waterLogs[userId] || 0) + 250;
    await updateWellnessDashboard(client, body.channel.id, body.message.ts, userId);
  });

  // (b) Log Water (+500ml)
  app.action('log_water_500_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    waterLogs[userId] = (waterLogs[userId] || 0) + 500;
    await updateWellnessDashboard(client, body.channel.id, body.message.ts, userId);
  });

  // (c) Reset Water/Calories
  app.action('reset_wellness_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    waterLogs[userId] = 0;
    calorieLogs[userId] = 0;
    await updateWellnessDashboard(client, body.channel.id, body.message.ts, userId);
  });

  // (d) Open Allergy Manager Modal
  app.action('manage_allergies_btn', async ({ ack, body, client }) => {
    await ack();
    
    const userId = body.user.id;
    const currentAllergies = userAllergies[userId] || [];

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'allergy_modal',
          private_metadata: JSON.stringify({ channelId: body.channel.id, messageTs: body.message?.ts }),
          title: { type: 'plain_text', text: 'Allergy Manager 🌾' },
          blocks: [
            {
              type: 'input',
              block_id: 'allergies_block',
              label: { type: 'plain_text', text: 'Select Your Allergies' },
              element: {
                type: 'checkboxes',
                action_id: 'allergies_checkboxes',
                initial_options: currentAllergies.length > 0 ? currentAllergies.map(val => ({
                  text: { type: 'plain_text', text: val.toUpperCase() },
                  value: val
                })) : undefined,
                options: [
                  { text: { type: 'plain_text', text: '🥜 PEANUTS' }, value: 'peanuts' },
                  { text: { type: 'plain_text', text: '🥛 DAIRY' }, value: 'dairy' },
                  { text: { type: 'plain_text', text: '🌾 GLUTEN' }, value: 'gluten' },
                  { text: { type: 'plain_text', text: '🫘 SOY' }, value: 'soy' },
                  { text: { type: 'plain_text', text: '🦐 SHELLFISH' }, value: 'shellfish' }
                ]
              },
              optional: true
            }
          ],
          submit: { type: 'plain_text', text: 'Save' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (e) Open Calorie Logger Modal
  app.action('log_calories_btn', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'calorie_modal',
          private_metadata: JSON.stringify({ channelId: body.channel.id, messageTs: body.message?.ts }),
          title: { type: 'plain_text', text: 'Log Meal Calories 📊' },
          blocks: [
            {
              type: 'input',
              block_id: 'meal_name_block',
              label: { type: 'plain_text', text: 'Meal Eaten' },
              element: { type: 'plain_text_input', action_id: 'meal_input', placeholder: { type: 'plain_text', text: 'e.g., Avocado Toast' } }
            },
            {
              type: 'input',
              block_id: 'calories_count_block',
              label: { type: 'plain_text', text: 'Calories (kcal)' },
              element: { type: 'plain_text_input', action_id: 'calories_input', placeholder: { type: 'plain_text', text: 'e.g., 350' } }
            }
          ],
          submit: { type: 'plain_text', text: 'Log Meal' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (f) Open Substitute Request Modal
  app.action('find_substitutes_btn', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'substitute_modal',
          private_metadata: body.channel.id,
          title: { type: 'plain_text', text: 'Healthy Substitutes 🔄' },
          blocks: [
            {
              type: 'input',
              block_id: 'sub_item_block',
              label: { type: 'plain_text', text: 'Ingredient to Replace' },
              element: { type: 'plain_text_input', action_id: 'sub_input', placeholder: { type: 'plain_text', text: 'e.g., sour cream' } }
            }
          ],
          submit: { type: 'plain_text', text: 'Find Sub' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (g) Trigger Vitamin Audit (using stored inventory)
  app.action('vitamin_audit_btn', async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;
    const channelId = body.channel.id;

    const { getUserInventory } = require('./fridgeinventory');
    const items = getUserInventory(userId);

    if (items.length === 0) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: '❄️ Your fridge inventory is empty! Add items using `/fridgeinventory add` first so I can analyze vitamins.'
      });
      return;
    }

    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: `🧪 *FridgeChef AI* is performing a vitamin and nutrition audit on your fridge contents...`
    });

    try {
      const systemPrompt = `You are FridgeChef AI, an expert nutritionist.
Analyze the user's list of ingredients and identify which vital vitamins/minerals (e.g. Vitamin A, C, D, Iron, Calcium) are well-represented, and which are lacking.
Format in Slack Markdown. Use bold sections and bullet points. Do NOT use standard markdown headers (like #, ##).`;

      const prompt = `Here are the items in my fridge: ${items.join(', ')}. Please perform a Vitamin & Mineral Audit and list what nutritional value is missing.`;
      const response = await getGroqCompletion(prompt, systemPrompt);

      await client.chat.update({
        channel: channelId,
        ts: infoMessage.ts,
        text: response,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `🧪 *Fridge Vitamin & Mineral Audit:* \n\n${response}` }
          }
        ]
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (h) Action Listener for Recipe Health button (linked back to fridgecook recipe blocks)
  app.action('health_analysis_btn', async ({ ack, body, action, client }) => {
    await ack();
    await handleHealthRequest({
      client,
      channelId: body.channel.id,
      userId: body.user.id,
      ingredients: action.value,
      isButtonTriggered: true
    });
  });

  // 3. Modal Views Submissions Listeners
  
  // Allergy Modal
  app.view('allergy_modal', async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const selectedOptions = view.state.values.allergies_block?.allergies_checkboxes?.selected_options || [];
    userAllergies[userId] = selectedOptions.map(opt => opt.value);

    const meta = JSON.parse(view.private_metadata);
    if (meta.channelId && meta.messageTs) {
      await updateWellnessDashboard(client, meta.channelId, meta.messageTs, userId);
    }
  });

  // Calorie Modal
  app.view('calorie_modal', async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const cals = parseInt(view.state.values.calories_count_block?.calories_input?.value || '0', 10);
    
    calorieLogs[userId] = (calorieLogs[userId] || 0) + cals;

    const meta = JSON.parse(view.private_metadata);
    if (meta.channelId && meta.messageTs) {
      await updateWellnessDashboard(client, meta.channelId, meta.messageTs, userId);
    }
  });

  // Substitute Modal
  app.view('substitute_modal', async ({ ack, body, view, client }) => {
    await ack();
    const channelId = view.private_metadata;
    const userId = body.user.id;
    const ingredient = view.state.values.sub_item_block?.sub_input?.value || '';

    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: `🔄 *FridgeChef AI* is researching healthy substitutes for: "${ingredient}"...`
    });

    try {
      const systemPrompt = `You are FridgeChef AI, an expert dietitian.
Provide 3-4 healthy, low-calorie, or allergen-free substitutes for the requested ingredient.
Format in Slack Markdown. Use single asterisks for bolding. Do NOT use standard markdown headers.`;
      
      const prompt = `Give me healthy alternatives for: ${ingredient}`;
      const response = await getGroqCompletion(prompt, systemPrompt);

      await client.chat.update({
        channel: channelId,
        ts: infoMessage.ts,
        text: response,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `🔄 *Healthy Substitutes for "${ingredient}":* \n\n${response}` }
          }
        ]
      });
    } catch (err) {
      console.error(err);
    }
  });
};

/**
 * Builds the Wellness Dashboard blocks layout.
 */
function buildDashboardBlocks(userId) {
  const water = waterLogs[userId] || 0;
  const calories = calorieLogs[userId] || 0;
  const allergies = userAllergies[userId] || [];

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🥗 *FridgeChef AI — Personal Wellness Dashboard* for <@${userId}>\n\n` +
              `💧 *Hydration:* ${water} ml / 2000 ml  ${water >= 2000 ? '✅' : '🥤'}\n` +
              `🔥 *Calorie Intake:* ${calories} kcal / 2200 kcal\n` +
              `🌾 *Active Allergies:* ${allergies.length > 0 ? allergies.map(a => `\`${a.toUpperCase()}\``).join(', ') : '\`NONE\`'}`
      }
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: '💧 +250ml' }, action_id: 'log_water_250_btn' },
        { type: 'button', text: { type: 'plain_text', text: '💧 +500ml' }, action_id: 'log_water_500_btn' },
        { type: 'button', text: { type: 'plain_text', text: '📊 Log Calories' }, action_id: 'log_calories_btn' },
        { type: 'button', text: { type: 'plain_text', text: '🌾 Manage Allergies' }, action_id: 'manage_allergies_btn' }
      ]
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: '🔄 Substitute Finder' }, action_id: 'find_substitutes_btn' },
        { type: 'button', text: { type: 'plain_text', text: '🧪 Vitamin Fridge Audit' }, action_id: 'vitamin_audit_btn' },
        { type: 'button', text: { type: 'plain_text', text: '🧹 Reset Stats' }, action_id: 'reset_wellness_btn', style: 'danger' }
      ]
    }
  ];
}

/**
 * Sends a fresh Wellness Dashboard to the channel.
 */
async function sendWellnessDashboard(client, channelId, userId) {
  try {
    await client.chat.postMessage({
      channel: channelId,
      text: '🥗 FridgeChef AI Wellness Dashboard',
      blocks: buildDashboardBlocks(userId)
    });
  } catch (err) {
    console.error('Failed to send wellness dashboard:', err);
  }
}

/**
 * Updates an existing Wellness Dashboard message.
 */
async function updateWellnessDashboard(client, channelId, ts, userId) {
  try {
    await client.chat.update({
      channel: channelId,
      ts: ts,
      text: '🥗 FridgeChef AI Wellness Dashboard',
      blocks: buildDashboardBlocks(userId)
    });
  } catch (err) {
    console.error('Failed to update wellness dashboard:', err);
  }
}

/**
 * Core health analysis executor. Calls Groq to analyze nutritional value.
 */
async function handleHealthRequest({ client, channelId, userId, ingredients, isButtonTriggered = false }) {
  try {
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
- Use single asterisks for bold text (e.g., *this is bold*). NEVER use double asterisks.
- Do NOT use standard markdown headers (like #, ##, or ###). Instead, make headers bold with single asterisks (e.g., *🏆 Health Score:*).
- Use lists formatted with simple bullet points (•) or numbers (1., 2.).
- Use emojis to make sections visually appealing.

Your response MUST contain the following sections:
*🏆 Health Score:* (Out of 10, e.g., 8/10. Include a brief summary justification)
*📊 Macronutrient Estimates:* (Provide estimated breakdown of Protein, Carbs, and Fats in grams, as well as total calories)
*🌱 Suggestions to Make it Healthier:* (Bullet points recommending additions, subtractions, or cooking method adjustments)`;

    const prompt = `Please analyze the health and nutrition for these ingredients/meal: ${ingredients}`;
    const healthResponse = await getGroqCompletion(prompt, systemPrompt);

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
