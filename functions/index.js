// ================================
// 🌊 FLOOD ALERT SYSTEM with SMS ALERTS
// Using: Firebase Functions + Firestore + Realtime DB + Semaphore SMS API
// =====================================

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// ✅ Initialize Firebase Admin SDK
// Gives access to Firestore, Realtime DB, and Functions Config (for API keys)
admin.initializeApp();


// ----------------------------------------------------------
// 🧩 HELPER FUNCTION — Send SMS via Semaphore API
// This function handles the API call to Semaphore and logs results/errors.
// ----------------------------------------------------------
async function sendSemaphoreSMS(apiKey, number, message) {
  try {
    const response = await axios.post("https://api.semaphore.co/api/v4/messages", {
      apikey: apiKey,
      number,
      message,
      sendername: "FloodAlert",
    });
    return response.status; // HTTP 200 if successful
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    return null; // Return null for failed sends
  }
}


// ----------------------------------------------------------
// 📲 MANUAL FLOOD ALERT (Triggered by Admin click)
// Function Type: HTTPS Callable
// Triggered when the admin manually clicks "Send Alert" in the dashboard UI.
// ----------------------------------------------------------
exports.sendFloodAlertSMS = functions.https.onCall(async (data, context) => {
  const { location, distance } = data;

  // ✅ Validate input data
  if (!location || !distance) {
    throw new functions.https.HttpsError("invalid-argument", "Missing location or distance.");
  }

  const apiKey = functions.config().semaphore.apikey; // Retrieve API key stored in Firebase Config
  const message = `⚠️ FLOOD ALERT ⚠️
Location: ${location}
Water Level: ${distance} cm
Status: Elevated or Critical
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;

  try {
    // ✅ Fetch all authorized personnel from Firestore
    const personnelSnapshot = await admin.firestore().collection("Authorized_personnel").get();
    const results = [];

    // ✅ Loop through all personnel and send SMS alerts
    for (const doc of personnelSnapshot.docs) {
      const person = doc.data();
      if (person.Phone_number) {
        // Convert local number (e.g., 0912...) → international format (63912...)
        const number = person.Phone_number.replace(/^0/, "63");
        const status = await sendSemaphoreSMS(apiKey, number, message);
        results.push({ contact: person.Contact_name, status });
      }
    }

    // ✅ Log the alert into Realtime Database
    await admin.database().ref(`alerts/${location}`).set({
      alert_sent: true,    // Admin sent manually
      auto_sent: false,    // Not auto-sent
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
// ⚙️ AUTOMATIC FLOOD ALERT (Triggered by Database Updates)
// Function Type: Realtime Database Trigger
// Triggered when sensor data updates under /realtime/{deviceName}.
// If no manual alert is sent after 5 minutes, this auto-sends SMS alerts.
// ----------------------------------------------------------
exports.autoFloodAlert = functions.database
  .ref("/realtime/{deviceName}")
  .onWrite(async (change, context) => {
    const deviceName = context.params.deviceName; // The sensor device ID
    const newData = change.after.val();            // Latest sensor reading

    // ✅ Ensure there’s new data and it has a distance value
    if (!newData || !newData.distance) return null;

    const distance = newData.distance;
    const db = admin.database();

    // ✅ Threshold condition (you can adjust this value)
    if (distance < 100) {
      console.log(`✅ Normal water level for ${deviceName}: ${distance} cm`);
      return null; // No alert if safe
    }

    console.log(`🚨 High water level detected at ${deviceName}: ${distance} cm`);

    const alertRef = db.ref(`alerts/${deviceName}`);
    const alertSnap = await alertRef.get();

    // ✅ Prevent duplicate alerts (don’t send if one already exists)
    if (alertSnap.exists() && alertSnap.val().alert_sent) {
      console.log(`Alert already sent for ${deviceName}.`);
      return null;
    }

    // ----------------------------------------------------------
    // 🕒 Delay mechanism — Wait for 5 minutes before sending auto alert
    // If admin manually sends alert during this time, auto alert is cancelled.
    // ----------------------------------------------------------
    const AUTO_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds
    console.log(`⏳ Scheduling auto-SMS alert in 5 minutes for ${deviceName}...`);

    setTimeout(async () => {
      // Check latest alert status after delay
      const latestAlert = (await alertRef.get()).val();

      // ✅ Skip if admin already sent manual alert
      if (latestAlert && latestAlert.alert_sent) {
        console.log(`Manual alert already sent for ${deviceName}. Skipping auto alert.`);
        return;
      }

      const apiKey = functions.config().semaphore.apikey;
      const message = `⚠️ FLOOD ALERT (AUTO) ⚠️
Device: ${deviceName}
Water Level: ${distance} cm
Status: ${distance >= 180 ? "Critical" : "Elevated"}
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;

      try {
        // ✅ Get all authorized personnel again and send the auto alert
        const personnelSnap = await admin.firestore().collection("Authorized_personnel").get();

        for (const doc of personnelSnap.docs) {
          const person = doc.data();
          if (person.Phone_number) {
            const number = person.Phone_number.replace(/^0/, "63");
            await sendSemaphoreSMS(apiKey, number, message);
            console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
          }
        }

        // ✅ Log auto alert into the database
        await alertRef.set({
          alert_sent: true,   // Alert sent (auto)
          auto_sent: true,    // Mark as automatic
          distance,
          timestamp: Date.now(),
        });

        console.log(`✅ Auto alert successfully sent for ${deviceName}`);
      } catch (err) {
        console.error("❌ Auto alert failed:", err.response?.data || err.message);
      }
    }, AUTO_DELAY); // ⏱ Execute after 5 minutes delay
  });
