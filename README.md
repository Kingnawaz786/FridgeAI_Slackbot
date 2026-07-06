# FridgeChef AI 🍳🥗🛒

FridgeChef AI is an interactive, Node.js-based Slack Bot that helps users figure out what to cook with whatever ingredients they have left in their fridge. Powered by the high-performance **Groq API (Llama 3.3)** and built using the **Slack Bolt SDK in Socket Mode**, this application serves as an excellent submission for college projects or showcase portfolios.

With **Socket Mode** enabled, the bot establishes a secure WebSocket connection directly to Slack. This removes the need for public HTTP tunnels (like ngrok or tunnelmole) during local development!

---

## 🚀 Features

### 1. Slash Commands
- **`/fridgecook [ingredients]`**  
  Suggests a creative recipe including recipe name, ingredients used, step-by-step cooking instructions, prep/cook time, and estimated calories. Running this command without arguments opens an **interactive Slack modal form** where you can select common items via checkboxes, write custom ingredients, and apply dietary filters.
  
- **`/fridgehealth [ingredients/meal]`**  
  Provides a health score (out of 10), estimated macronutrient content (protein, carbs, fats), and constructive suggestions to make the meal healthier.
  
- **`/fridgeshop [ingredients]`**  
  Identifies missing ingredients to complete standard meals, suggests clever substitutions, and estimates the shopping cost. It renders an **interactive checkbox shopping list** where you can mark items as purchased directly in Slack.

### 2. App Mentions & Channel History
- **Direct Mentions (`@FridgeAI`):**  
  Mentions in public channels trigger a recipe suggestion thread. For example: `@FridgeChef AI eggs, toast, cheddar`.
- **Block Kit Chaining:**  
  All recipe outputs (commands and mentions) come with **"Analyze Health"** and **"Get Shopping List"** buttons to run follow-up actions dynamically.

---

## 🛠️ Tech Stack

- **Backend Runtime:** Node.js
- **Slack SDK:** `@slack/bolt` (Socket Mode)
- **AI Inference Engine:** Groq Cloud SDK (`groq-sdk` with `llama-3.3-70b-versatile` model)
- **Environment Management:** `dotenv`
- **Health check Server:** Express (runs on port 3000 to keep cloud instances warm)

---

## 📂 Project Structure

```text
fridgechef-slack/
│
├── commands/
│   ├── fridgecook.js      # Handler for /fridgecook command & Modal
│   ├── fridgehealth.js    # Handler for /fridgehealth command & health buttons
│   └── fridgeshop.js      # Handler for /fridgeshop command & interactive checklists
│
├── services/
│   └── groq.js            # Reusable Groq API wrapper service
│
├── .env                   # Local secrets (ignored in Git)
├── .env.example           # Example configuration template
├── app.js                 # Socket Mode app & Express health check
├── package.json           # Dependency management and scripts
├── DEVLOG.md              # Project version devlog
└── README.md              # Project documentation (This file)
```

---

## ⚙️ Local Installation

### 1. Check Node.js
Ensure you have Node.js (version 18 or above) installed.
```bash
node -v
```

### 2. Install Dependencies
Run the installation command in the project folder:
```bash
npm install
```

---

## 🤖 Slack App Setup Guide (Socket Mode & Events)

To connect the bot to Slack using Socket Mode:

