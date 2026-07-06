/**
 * Registers the /fridgeshare slash command.
 * Helps roommates/co-workers share leftover ingredients or meals in the channel.
 * @param {import('@slack/bolt').App} app - The Slack Bolt Application instance.
 */
module.exports = (app) => {
  app.command('/fridgeshare', async ({ command, ack, respond, client }) => {
    await ack();

    const shareDescription = command.text.trim();

    // 1. Validate empty input
    if (!shareDescription) {
      await respond({
        text: '❌ *Error:* Please describe what you want to share. \nExample: `/fridgeshare I have half a box of pepperoni pizza in the fridge, come grab it!`',
        response_type: 'ephemeral'
      });
      return;
    }

    try {
      const userId = command.user_id;
      const channelId = command.channel_id;

      // 2. Post a beautifully formatted announcement using Block Kit
      await client.chat.postMessage({
        channel: channelId,
        text: `📢 Food Share Alert from <@${userId}>!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📢 *Food Share Alert from <@${userId}>!*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `> "${shareDescription}"`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📍 *Location:* Shared Fridge / Counter | 📅 *Posted:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '🍴 I want this!'
                },
                value: shareDescription,
                action_id: 'claim_share_btn'
              }
            ]
          }
        ]
      });

    } catch (error) {
      console.error('Error in /fridgeshare command:', error);
      await respond({
        text: `⚠️ *Error posting share alert:* ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  });

  // 3. Register button handler for claiming shared food
  app.action('claim_share_btn', async ({ ack, body, action, client }) => {
    await ack();

    const userId = body.user.id;
    const channelId = body.channel.id;
    const ts = body.message.ts;

    // Retrieve original poster and share details
    const originalBlocks = body.message.blocks;
    const headerText = originalBlocks[0]?.text?.text || `Food Share Alert`;
    const shareContent = originalBlocks[1]?.text?.text || `""`;

    try {
      // Update original message to show it has been claimed, disabling the button
      await client.chat.update({
        channel: channelId,
        ts: ts,
        text: `🍽️ Shared food claimed!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `~~${headerText}~~`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `~~${shareContent}~~`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `✅ *Claimed by <@${userId}>!* 🍽️`
              }
            ]
          }
        ]
      });

      // Send a thread reply confirming the claim
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: ts,
        text: `🍽️ <@${userId}> has claimed this food! Enjoy your meal!`
      });

    } catch (error) {
      console.error('Error claiming share:', error);
    }
  });
};
