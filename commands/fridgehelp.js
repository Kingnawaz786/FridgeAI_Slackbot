/**
 * Registers the /fridgehelp slash command.
 * Provides an interactive, beautiful help guide for FridgeChef AI.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  app.command('/fridgehelp', async ({ command, ack, respond }) => {
    await ack();

    const helpBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🍳 *FridgeChef AI — Help Guide & Command Directory* 🍳\n` +
                `Welcome! FridgeChef AI is your smart kitchen assistant. Here is a guide to utilizing all of its features. We have consolidated our services into *3 core command hubs*:`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*1. 🍳 \`/fridgecook [ingredients]\` — The Recipe Hub*\n` +
                `• *Direct Use:* Type ingredients directly (e.g. \`/fridgecook chicken, pasta\`) to get an instant recipe.\n` +
                `• *Pantry Integration:* Type \`/fridgecook\` with *no arguments* to automatically cook using your saved inventory list!\n` +
                `• *Interactive Modal:* If your saved inventory is empty, running \`/fridgecook\` opens an interactive menu where you can filter by *Meal Types* (Air Fryer, Baking, Kids, Microwave, Smoothie, etc.) and *Dietary Preferences* (Vegan, Vegetarian, Keto, Gluten-Free) or toggle the *Leftover Optimizer*!`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*2. 🥗 \`/fridgehealth [meal/ingredients]\` — The Wellness Hub*\n` +
                `• *Direct Use:* Type a meal or ingredient list (e.g. \`/fridgehealth pepperoni pizza\`) to analyze calories, macronutrients, and get a health score out of 10.\n` +
                `• *Wellness Dashboard:* Run \`/fridgehealth\` with *no arguments* to open your personal tracker. Log daily water intake (with quick \`+250ml\`/\`+500ml\` buttons), track meal calories, manage allergies, find healthy substitutes, or run a *Vitamin Audit* on your fridge!`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*3. ❄️ \`/fridgeinventory [add/clear] [items]\` — Pantry & Shopping Hub*\n` +
                `• *Direct Use:* Add items quickly (e.g. \`/fridgeinventory add milk, eggs\`) or empty the fridge using \`/fridgeinventory clear\`.\n` +
                `• *Pantry Dashboard:* Type \`/fridgeinventory\` with *no arguments* to view your stock. Set expiration dates, tag freezer items, compile aisle-by-aisle shopping lists (with interactive checkoff lists), broadcast *Food Share Alerts* to the channel, or run a proactive *Fridge Pantry Audit*!`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🤖 *Other Ways to Interact:*\n` +
                `• *Mentions:* Mention \`<@FridgeChef AI> chicken, onion\` in a channel event to trigger recipe threads.\n` +
                `• *Action Buttons:* Any recipe block you generate comes with quick buttons to automatically analyze health or build shopping checklists.`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `💡 *Tip:* All data is currently stored in-memory. Clearing your server will reset logs.`
          }
        ]
      }
    ];

    await respond({
      text: '🍳 FridgeChef AI Command Directory',
      blocks: helpBlocks,
      response_type: 'ephemeral' // Keep help guides private to the user to prevent channel clutter
    });
  });
};
