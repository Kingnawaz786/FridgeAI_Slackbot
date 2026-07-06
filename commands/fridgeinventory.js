const { getGroqCompletion } = require('../services/groq');

/**
 * In-memory pantry database.
 * Stores items as objects:
 * {
 *   name: string,
 *   addedAt: Date,
 *   isFrozen: boolean,
 *   expiryDate: string (YYYY-MM-DD or null)
 * }
 * keyed by Slack User ID.
 */
const userInventories = {};

/**
 * Retrieve user's raw inventory array.
 * @param {string} userId
 * @returns {Array<{name: string, addedAt: Date, isFrozen: boolean, expiryDate: string|null}>}
 */
function getUserInventory(userId) {
  return userInventories[userId] || [];
}

/**
 * Registers the consolidated /fridgeinventory command and handles interactive pantry,
 * advanced expiration audits, freezer tagging, shopping list generator, and food sharing.
 */
module.exports = (app) => {

  // 1. Slash Command Listener
  app.command('/fridgeinventory', async ({ command, ack, respond, client }) => {
    await ack();

    const userId = command.user_id;
    const text = command.text.trim();
    const args = text.split(' ');
    const subCommand = args[0].toLowerCase();
    const payload = args.slice(1).join(' ').trim();

    // Directly support basic slash commands
    if (text) {
      if (subCommand === 'add') {
        if (!payload) {
          await respond({ text: '❌ *Error:* Please specify items. e.g. `/fridgeinventory add milk, eggs`', response_type: 'ephemeral' });
          return;
        }
        addItemsToInventory(userId, payload);
        await respond({ text: `✅ Added items to your inventory! Use \`/fridgeinventory\` to open the dashboard.`, response_type: 'ephemeral' });
        return;
      }
      if (subCommand === 'clear') {
        userInventories[userId] = [];
        await respond({ text: '🧹 *Fridge Cleared!* All items have been removed.', response_type: 'ephemeral' });
        return;
      }
    }

    // Default: Send Interactive Pantry Dashboard
    await sendPantryDashboard(client, command.channel_id, userId);
  });

  // 2. Action Button Listeners for Pantry Dashboard & Audits

  // (a) Add Item Modal
  app.action('add_item_btn', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'add_item_modal',
          private_metadata: JSON.stringify({ channelId: body.channel.id, messageTs: body.message?.ts }),
          title: { type: 'plain_text', text: 'Add Fridge Items ➕' },
          blocks: [
            {
              type: 'input',
              block_id: 'add_items_block',
              label: { type: 'plain_text', text: 'Items (comma separated)' },
              element: { type: 'plain_text_input', action_id: 'items_input', placeholder: { type: 'plain_text', text: 'e.g., butter, milk, onions' } }
            }
          ],
          submit: { type: 'plain_text', text: 'Add' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (b) Log Expiration Modal
  app.action('log_expiry_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const items = getUserInventory(userId);

    if (items.length === 0) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: '❌ Add some items to your fridge first before setting expiration dates!'
      });
      return;
    }

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'expiry_modal',
          private_metadata: JSON.stringify({ channelId: body.channel.id, messageTs: body.message?.ts }),
          title: { type: 'plain_text', text: 'Log Expiration ⏰' },
          blocks: [
            {
              type: 'input',
              block_id: 'expiry_item_block',
              label: { type: 'plain_text', text: 'Select Item' },
              element: {
                type: 'static_select',
                action_id: 'expiry_item_select',
                placeholder: { type: 'plain_text', text: 'Choose item' },
                options: items.map(item => ({ text: { type: 'plain_text', text: item.name }, value: item.name }))
              }
            },
            {
              type: 'input',
              block_id: 'expiry_date_block',
              label: { type: 'plain_text', text: 'Expiration Date' },
              element: { type: 'datepicker', action_id: 'expiry_datepicker', placeholder: { type: 'plain_text', text: 'Select date' } }
            }
          ],
          submit: { type: 'plain_text', text: 'Log Date' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (c) Toggle Freezer Tag Modal
  app.action('toggle_freezer_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const items = getUserInventory(userId);

    if (items.length === 0) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: '❌ Add some items to your fridge first before tagging them as frozen!'
      });
      return;
    }

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'freezer_modal',
          private_metadata: JSON.stringify({ channelId: body.channel.id, messageTs: body.message?.ts }),
          title: { type: 'plain_text', text: 'Freezer Tag ❄️' },
          blocks: [
            {
              type: 'input',
              block_id: 'freezer_block',
              label: { type: 'plain_text', text: 'Select Items in the Freezer' },
              element: {
                type: 'checkboxes',
                action_id: 'freezer_checkboxes',
                initial_options: items.filter(i => i.isFrozen).length > 0 
                  ? items.filter(i => i.isFrozen).map(i => ({ text: { type: 'plain_text', text: `❄️ ${i.name}` }, value: i.name })) 
                  : undefined,
                options: items.map(item => ({ text: { type: 'plain_text', text: `❄️ ${item.name}` }, value: item.name }))
              },
              optional: true
            }
          ],
          submit: { type: 'plain_text', text: 'Update Tags' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (d) Open Food Share Alert Modal
  app.action('share_food_btn', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'share_alert_modal',
          private_metadata: body.channel.id,
          title: { type: 'plain_text', text: 'Food Share Alert 📢' },
          blocks: [
            {
              type: 'input',
              block_id: 'share_text_block',
              label: { type: 'plain_text', text: 'What are you sharing?' },
              element: { type: 'plain_text_input', action_id: 'share_input', placeholder: { type: 'plain_text', text: 'e.g., leftover cheese pizza in the fridge' } }
            }
          ],
          submit: { type: 'plain_text', text: 'Announce!' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (e) Open Kitchen Tips Modal
  app.action('preservation_tips_btn', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'tips_modal',
          private_metadata: body.channel.id,
          title: { type: 'plain_text', text: 'Preservation Tips 💡' },
          blocks: [
            {
              type: 'input',
              block_id: 'tips_query_block',
              label: { type: 'plain_text', text: 'Ask about storing food' },
              element: { type: 'plain_text_input', action_id: 'tips_input', placeholder: { type: 'plain_text', text: 'e.g., how to keep fresh salad greens crisp' } }
            }
          ],
          submit: { type: 'plain_text', text: 'Ask AI' }
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // (f) Advanced Fridge Expiry Report
  app.action('expiry_report_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    const items = getUserInventory(userId);

    if (items.length === 0) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: '❄️ Your fridge inventory is empty! Add items using `/fridgeinventory add` first.'
      });
      return;
    }

    const now = new Date();
    const expiredList = [];
    const expiringSoonList = [];
    const freshList = [];

    items.forEach(item => {
      if (!item.expiryDate) return;
      const exp = new Date(item.expiryDate);
      const diffTime = exp - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        expiredList.push(item);
      } else if (diffDays <= 2) {
        expiringSoonList.push(item);
      } else {
        freshList.push(item);
      }
    });

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Advanced Expiration & Freshness Report* for <@${userId}>`
        }
      }
    ];

    if (expiredList.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔴 *Expired Items:* \n` + expiredList.map(e => `• *${e.name}* (Expired on ${e.expiryDate})`).join('\n')
        }
      });
      
      // Add quick actions for expired items
      blocks.push({
        type: 'actions',
        elements: expiredList.map(e => ({
          type: 'button',
          text: { type: 'plain_text', text: `🗑️ Discard ${e.name}` },
          value: e.name,
          action_id: `discard_expired_btn`
        })).slice(0, 5) // Limit to 5 buttons max to avoid block kit limits
      });
    }

    if (expiringSoonList.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🟡 *Expiring Soon (within 48 hours):* \n` + expiringSoonList.map(e => `• *${e.name}* (Exp: ${e.date || e.expiryDate})`).join('\n')
        }
      });
    }

    const untracked = items.filter(i => !i.expiryDate);
    if (untracked.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚪ *Shelf Life Untracked:* \n` + untracked.map(i => `• *${i.name}* (added ${new Date(i.addedAt).toLocaleDateString()})`).join('\n')
        }
      });
    }

    if (expiredList.length === 0 && expiringSoonList.length === 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🟢 *Congratulations!* All tracked items in your fridge are fresh and healthy.`
        }
      });
    }

    await client.chat.postMessage({
      channel: channelId,
      text: '⏰ Advanced Expiration Report',
      blocks: blocks
    });
  });

  // Action: Discard Expired Item
  app.action('discard_expired_btn', async ({ ack, body, action, client }) => {
    await ack();
    const userId = body.user.id;
    const itemName = action.value;

    const items = getUserInventory(userId);
    userInventories[userId] = items.filter(i => i.name.toLowerCase() !== itemName.toLowerCase());

    // Update message or send confirmation
    await client.chat.postMessage({
      channel: body.channel.id,
      text: `🗑️ <@${userId}> discarded expired *"${itemName}"* from their fridge.`
    });
  });

  // (i) Advanced Fridge Audit
  app.action('fridge_audit_btn', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    const items = getUserInventory(userId);

    if (items.length === 0) {
      await client.chat.postEphemeral({
        channel: channelId,
        user: userId,
        text: '❌ Fridge is empty. Nothing to audit!'
      });
      return;
    }

    // Filter items added more than 1 minute ago (to simulate older items in testing/audits)
    const now = Date.now();
    const auditThreshold = 60 * 1000; // 1 minute threshold for easy testing demonstration
    const olderItems = items.filter(item => (now - new Date(item.addedAt).getTime()) > auditThreshold);

    // If no "old" items, select 2 random items to check anyway
    const itemsToAudit = olderItems.length > 0 ? olderItems.slice(0, 2) : items.slice(0, 2);

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔍 *Fridge Pantry Audit* for <@${userId}>:\nLet's verify if you have already eaten or discarded these older items to keep your inventory clean:`
        }
      }
    ];

    itemsToAudit.forEach(item => {
      blocks.push(
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `❓ Have you finished: *${item.name}* (Added: ${new Date(item.addedAt).toLocaleDateString()})?` }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Yes, Eaten/Gone' },
              style: 'primary',
              value: item.name,
              action_id: 'audit_eaten_btn'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ No, Still there' },
              value: item.name,
              action_id: 'audit_keep_btn'
            }
          ]
        }
      );
    });

    await client.chat.postMessage({
      channel: channelId,
      text: '🔍 Fridge Pantry Audit',
      blocks: blocks
    });
  });

  // Action: Audit Eaten (Remove item)
  app.action('audit_eaten_btn', async ({ ack, body, action, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    const itemName = action.value;

    const items = getUserInventory(userId);
    userInventories[userId] = items.filter(i => i.name.toLowerCase() !== itemName.toLowerCase());

    // Update message or send confirmation thread
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: body.message.ts,
      text: `✅ Removed *"${itemName}"* from inventory. Thank you for keeping your fridge clean!`
    });
  });

  // Action: Audit Keep (Keep item)
  app.action('audit_keep_btn', async ({ ack, body, action, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    const itemName = action.value;

    await client.chat.postMessage({
      channel: channelId,
      thread_ts: body.message.ts,
      text: `👍 Kept *"${itemName}"* in your fridge.`
    });
  });

  // 3. Modal Views Submissions Listeners
  
  // Add Items View Submit
  app.view('add_item_modal', async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const input = view.state.values.add_items_block?.items_input?.value || '';
    
    addItemsToInventory(userId, input);

    const meta = JSON.parse(view.private_metadata);
    if (meta.channelId && meta.messageTs) {
      await updatePantryDashboard(client, meta.channelId, meta.messageTs, userId);
    }
  });

  // Log Expiry View Submit
  app.view('expiry_modal', async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const item = view.state.values.expiry_item_block?.expiry_item_select?.selected_option?.value;
    const date = view.state.values.expiry_date_block?.expiry_datepicker?.selected_date;

    if (item && date) {
      const items = getUserInventory(userId);
      const target = items.find(i => i.name.toLowerCase() === item.toLowerCase());
      if (target) {
        target.expiryDate = date;
      }
    }

    const meta = JSON.parse(view.private_metadata);
    if (meta.channelId && meta.messageTs) {
      await updatePantryDashboard(client, meta.channelId, meta.messageTs, userId);
    }
  });

  // Freezer tag View Submit
  app.view('freezer_modal', async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const selected = (view.state.values.freezer_block?.freezer_checkboxes?.selected_options || []).map(opt => opt.value);
    
    const items = getUserInventory(userId);
    items.forEach(item => {
      item.isFrozen = selected.includes(item.name);
    });

    const meta = JSON.parse(view.private_metadata);
    if (meta.channelId && meta.messageTs) {
      await updatePantryDashboard(client, meta.channelId, meta.messageTs, userId);
    }
  });
};

