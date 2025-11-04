// index.js
const express = require("express");
const admin = require("firebase-admin");
const axios = require("axios");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();
const firestoreDb = admin.firestore();
const rtdb = admin.database();

// Environment variables
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = process.env.SENDER_NAME || "MolaveFlood";

if (!SEMAPHORE_API_KEY) {
  console.warn("⚠️ SEMAPHORE_API_KEY is not set. SMS sending will fail!");
}

// Helper to send SMS via Semaphore
async function sendSemaphoreSMS(number, message) {
  try {
    const response = await axios.post(
      "https://api.semaphore.co/api/v4/messages",
      {
        apikey: SEMAPHORE_API_KEY,
        number,
        message,
        sendername: SENDER_NAME,
      }
    );
    console.log(`✅ SMS sent to ${number}`);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    return null;
  }
}

// Helper to determine flood status
function getStatus(distance) {
  if (distance >= 400) return "Critical";
  if (distance >= 200) return "Elevated";
  return "Normal";
}

// Express app
const app = express();
app.use(express.json());

/////////////////////////
// MANUAL ALERT
/////////////////////////
app.post("/sendFloodAlertSMS", async (req, res) => {
  const { location: reqLocation, distance, sensorName: reqSensorName } = req.body;

  if (!reqSensorName || distance === undefined) {
    return res.status(400).json({ error: "Missing required parameters: distance or sensorName." });
  }

  try {
    let location = reqLocation;
    let sensorName = reqSensorName;

    const deviceDoc = await firestoreDb.collection("devices").doc(sensorName).get();
    if (deviceDoc.exists) {
      const data = deviceDoc.data();
      location = location || data.location || "Unknown";
      sensorName = data.sensorName || sensorName;
    }

    const status = getStatus(distance);
    const roundedDistance = Math.round(distance);

    const message = `🚨 FLOOD ALERT (MANUAL NOTICE)
📍 Location: ${location}
🛰️ Sensor: ${sensorName}
📏 Water Level: ${roundedDistance} cm
📊 Status: ${status}
⏰ Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}

- Sent by ${SENDER_NAME}`;

    console.log("📨 Sending manual SMS alert:", message);

    const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
    if (personnelSnap.empty) {
      return res.status(404).json({ error: "No authorized personnel found." });
    }

    const results = await Promise.all(
      personnelSnap.docs.map(async (doc) => {
        const person = doc.data();
        if (person.Phone_number) {
          const number = person.Phone_number.replace(/^0/, "63");
          const smsResponse = await sendSemaphoreSMS(number, message);
          return { name: person.Contact_name, smsResponse };
        }
        return null;
      })
    );

    // Update Realtime Database
    await rtdb.ref(`alerts/${sensorName}`).set({
      alert_sent: true,
      auto_sent: false,
      distance: roundedDistance,
      location,
      status,
      timestamp: Date.now(),
    });

    // Log to Firestore
    await firestoreDb.collection("Alert_logs").add({
      type: "Manual",
      location,
      sensorName,
      distance: roundedDistance,
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message,
    });

    console.log(`✅ Manual alert sent successfully for ${sensorName}`);
    return res.json({ success: true, results });
  } catch (err) {
    console.error("❌ Manual alert error:", err.message);
    return res.status(500).json({ error: "Failed to send manual alert." });
  }
});

/////////////////////////
// AUTOMATIC ALERT
/////////////////////////
app.post("/autoFloodAlert", async (req, res) => {
  const { deviceName, distance } = req.body;

  if (!deviceName || distance === undefined) {
    return res.status(400).json({ error: "Missing required parameters: deviceName or distance." });
  }

  const roundedDistance = Math.round(distance);
  const status = getStatus(distance);

  if (status === "Normal") {
    console.log(`✅ Normal water level for ${deviceName}: ${roundedDistance} cm`);
    return res.json({ message: "Normal water level. No alert sent." });
  }

  console.log(`🚨 High water level detected at ${deviceName}: ${roundedDistance} cm (${status})`);

  const alertRef = rtdb.ref(`alerts/${deviceName}`);
  const alertSnap = await alertRef.once("value");
  if (alertSnap.exists() && alertSnap.val().alert_sent) {
    console.log(`ℹ️ Alert already sent for ${deviceName}. Skipping duplicate.`);
    return res.json({ message: "Alert already sent. Skipped duplicate." });
  }

  try {
    const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
    const deviceData = deviceDoc.exists ? deviceDoc.data() : {};
    const location = deviceData.location || "Unknown";
    const sensorName = deviceData.sensorName || deviceName;

    const message = `⚠️ AUTOMATIC FLOOD ALERT ⚠️
📍 Location: ${location}
🛰️ Sensor: ${sensorName}
📏 Water Level: ${roundedDistance} cm
📊 Status: ${status}
⏰ Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}

- Sent by ${SENDER_NAME}`;

    console.log("📨 Sending automatic SMS alert:", message);

    const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
    await Promise.all(
      personnelSnap.docs.map(async (doc) => {
        const person = doc.data();
        if (person.Phone_number) {
          const number = person.Phone_number.replace(/^0/, "63");
          await sendSemaphoreSMS(number, message);
          console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
        }
      })
    );

    // Update Realtime Database
    await alertRef.set({
      alert_sent: true,
      auto_sent: true,
      distance: roundedDistance,
      location,
      status,
      timestamp: Date.now(),
    });

    // Log to Firestore
    await firestoreDb.collection("Alert_logs").add({
      type: "Automatic",
      location,
      sensorName,
      distance: roundedDistance,
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message,
    });

    console.log(`✅ Automatic alert successfully sent for ${sensorName}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Automatic alert failed:", err.message);
    return res.status(500).json({ error: "Failed to send automatic alert." });
  }
});

// Export as Cloud Function (v2) using Express
exports.sendFloodAlertSMSApp = onRequest(app);