### Step 1: Create an App
1. Go to [Slack API: Your Apps](https://api.slack.com/apps).
2. Click **Create New App** -> Select **From scratch**.
3. Name your app `FridgeChef AI` and select your development Slack Workspace.

### Step 2: Enable Socket Mode & App-Level Token
1. Go to **Settings -> Basic Information** in the left sidebar.
2. Scroll down to **App-Level Tokens** and click **Generate Token**.
3. Name the token `SocketModeToken`, add the `connections:write` scope, and click **Generate**.
4. **Copy the App-Level Token** (starts with `xapp-`). You will put this in your `.env` file as `SLACK_APP_LEVEL_TOKEN`.
5. Go to **Settings -> Socket Mode** in the left sidebar and toggle **Enable Socket Mode** to **On**.

### Step 3: Configure Slash Commands
1. In the left sidebar under *Features*, click **Slash Commands** and click **Create New Command**:
   - **Command:** `/fridgecook` (Short Description: *Suggests recipes based on available ingredients.*)
   - **Command:** `/fridgehealth` (Short Description: *Analyzes the nutritional health of ingredients.*)
   - **Command:** `/fridgeshop` (Short Description: *Suggests missing ingredients, substitutes, and costs.*)
2. *Note: With Socket Mode enabled, you do NOT need to fill in a Request URL. Slack will route these commands through the socket automatically!*

### Step 4: Configure OAuth Scopes & Event Subscriptions
1. Go to **Features -> OAuth & Permissions**:
   - Scroll down to *Scopes* -> **Bot Token Scopes** and add:
     - `commands` (Required for slash commands)
     - `chat:write` (Allows the bot to send messages)
     - `app_mentions:read` (Required to view messages that mention the bot)
     - `channels:history` (Required to view message logs in channels the bot is added to)
2. Go to **Features -> Event Subscriptions**:
   - Toggle **Enable Events** to **On**.
   - Under **Subscribe to bot events**, click **Add Bot User Event** and select `app_mention`.
   - Click **Save Changes**.

### Step 5: Install App to Workspace
1. Go back to **OAuth & Permissions**.
2. Click **Install to Workspace** and authorize it.
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`). You will put this in your `.env` file as `SLACK_BOT_TOKEN`.
4. Copy the **Signing Secret** from **Settings -> Basic Information** and save it in your `.env` file as `SLACK_SIGNING_SECRET`.

---

## 💻 Local Development

### 1. Configure `.env`
Create a `.env` file in the root folder (based on `.env.example`) and populate the keys:
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_APP_LEVEL_TOKEN=xapp-your-app-level-token
GROQ_API_KEY=gsk_your_groq_api_key
PORT=3000
```

### 2. Start the Bot
Run the project in development mode:
```bash
npm run dev
```
You should see:
```text
📡 Express health check server listening on port 3000
⚡️ FridgeChef AI is running in Socket Mode!
```
The bot is now connected to Slack! You can trigger `/fridgecook` or mention `@FridgeChef AI` in a channel.

---

## 💡 Expanded Command Ideas (For Future Updates)

If you are looking to make this project even more advanced, here are some command ideas you can add:

1. **`/fridgeinventory`**
   Allows users to add, view, and remove items currently stored in their physical fridge. This acts as a persistent digital inventory so they don't have to re-type ingredients every time.
   - *Example:* `/fridgeinventory add 1L Milk, 6 Eggs` or `/fridgeinventory list`

2. **`/fridgeexpire`**
   Tracks expiration dates of ingredients. Users can log expiration dates, and the bot will send automated warnings when items are 1–2 days away from spoiling, recommending recipes specifically to use up those expiring items first.
   - *Example:* `/fridgeexpire milk 2026-07-10`

3. **`/fridgeshare`**
   Integrates social cooking features. Lets roommates or team members list things they want to share (e.g., "I have extra parsley going to waste, come grab it!"). It sends a community alert to coordinates food sharing.

4. **`/fridgetips`**
   Provides AI-generated kitchen hacks, food preservation tips, and advice on how to properly store specific produce (e.g. how to keep cilantro fresh for weeks).

---

## ☁️ Deploying on Render (24/7 Hosting)

Since the bot uses Socket Mode, it doesn't need external webhooks, but Render still requires web apps to bind to a port:

1. Push your project code to a private GitHub repository (make sure `.env` is ignored by `.gitignore`).
2. Log in to [Render](https://render.com/).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the settings:
   - **Name:** `fridgechef-slack-bot`
   - **Language:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Add the environment variables (`SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_LEVEL_TOKEN`, `GROQ_API_KEY`, `PORT`) in Render's configuration tab.
7. Click **Deploy**. Render will start the Express health server on port 3000, and Bolt will connect to the Slack WebSocket connection, keeping your bot online 24/7!