/**
 * Mutation helper to add items as objects.
 */
function addItemsToInventory(userId, payload) {
  const itemsToAdd = payload
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);

  if (!userInventories[userId]) {
    userInventories[userId] = [];
  }

  itemsToAdd.forEach(name => {
    // Check if item already exists to avoid duplicates
    const exists = userInventories[userId].some(i => i.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      userInventories[userId].push({
        name: name,
        addedAt: new Date(),
        isFrozen: false,
        expiryDate: null
      });
    }
  });
}

/**
 * Builds Pantry Dashboard blocks.
 */
function buildPantryBlocks(userId) {
  const items = getUserInventory(userId);

  // Format list items
  const formattedItems = items.map((item, idx) => {
    const isFrozen = item.isFrozen ? ' ❄️ (Frozen)' : '';
    const expiryText = item.expiryDate ? ` ⏰ (Expires: ${item.expiryDate})` : '';
    return `${idx + 1}. *${item.name}*${isFrozen}${expiryText}`;
  });

  // Calculate soonest expiry
  const now = new Date();
  const soonExpiring = items.filter(i => {
    if (!i.expiryDate) return false;
    const expDate = new Date(i.expiryDate);
    const diffTime = expDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  });

  let alertsText = '🟢 *No items expiring soon!*';
  if (soonExpiring.length > 0) {
    alertsText = `⚠️ *Expiring within 48 Hours:*\n` + soonExpiring.map(i => `• *${i.name}* (Exp: ${i.expiryDate})`).join('\n');
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `❄️ *FridgeChef AI — Pantry & Inventory Hub* for <@${userId}>\n\n` +
              `📦 *Current Inventory:* (${items.length} items)\n` +
              (formattedItems.length > 0 ? formattedItems.join('\n') : '_Your fridge is empty! Use buttons below to stock it up._')
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: alertsText
      }
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: '➕ Add Items' }, action_id: 'add_item_btn' },
        { type: 'button', text: { type: 'plain_text', text: '⏰ Set Expiry' }, action_id: 'log_expiry_btn' },
        { type: 'button', text: { type: 'plain_text', text: '❄️ Freezer Tag' }, action_id: 'toggle_freezer_btn' },
        { type: 'button', text: { type: 'plain_text', text: '🛒 Shopping List' }, action_id: 'shopping_list_btn' }
      ]
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: '📢 Post Food Share' }, action_id: 'share_food_btn' },
        { type: 'button', text: { type: 'plain_text', text: '💡 Preservation Tips' }, action_id: 'preservation_tips_btn' },
        { type: 'button', text: { type: 'plain_text', text: '⏰ Expiry Report' }, action_id: 'expiry_report_btn' },
        { type: 'button', text: { type: 'plain_text', text: '🔍 Audit Fridge' }, action_id: 'fridge_audit_btn' }
      ]
    }
  ];
}

