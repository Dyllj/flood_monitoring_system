// ================================
// 🌊 FLOOD ALERT SYSTEM with SMS ALERTS
// Firebase Functions v2 + Firestore + Realtime DB + Semaphore SMS API
// ================================

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config();

admin.initializeApp();

// ✅ Helper: Send SMS via Semaphore API
async function sendSemaphoreSMS(apiKey, number, message) {
  try {
    const response = await axios.post("https://api.semaphore.co/api/v4/messages", {
      apikey: apiKey,
      number,
      message,
      sendername: "FloodAlert", // ensure this sender is configured in Semaphore account
    });
    return response.status;
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    return null;
  }
}

// ----------------------------------------------------------
// 📲 MANUAL FLOOD ALERT (callable - v1)
// ----------------------------------------------------------
exports.sendFloodAlertSMS = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { location, distance } = data;

    if (!location || distance === undefined) {
      throw new functions.https.HttpsError("invalid-argument", "Missing location or distance.");
    }

    // Prefer secrets/config in production:
    const apiKey = process.env.SEMAPHORE_API_KEY || functions.config().semaphore?.apikey;
    if (!apiKey) {
      console.error("❌ Semaphore API key not set");
      throw new functions.https.HttpsError("internal", "SMS provider not configured.");
    }

    const message = `⚠️ FLOOD ALERT ⚠️
Location: ${location}
Water Level: ${distance} cm
Status: Elevated or Critical
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;

    try {
      const personnelSnapshot = await admin.firestore().collection("Authorized_personnel").get();
      const results = [];

      for (const doc of personnelSnapshot.docs) {
        const person = doc.data();
        if (person.Phone_number) {
          const number = person.Phone_number.replace(/^0/, "63");
          const status = await sendSemaphoreSMS(apiKey, number, message);
          results.push({ contact: person.Contact_name, status });
        }
      }

      await admin.database().ref(`alerts/${location}`).set({
        alert_sent: true,
        auto_sent: false,
        distance,
        timestamp: Date.now(),
      });

      console.log("✅ Manual SMS alert sent successfully.");
      return { success: true, results };
    } catch (error) {
      console.error("❌ Error sending SMS:", error.response?.data || error.message);
      throw new functions.https.HttpsError("internal", "Failed to send SMS alert.");
    }
  });

// ----------------------------------------------------------
// ⚙️ AUTOMATIC FLOOD ALERT (Realtime DB trigger - v1)
// ----------------------------------------------------------
exports.autoFloodAlert = functions
  .region("us-central1")
  .database.ref("/realtime/{deviceName}")
  .onWrite(async (change, context) => {
    const deviceName = context.params.deviceName;
    const newData = change.after.val();
    if (!newData || newData.distance === undefined) return;

    const distance = newData.distance;
    const db = admin.database();

    if (distance < 100) {
      console.log(`✅ Normal water level for ${deviceName}: ${distance} cm`);
      return null;
    }

    console.log(`🚨 High water level detected at ${deviceName}: ${distance} cm`);

    const alertRef = db.ref(`alerts/${deviceName}`);
    const alertSnap = await alertRef.get();

    if (alertSnap.exists() && alertSnap.val().alert_sent) {
      console.log(`Alert already sent for ${deviceName}.`);
      return null;
    }

    const AUTO_DELAY = 5 * 60 * 1000; // 5 minutes
    console.log(`⏳ Scheduling auto-SMS alert in 5 minutes for ${deviceName}...`);

    setTimeout(async () => {
      const latestAlert = (await alertRef.get()).val();
      if (latestAlert && latestAlert.alert_sent) {
        console.log(`Manual alert already sent for ${deviceName}. Skipping auto alert.`);
        return;
      }

      const apiKey = process.env.SEMAPHORE_API_KEY || functions.config().semaphore?.apikey;
      const message = `⚠️ FLOOD ALERT (AUTO) ⚠️
Device: ${deviceName}
Water Level: ${distance} cm
Status: ${distance >= 180 ? "Critical" : "Elevated"}
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;

      try {
        const personnelSnap = await admin.firestore().collection("Authorized_personnel").get();
        for (const doc of personnelSnap.docs) {
          const person = doc.data();
          if (person.Phone_number) {
            const number = person.Phone_number.replace(/^0/, "63");
            await sendSemaphoreSMS(apiKey, number, message);
            console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
          }
        }

        await alertRef.set({
          alert_sent: true,
          auto_sent: true,
          distance,
          timestamp: Date.now(),
        });

        console.log(`✅ Auto alert successfully sent for ${deviceName}`);
      } catch (err) {
        console.error("❌ Auto alert failed:", err.response?.data || err.message);
      }
    }, AUTO_DELAY);

    return null;
  });
