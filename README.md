# FridgeChef AI 🍳🥗🛒

FridgeChef AI is a Node.js-based Slack Bot that helps users figure out what to cook with whatever ingredients they have left in their fridge. Powered by the high-performance **Groq API (Llama 3.3)** and built using the **Slack Bolt SDK**, this application serves as an excellent submission for college projects or showcase portfolios.

---

## 🚀 Features

The bot exposes three primary slash commands in Slack:

1. **`/fridgecook [ingredients]`**  
   Suggests a creative recipe including recipe name, ingredients used, step-by-step cooking instructions, prep/cook time, and estimated calories.
   
2. **`/fridgehealth [ingredients/meal]`**  
   Provides a health score (out of 10), estimated macronutrient content (protein, carbs, fats), and constructive suggestions to make the meal healthier.
   
3. **`/fridgeshop [ingredients]`**  
   Identifies missing ingredients to complete standard meals, suggests clever substitutions for ingredients you already have, and estimates the shopping cost.

---

## 🛠️ Tech Stack

- **Backend Runtime:** Node.js
- **Server Framework:** Express (via Slack Bolt's built-in `ExpressReceiver`)
- **Slack SDK:** `@slack/bolt`
- **AI Inference Engine:** Groq Cloud SDK (`groq-sdk` with `llama-3.3-70b-versatile` model)
- **Environment Management:** `dotenv`

---

## 📂 Project Structure

```text
fridgechef-slack/
│
├── commands/
│   ├── fridgecook.js      # Handler for /fridgecook command
│   ├── fridgehealth.js    # Handler for /fridgehealth command
│   └── fridgeshop.js      # Handler for /fridgeshop command
│
├── services/
│   └── groq.js            # Reusable Groq API wrapper service
│
├── .env                   # Local secrets (ignored in Git)
├── .env.example           # Example configuration template
├── app.js                 # Application entrypoint & Bolt server
├── package.json           # Dependency management and scripts
└── README.md              # Project documentation (This file)
```

---

## ⚙️ Prerequisites & Installation

### 1. Install Node.js
Ensure you have Node.js (version 18 or above) installed on your system. You can check your version by running:
```bash
node -v
```

### 2. Clone and Install Dependencies
Navigate into your project folder and run the installation command:
```bash
npm install
```

---

## 🤖 Slack App Setup Guide

To connect the bot to Slack, you need to create a Slack App:

1. **Create an App:**
   - Go to [Slack API: Your Apps](https://api.slack.com/apps).
   - Click **Create New App** -> Select **From scratch**.
   - Name your app `FridgeChef AI` and select your development Slack Workspace.

2. **Configure Slash Commands:**
   - In the left sidebar under *Features*, click **Slash Commands**.
   - Create the following three commands:
     - **Command:** `/fridgecook`
       - **Request URL:** `https://<YOUR_TEMPORARY_DOMAIN>/slack/events`
       - **Short Description:** Suggests recipes based on available ingredients.
     - **Command:** `/fridgehealth`
       - **Request URL:** `https://<YOUR_TEMPORARY_DOMAIN>/slack/events`
       - **Short Description:** Analyzes the nutritional health of ingredients.
     - **Command:** `/fridgeshop`
       - **Request URL:** `https://<YOUR_TEMPORARY_DOMAIN>/slack/events`
       - **Short Description:** Suggests missing ingredients, substitutes, and costs.
   - Click **Save**.

3. **Install App & Get Credentials:**
   - Go to **Basic Information** under *Settings*:
     - Scroll down to **App Credentials** and copy the **Signing Secret**.
   - Go to **OAuth & Permissions** under *Features*:
     - Scroll down to *Scopes* -> **Bot Token Scopes** and add:
       - `commands` (Required to respond to slash commands)
       - `chat:write` (Allows the bot to send messages)
     - Scroll back up and click **Install to Workspace**.
     - Copy the **Bot User OAuth Token** (starts with `xoxb-`).

---

## 🔑 Groq API Setup

1. Sign up/Log in to the [Groq Console](https://console.groq.com/).
2. Navigate to **API Keys** in the sidebar.
3. Click **Create API Key**, name it `FridgeChef-Slack`, and copy the key (starts with `gsk_`).

---

## 💻 Local Development & Testing

Slack requires a public HTTPS URL to forward slash command events to your local machine. We use **ngrok** to tunnel traffic.

### Step 1: Configure `.env`
Create a `.env` file in the root folder (based on `.env.example`) and populate the keys:
```env
SLACK_BOT_TOKEN=xoxb-your-copied-bot-token
SLACK_SIGNING_SECRET=your-copied-signing-secret
GROQ_API_KEY=gsk_your_groq_api_key
PORT=3000
```

### Step 2: Start the Local Server
Run the project in development mode:
```bash
npm run dev
```
The server will start listening on port `3000`.

### Step 3: Run ngrok
Expose port 3000 to the public web:
```bash
# If you have ngrok installed globally
ngrok http 3000
```
Copy the secure `https://` forwarding URL provided by ngrok (e.g., `https://a1b2-34-56-78.ngrok-free.app`).

### Step 4: Update Slack Command URLs
Go back to the **Slash Commands** section of your app settings on the [Slack API Portal](https://api.slack.com/apps), edit each command, and set the **Request URL** to:
`https://<YOUR_NGROK_URL>/slack/events` (e.g., `https://a1b2-34-56-78.ngrok-free.app/slack/events`).

Now, go to your Slack Workspace and test the commands:
- `/fridgecook cheese, egg, pasta`
- `/fridgehealth spinach, salmon, olive oil`
- `/fridgeshop beef, lettuce`

---

## ☁️ Deploying on Render (24/7 Online Hosting)

To deploy your Slack bot to the cloud on **Render** so it runs permanently without running your local computer:

### Step 1: Push Code to GitHub
Create a new GitHub repository and push your project code. Make sure `.env` is **not** pushed (it should be automatically ignored).

### Step 2: Create a Web Service on Render
1. Log in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the settings:
   - **Name:** `fridgechef-slack-bot`
   - **Language:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or Starter)

### Step 3: Add Environment Variables
Scroll down to the **Environment** section (or click the Env Groups/Variables tab) and add the following variables:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `GROQ_API_KEY`
- `PORT` (set to `3000` or let Render set it dynamically)

### Step 4: Update Slack Request URLs
Once Render finishes deploying, it will generate a public URL for your web service (e.g., `https://fridgechef-slack-bot.onrender.com`).
Go to your **Slack API Console** -> **Slash Commands** -> Edit all commands -> Update the Request URL to:
`https://fridgechef-slack-bot.onrender.com/slack/events`

*Note: Since you are using Render's Free tier, the web service spins down after 15 minutes of inactivity. The first slash command you trigger after a long time might fail due to a 3-second timeout while Render spins back up. To prevent this, you can use a free pinging service (like UptimeRobot) to ping `https://fridgechef-slack-bot.onrender.com/health` every 10 minutes to keep it warm.*
