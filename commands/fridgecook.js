const { getGroqCompletion } = require('../services/groq');

/**
 * Registers the /fridgecook slash command, modal submissions, and button actions.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  
  // 1. Slash Command Listener
  app.command('/fridgecook', async ({ command, ack, body, client }) => {
    await ack();

    const ingredients = command.text.trim();

    // IF no ingredients are provided, open an Interactive Block Kit Modal
    if (!ingredients) {
      try {
        await client.views.open({
          trigger_id: body.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'fridgecook_modal',
            private_metadata: command.channel_id, // Pass channel ID to access during view submission
            title: {
              type: 'plain_text',
              text: 'FridgeChef AI 🍳'
            },
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'Select your available ingredients and dietary preferences below:'
                }
              },
              {
                type: 'input',
                block_id: 'ingredients_select_block',
                label: {
                  type: 'plain_text',
                  text: 'Common Ingredients'
                },
                element: {
                  type: 'checkboxes',
                  action_id: 'ingredients_checkboxes',
                  options: [
                    { text: { type: 'plain_text', text: '🥚 Eggs' }, value: 'eggs' },
                    { text: { type: 'plain_text', text: '🍗 Chicken' }, value: 'chicken' },
                    { text: { type: 'plain_text', text: '🧀 Cheese' }, value: 'cheese' },
                    { text: { type: 'plain_text', text: '🥦 Broccoli' }, value: 'broccoli' },
                    { text: { type: 'plain_text', text: '🍚 Rice' }, value: 'rice' },
                    { text: { type: 'plain_text', text: '🍞 Bread' }, value: 'bread' }
                  ]
                },
                optional: true
              },
              {
                type: 'input',
                block_id: 'ingredients_custom_block',
                label: {
                  type: 'plain_text',
                  text: 'Other Ingredients (comma separated)'
                },
                element: {
                  type: 'plain_text_input',
                  action_id: 'ingredients_text',
                  placeholder: {
                    type: 'plain_text',
                    text: 'e.g., tomatoes, garlic, onion'
                  }
                },
                optional: true
              },
              {
                type: 'input',
                block_id: 'diet_block',
                label: {
                  type: 'plain_text',
                  text: 'Dietary Preference'
                },
                element: {
                  type: 'static_select',
                  action_id: 'diet_select',
                  placeholder: {
                    type: 'plain_text',
                    text: 'Select preference'
                  },
                  options: [
                    { text: { type: 'plain_text', text: '🥬 Vegetarian' }, value: 'vegetarian' },
                    { text: { type: 'plain_text', text: '🌱 Vegan' }, value: 'vegan' },
                    { text: { type: 'plain_text', text: '🥩 Keto' }, value: 'keto' },
                    { text: { type: 'plain_text', text: '🌾 Gluten-Free' }, value: 'gluten-free' }
                  ]
                },
                optional: true
              }
            ],
            submit: {
              type: 'plain_text',
              text: 'Generate Recipe 🍳'
            },
            close: {
              type: 'plain_text',
              text: 'Cancel'
            }
          }
        });
      } catch (error) {
        console.error('Error opening interactive modal:', error);
      }
      return;
    }

    // Otherwise, process the text input immediately
    await handleRecipeRequest({
      client,
      channelId: command.channel_id,
      userId: command.user_id,
      ingredients,
      diet: null,
      respond: null
    });
  });

  // 2. Interactive Modal Submission Listener
  app.view('fridgecook_modal', async ({ ack, body, view, client }) => {
    // Acknowledge the modal submission immediately
    await ack();

    const channelId = view.private_metadata;
    const userId = body.user.id;

    // Retrieve input values from modal state
    const custom = view.state.values.ingredients_custom_block?.ingredients_text?.value || '';
    const checkedOptions = view.state.values.ingredients_select_block?.ingredients_checkboxes?.selected_options || [];
    const checked = checkedOptions.map(opt => opt.value);
    const diet = view.state.values.diet_block?.diet_select?.selected_option?.value || null;

    const allIngredientsList = [...checked];
    if (custom.trim()) {
      allIngredientsList.push(...custom.split(',').map(s => s.trim()));
    }
    const ingredients = allIngredientsList.filter(Boolean).join(', ');

    if (!ingredients) {
      // Send ephemeral error message via Slack client
      try {
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: '❌ *Error:* You must select or enter at least one ingredient!'
        });
      } catch (err) {
        console.error('Failed to post validation error:', err);
      }
      return;
    }

    await handleRecipeRequest({
      client,
      channelId,
      userId,
      ingredients,
      diet
    });
  });
};

/**
 * Common recipe request processor. Generates the prompt, calls Groq,
 * and formats the result with Block Kit action buttons.
 */
async function handleRecipeRequest({ client, channelId, userId, ingredients, diet }) {
  try {
    // Notify channel or user that cooking is in progress
    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: `🍳 *FridgeChef AI* is compiling a recipe for <@${userId}> with: "${ingredients}"...`
    });

    const systemPrompt = `You are FridgeChef AI, a professional chef.
Analyze the user's list of ingredients and suggest a recipe they can make.

CRITICAL SLACK MARKDOWN RULES:
- Use single asterisks for bold text (e.g., *this is bold*). NEVER use double asterisks (e.g., **this is wrong**).
- Do NOT use standard markdown headers (like #, ##, or ###). Instead, make headers bold with single asterisks (e.g., *⭐ Recipe Name:*).
- Use lists formatted with simple bullet points (•) or numbers (1., 2.).
- Use emojis to make sections visually appealing.

Your response MUST contain the following sections:
*⭐ Recipe Name:* (Make it catchy)
*🛒 Ingredients Used:* (Mention quantities, highlight items from their list)
*📝 Step-by-step Instructions:* (Numbered list, clear and easy to follow)
*⏱️ Cooking Time:* (Prep time and cook time)
*🔥 Estimated Calories:* (Approximate calories per serving)`;

    let prompt = `Here are my available ingredients: ${ingredients}.`;
    if (diet) {
      prompt += ` Please adapt this recipe to be strictly: ${diet}.`;
    }
    prompt += ` Please suggest a recipe.`;

    const recipeResponse = await getGroqCompletion(prompt, systemPrompt);

    // Update the message with Block Kit including action buttons
    await client.chat.update({
      channel: channelId,
      ts: infoMessage.ts,
      text: recipeResponse,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🍳 *FridgeChef AI* has a recipe recommendation for <@${userId}>:\n\n${recipeResponse}`
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
              value: ingredients, // Pass the ingredients so the button handler knows what to analyze
              action_id: 'health_analysis_btn'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🛒 Get Shopping List'
              },
              value: ingredients,
              action_id: 'shopping_list_btn'
            }
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Error generating recipe:', error);
    try {
      await client.chat.postMessage({
        channel: channelId,
        text: `⚠️ *FridgeChef AI Error:* Failed to generate a recipe. (Error: ${error.message})`
      });
    } catch (err) {
      console.error(err);
    }
  }
}
