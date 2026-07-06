const { getGroqCompletion } = require('../services/groq');

/**
 * Registers the /fridgeshop slash command, shopping list buttons, and checkbox action listeners.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  
  // 1. Slash Command Listener
  app.command('/fridgeshop', async ({ command, ack, respond, client }) => {
    await ack();

    const ingredients = command.text.trim();

    if (!ingredients) {
      await respond({
        text: '❌ *Error:* Please enter the ingredients you currently have. \nExample: `/fridgeshop chicken, garlic, pasta`',
        response_type: 'ephemeral'
      });
      return;
    }

    await handleShopRequest({
      client,
      channelId: command.channel_id,
      userId: command.user_id,
      ingredients
    });
  });

  // 2. Action Button Listener (triggered from the /fridgecook recipe block)
  app.action('shopping_list_btn', async ({ ack, body, action, client }) => {
    await ack();

    const ingredients = action.value; // Retrieved from the button value
    const channelId = body.channel.id;
    const userId = body.user.id;

    await handleShopRequest({
      client,
      channelId,
      userId,
      ingredients,
      isButtonTriggered: true
    });
  });

  // 3. Checkbox Action Listener for the interactive shopping checklist
  app.action('shop_item_check', async ({ ack, body, client }) => {
    // Acknowledge the interaction
    await ack();

    const selectedOptions = body.actions[0].selected_options || [];
    const checkedItems = selectedOptions.map(opt => opt.text.text);
    
    // We can update the helper text at the bottom to show how many items are purchased
    const totalItemsCount = body.message.blocks.find(b => b.block_id === 'shop_checklist_block')?.element?.options?.length || 0;
    
    let footerText = `🛒 Checked off *${checkedItems.length}* of *${totalItemsCount}* items.`;
    if (checkedItems.length === totalItemsCount && totalItemsCount > 0) {
      footerText = `🎉 *All ingredients purchased! Time to cook!* 🍳`;
    }

    // Clone blocks and update the footer block text
    const updatedBlocks = body.message.blocks.map(block => {
      if (block.block_id === 'shop_footer_block') {
        return {
          type: 'context',
          block_id: 'shop_footer_block',
          elements: [
            {
              type: 'mrkdwn',
              text: footerText
            }
          ]
        };
      }
      return block;
    });

    try {
      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        text: body.message.text,
        blocks: updatedBlocks
      });
    } catch (error) {
      console.error('Failed to update checkbox status footer:', error);
    }
  });
};

/**
 * Common shopping list processor. Parses response, extracts missing items,
 * and builds a checklist using Slack Block Kit Checkboxes.
 */
async function handleShopRequest({ client, channelId, userId, ingredients, isButtonTriggered = false }) {
  try {
    const statusText = isButtonTriggered 
      ? `🛒 Compiling the shopping checklist for <@${userId}>...`
      : `🛒 *FridgeChef AI* is compiling a shopping list for: "${ingredients}" for <@${userId}>...`;

    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: statusText
    });

    const systemPrompt = `You are FridgeChef AI, a smart kitchen planner and shopping assistant.
Analyze the user's available ingredients and suggest 1-2 meals they can make if they purchase a few missing items.
Format your response in Slack Markdown.

Your response MUST contain the following sections:
*💡 Suggested Meals & Missing Ingredients:* (Suggest 1-2 meals, list missing items clearly)
*🔄 Optional Substitutes:* (Offer direct ingredient substitutions for the items they already have)
*💵 Estimated Shopping Cost:* (Provide a cost breakdown and total estimated cost in USD)

CRITICAL INSTRUCTION FOR EXTRACTING ITEMS:
At the very end of your response, add a divider and list only the missing ingredients as a comma-separated list for a checkbox interface.
Example format:
=== MISSING ITEMS ===
Milk, Butter, Shredded Cheese, Tomatoes`;

    const prompt = `Here are the ingredients I currently have: ${ingredients}. Help me identify missing ingredients, substitutes, and estimated shopping costs for a meal.`;
    const shopResponse = await getGroqCompletion(prompt, systemPrompt);

    // Parse the response to extract missing items for checkboxes
    const parts = shopResponse.split('=== MISSING ITEMS ===');
    const contentText = parts[0].trim();
    const rawItems = parts[1] ? parts[1].trim() : '';
    
    // Split and clean missing items
    const missingItems = rawItems
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0 && !item.toLowerCase().includes('none'));

    // Build the blocks payload
    const responseBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🛒 *FridgeChef AI Shopping Plan* (Requested by <@${userId}>):\n\n${contentText}`
        }
      }
    ];

    // If we have missing items, add an interactive checklist
    if (missingItems.length > 0) {
      // Limit to max 10 checkboxes to prevent exceeding Slack Block Kit limits
      const limitedItems = missingItems.slice(0, 10);
      
      responseBlocks.push(
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Interactive Shopping Checklist:*`
          }
        },
        {
          type: 'actions',
          block_id: 'shop_checklist_block',
          elements: [
            {
              type: 'checkboxes',
              action_id: 'shop_item_check',
              options: limitedItems.map((item, idx) => ({
                text: {
                  type: 'plain_text',
                  text: item
                },
                value: `item_${idx}`
              }))
            }
          ]
        },
        {
          type: 'context',
          block_id: 'shop_footer_block',
          elements: [
            {
              type: 'mrkdwn',
              text: `🛒 Checked off *0* of *${limitedItems.length}* items.`
            }
          ]
        }
      );
    }

    // Update the message with Block Kit including action buttons
    await client.chat.update({
      channel: channelId,
      ts: infoMessage.ts,
      text: contentText,
      blocks: responseBlocks
    });

  } catch (error) {
    console.error('Error in shopping list generation:', error);
    try {
      await client.chat.postMessage({
        channel: channelId,
        text: `⚠️ *FridgeChef AI Error:* Failed to generate the shopping checklist. (Error: ${error.message})`
      });
    } catch (err) {
      console.error(err);
    }
  }
}
