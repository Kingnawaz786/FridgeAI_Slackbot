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

    // IF no ingredients are provided, check if they have saved items in their inventory
    if (!ingredients) {
      const { getUserInventory } = require('./fridgeinventory');
      const savedItems = getUserInventory(command.user_id);

      // If they have saved items, cook using the inventory immediately!
      if (savedItems && savedItems.length > 0) {
        await handleRecipeRequest({
          client,
          channelId: command.channel_id,
          userId: command.user_id,
          ingredients: savedItems.join(', '),
          diet: null
        });
        return;
      }

      // Otherwise, fall back to opening the Interactive Block Kit Modal
      try {
        await client.views.open({
          trigger_id: body.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'fridgecook_modal',
            private_metadata: command.channel_id, // Pass channel ID to access during view submission
            title: {
              type: 'plain_text',
              text: 'Recipe Hub 🍳'
            },
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'Customize your AI recipe planning using your fridge contents:'
                }
              },
              {
                type: 'input',
                block_id: 'ingredients_select_block',
                label: {
                  type: 'plain_text',
                  text: 'Select Available Ingredients'
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
                    text: 'e.g., tomatoes, garlic, onion, butter'
                  }
                },
                optional: true
              },
              {
                type: 'input',
                block_id: 'meal_type_block',
                label: {
                  type: 'plain_text',
                  text: 'Meal / Recipe Type'
                },
                element: {
                  type: 'static_select',
                  action_id: 'meal_type_select',
                  placeholder: {
                    type: 'plain_text',
                    text: 'Select Recipe Style'
                  },
                  options: [
                    { text: { type: 'plain_text', text: '⏱️ Quick (under 15 mins)' }, value: 'quick' },
                    { text: { type: 'plain_text', text: '🍲 Standard Dinner' }, value: 'standard' },
                    { text: { type: 'plain_text', text: '🍰 Dessert / Baking' }, value: 'bake' },
                    { text: { type: 'plain_text', text: '🥤 Smoothie / Shake' }, value: 'smoothie' },
                    { text: { type: 'plain_text', text: '🧸 Kids Menu' }, value: 'kids' },
                    { text: { type: 'plain_text', text: '🎈 Party Platter / Large Group' }, value: 'party' },
                    { text: { type: 'plain_text', text: '⚡ Microwave Mug Meal' }, value: 'microwave' },
                    { text: { type: 'plain_text', text: '🍟 Air Fryer Recipe' }, value: 'airfry' }
                  ]
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
                    text: 'Select diet preference'
                  },
                  options: [
                    { text: { type: 'plain_text', text: '🥬 Vegetarian' }, value: 'vegetarian' },
                    { text: { type: 'plain_text', text: '🌱 Vegan' }, value: 'vegan' },
                    { text: { type: 'plain_text', text: '🥩 Keto' }, value: 'keto' },
                    { text: { type: 'plain_text', text: '🌾 Gluten-Free' }, value: 'gluten-free' }
                  ]
                },
                optional: true
              },
              {
                type: 'input',
                block_id: 'leftover_opt_block',
                label: {
                  type: 'plain_text',
                  text: 'Leftover Optimizer'
                },
                element: {
                  type: 'checkboxes',
                  action_id: 'leftover_opt_check',
                  options: [
                    {
                      text: {
                        type: 'plain_text',
                        text: 'Combine weird leftover ingredients creatively'
                      },
                      value: 'optimize'
                    }
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
      mealType: 'standard',
      optimizeLeftovers: false
    });
  });

  // 2. Interactive Modal Submission Listener
  app.view('fridgecook_modal', async ({ ack, body, view, client }) => {
    await ack();

    const channelId = view.private_metadata;
    const userId = body.user.id;

    // Retrieve input values from modal state
    const custom = view.state.values.ingredients_custom_block?.ingredients_text?.value || '';
    const checkedOptions = view.state.values.ingredients_select_block?.ingredients_checkboxes?.selected_options || [];
    const checked = checkedOptions.map(opt => opt.value);
    
    const mealType = view.state.values.meal_type_block?.meal_type_select?.selected_option?.value || 'standard';
    const diet = view.state.values.diet_block?.diet_select?.selected_option?.value || null;
    const optimizeLeftovers = (view.state.values.leftover_opt_block?.leftover_opt_check?.selected_options || []).length > 0;

    const allIngredientsList = [...checked];
    if (custom.trim()) {
      allIngredientsList.push(...custom.split(',').map(s => s.trim()));
    }
    const ingredients = allIngredientsList.filter(Boolean).join(', ');

    if (!ingredients) {
      try {
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: '❌ *Error:* You must select or enter at least one ingredient!'
        });
      } catch (err) {
        console.error(err);
      }
      return;
    }

    await handleRecipeRequest({
      client,
      channelId,
      userId,
      ingredients,
      diet,
      mealType,
      optimizeLeftovers
    });
  });
};

/**
 * Common recipe request processor. Generates the prompt, calls Groq,
 * and formats the result with Block Kit action buttons.
 */
async function handleRecipeRequest({ client, channelId, userId, ingredients, diet, mealType = 'standard', optimizeLeftovers = false }) {
  try {
    // Notify channel that cooking is in progress
    const statusText = `🍳 *FridgeChef AI* is compiling a *${mealType}* recipe for <@${userId}> using: "${ingredients}"...`;
    
    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: statusText
    });

    const systemPrompt = `You are FridgeChef AI, a professional chef.
Suggest a recipe matching the user's specific recipe style, dietary restrictions, and ingredients.

CRITICAL SLACK MARKDOWN RULES:
- Use single asterisks for bold text (e.g., *this is bold*). NEVER use double asterisks.
- Do NOT use standard markdown headers (like #, ##, or ###). Instead, use bold text (e.g., *⭐ Recipe Name:*).
- Use lists formatted with simple bullet points (•) or numbers (1., 2.).
- Use emojis to make sections visually appealing.

Your response MUST contain the following sections:
*⭐ Recipe Name:* (Make it catchy)
*📋 Recipe Style:* (e.g., Quick 15-min, Air Fryer, Dessert, Kids Menu)
*🛒 Ingredients Used:* (Mention quantities, highlight items from their list)
*📝 Step-by-step Instructions:* (Numbered list, clear and easy to follow)
*⏱️ Cooking Time:* (Prep time and cook time)
*🔥 Estimated Calories:* (Approximate calories per serving)`;

    let prompt = `Here are my available ingredients: ${ingredients}.`;
    prompt += ` Recipe Style request: ${mealType.toUpperCase()} meal.`;
    if (diet) {
      prompt += ` Dietary Preference: Adapt this recipe to be strictly ${diet}.`;
    }
    if (optimizeLeftovers) {
      prompt += ` Special Instruction: This is a Leftover Optimization. Be extremely creative in combining the ingredients even if they seem mismatched, and ensure it tastes delicious.`;
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
            text: `🍳 *FridgeChef AI* Recipe suggestion for <@${userId}>:\n\n${recipeResponse}`
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
