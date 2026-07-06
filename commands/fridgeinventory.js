// In-memory database to store ingredients, keyed by Slack User ID
const userInventories = {};

/**
 * Helper function to retrieve a user's inventory.
 * Can be imported by other commands (like /fridgecook) to cook with saved items.
 * @param {string} userId - The Slack user ID.
 * @returns {string[]} Array of ingredients.
 */
function getUserInventory(userId) {
  return userInventories[userId] || [];
}

/**
 * Registers the /fridgeinventory slash command and handles in-memory inventory management.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  app.command('/fridgeinventory', async ({ command, ack, respond }) => {
    await ack();

    const userId = command.user_id;
    const text = command.text.trim();
    const args = text.split(' ');
    const subCommand = args[0].toLowerCase();
    const payload = args.slice(1).join(' ').trim();

    // Default action if no sub-command is specified (show list)
    if (!text || subCommand === 'list' || subCommand === 'show') {
      const items = getUserInventory(userId);
      if (items.length === 0) {
        await respond({
          text: '❄️ *Your Fridge is Empty!* \nAdd items using: `/fridgeinventory add egg, milk, cheese`',
          response_type: 'ephemeral'
        });
      } else {
        await respond({
          text: `❄️ *Your Fridge Inventory (${items.length} items):*\n${items.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n*Tip:* Run \`/fridgecook\` with no parameters to generate a recipe from this list!`,
          response_type: 'ephemeral'
        });
      }
      return;
    }

    // 1. ADD Subcommand
    if (subCommand === 'add') {
      if (!payload) {
        await respond({
          text: '❌ *Error:* Please specify ingredients to add. \nExample: `/fridgeinventory add milk, eggs, chicken`',
          response_type: 'ephemeral'
        });
        return;
      }

      const itemsToAdd = payload
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);

      if (!userInventories[userId]) {
        userInventories[userId] = [];
      }

      userInventories[userId].push(...itemsToAdd);
      
      // Deduplicate items
      userInventories[userId] = [...new Set(userInventories[userId])];

      await respond({
        text: `✅ Added *${itemsToAdd.length}* item(s) to your fridge! \nUse \`/fridgeinventory list\` to view your updated inventory.`,
        response_type: 'ephemeral'
      });
      return;
    }

    // 2. REMOVE Subcommand
    if (subCommand === 'remove' || subCommand === 'delete') {
      if (!payload) {
        await respond({
          text: '❌ *Error:* Please specify an item name to remove. \nExample: `/fridgeinventory remove milk`',
          response_type: 'ephemeral'
        });
        return;
      }

      const currentItems = getUserInventory(userId);
      if (currentItems.length === 0) {
        await respond({
          text: '❄️ Your fridge is already empty.',
          response_type: 'ephemeral'
        });
        return;
      }

      const itemToRemove = payload.toLowerCase();
      // Match by exact or partial name
      const updatedItems = currentItems.filter(item => item.toLowerCase() !== itemToRemove);

      if (updatedItems.length === currentItems.length) {
        await respond({
          text: `🔍 Could not find *"${payload}"* in your fridge inventory.`,
          response_type: 'ephemeral'
        });
      } else {
        userInventories[userId] = updatedItems;
        await respond({
          text: `🗑️ Removed *"${payload}"* from your fridge inventory.`,
          response_type: 'ephemeral'
        });
      }
      return;
    }

    // 3. CLEAR Subcommand
    if (subCommand === 'clear' || subCommand === 'empty') {
      userInventories[userId] = [];
      await respond({
        text: '🧹 *Fridge Cleared!* All items have been removed.',
        response_type: 'ephemeral'
      });
      return;
    }

    // Fallback if sub-command is invalid
    await respond({
      text: '❓ *Unknown sub-command.* Available actions:\n- `/fridgeinventory list` (shows items)\n- `/fridgeinventory add [items]` (adds items)\n- `/fridgeinventory remove [item]` (removes an item)\n- `/fridgeinventory clear` (removes all items)',
      response_type: 'ephemeral'
    });
  });
};

// Export userInventories mapping and helper for integration with other commands
module.exports.getUserInventory = getUserInventory;
