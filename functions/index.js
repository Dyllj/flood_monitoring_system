/* eslint-env node */
const functions = require("firebase-functions");
const axios = require("axios");

const TELEGRAM_BOT_TOKEN = functions.config().telegram.bot_token;
const TELEGRAM_CHAT_ID = functions.config().telegram.chat_id;

exports.sendTelegramAlert = functions.https.onRequest(async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).send("Missing message text");
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    });

    console.log("✅ Telegram alert sent successfully!");
    res.status(200).send("Telegram alert sent successfully!");
  } catch (error) {
    console.error("❌ Error sending Telegram alert:", error.message);
    res.status(500).send("Error sending Telegram alert.");
  }
});