async function sendPantryDashboard(client, channelId, userId) {
  try {
    await client.chat.postMessage({
      channel: channelId,
      text: '❄️ FridgeChef AI Pantry Inventory',
      blocks: buildPantryBlocks(userId)
    });
  } catch (err) {
    console.error(err);
  }
}

async function updatePantryDashboard(client, channelId, ts, userId) {
  try {
    await client.chat.update({
      channel: channelId,
      ts: ts,
      text: '❄️ FridgeChef AI Pantry Inventory',
      blocks: buildPantryBlocks(userId)
    });
  } catch (err) {
    console.error(err);
  }
}

/**
 * Integrated shopping list executor (formerly /fridgeshop).
 */
async function handleShopRequest({ client, channelId, userId, ingredients }) {
  try {
    const infoMessage = await client.chat.postMessage({
      channel: channelId,
      text: `🛒 Compiling the shopping checklist for <@${userId}>...`
    });

    const systemPrompt = `You are FridgeChef AI, a smart kitchen planner. Suggest 1-2 meals and list missing items.
Format response in Slack Markdown. Use bolding. No # headers.
At the very end of your response, add a divider and list only the missing ingredients as a comma-separated list.
Example format:
=== MISSING ITEMS ===
Milk, Butter, Tomatoes`;

    const prompt = `Here are the ingredients I currently have: ${ingredients}. Help me identify missing ingredients, substitutes, and estimated shopping costs for a meal.`;
    const shopResponse = await getGroqCompletion(prompt, systemPrompt);

    const parts = shopResponse.split('=== MISSING ITEMS ===');
    const contentText = parts[0].trim();
    const rawItems = parts[1] ? parts[1].trim() : '';
    const missingItems = rawItems.split(',').map(item => item.trim()).filter(item => item.length > 0 && !item.toLowerCase().includes('none'));

    const responseBlocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `🛒 *FridgeChef AI Shopping Plan* (Requested by <@${userId}>):\n\n${contentText}` }
      }
    ];

    if (missingItems.length > 0) {
      const limitedItems = missingItems.slice(0, 10);
      responseBlocks.push(
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: `*Interactive Shopping Checklist:*` } },
        {
          type: 'actions',
          block_id: 'shop_checklist_block',
          elements: [
            {
              type: 'checkboxes',
              action_id: 'shop_item_check',
              options: limitedItems.map((item, idx) => ({ text: { type: 'plain_text', text: item }, value: `item_${idx}` }))
            }
          ]
        },
        {
          type: 'context',
          block_id: 'shop_footer_block',
          elements: [{ type: 'mrkdwn', text: `🛒 Checked off *0* of *${limitedItems.length}* items.` }]
        }
      );
    }

    await client.chat.update({
      channel: channelId,
      ts: infoMessage.ts,
      text: contentText,
      blocks: responseBlocks
    });

  } catch (error) {
    console.error('Error generating shopping list:', error);
  }
}

// Export internal helper so fridgecook can access user's stored inventory list
module.exports.getUserInventory = (userId) => getUserInventory(userId).map(i => i.name);
