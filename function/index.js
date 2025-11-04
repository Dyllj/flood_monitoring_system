// ================================
// 🌊 FLOOD ALERT SYSTEM with SMS ALERTS
// Firebase Functions v2 + Firestore + Realtime DB + Semaphore SMS API
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");
require("dotenv").config();

admin.initializeApp(); // ✅ Initialize Firebase Admin SDK
const db = admin.firestore(); // Firestore instance

// ================================================================
// 🔹 Helper Function: Send SMS using Semaphore API
// ================================================================
/**
 * Sends an SMS message using the Semaphore API.
 *
 * @param {string} apiKey - Your Semaphore API key.
 * @param {string} number - Recipient’s phone number in PH format (63XXXXXXXXXX).
 * @param {string} message - The message content to send.
 * @returns {number|null} HTTP status code if successful, null otherwise.
 */
async function sendSemaphoreSMS(apiKey, number, message) {
  try {
    const response = await axios.post("https://api.semaphore.co/api/v4/messages", {
      apikey: apiKey,
      number,
      message,
      sendername: process.env.SENDER_NAME || "MolaveFlood", // Optional sender name
    });
    return response.status;
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    return null;
  }
}

// ================================================================
// 🔹 Helper Function: Determine flood status from distance
// ================================================================
/**
 * Determines the flood status based on the water level distance (in cm).
 *
 * @param {number} distance - The measured water level distance.
 * @returns {string} - "Normal", "Elevated", or "Critical".
 */
function getStatus(distance) {
  if (distance >= 400) return "Critical";
  if (distance >= 200) return "Elevated";
  return "Normal";
}

// ================================================================
// 🔸 Function 1: MANUAL FLOOD ALERT (Triggered by Admin/User)
// ================================================================
/**
 * Sends a manual flood alert via SMS to all authorized personnel.
 * Triggered by a callable Cloud Function (usually from an admin dashboard).
 *
 * Firestore Collections Used:
 * - devices → to get sensor details
 * - Authorized_personnel → to get recipients
 * - Alert_logs → to record sent alerts
 * 
 * Realtime DB Path:
 * - alerts/{sensorName} → stores real-time alert status
 */
exports.sendFloodAlertSMS = onCall({ region: "us-central1" }, async (request) => {
  // ✅ Extract parameters from request
  const { location: reqLocation, distance, sensorName: reqSensorName } = request.data;

  // ✅ Validate required parameters
  if (distance === undefined || !reqSensorName) {
    throw new HttpsError("invalid-argument", "Missing required parameters: distance or sensorName.");
  }

  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) throw new HttpsError("internal", "SMS provider not configured properly.");

  // ✅ Retrieve device info from Firestore (optional enhancement)
  let location = reqLocation;
  let sensorName = reqSensorName;

  const deviceDoc = await admin.firestore().collection("devices").doc(sensorName).get();
  if (deviceDoc.exists) {
    const data = deviceDoc.data();
    location = location || data.location || "Unknown";
    sensorName = data.sensorName || sensorName;
  }

  const status = getStatus(distance);
  const roundedDistance = Math.round(distance); // ✅ Convert to whole number

  // ✅ SMS Message Content
  const message = 
`🚨 FLOOD ALERT (MANUAL NOTICE)
A flood alert has been triggered manually.

📍 Location: ${location}
🛰️ Sensor: ${sensorName}
📏 Water Level: ${roundedDistance} cm
📊 Status: ${status}
⏰ Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}

Please verify the situation immediately and take appropriate safety measures.

- Sent by Molave Flood Monitoring System`;

  console.log("📨 Sending manual SMS alert with message:\n", message);

  try {
    // ✅ Fetch all authorized personnel
    const personnelSnap = await admin.firestore().collection("Authorized_personnel").get();
    if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

    const results = [];

    // ✅ Send SMS to each contact
    for (const doc of personnelSnap.docs) {
      const person = doc.data();
      if (person.Phone_number) {
        const number = person.Phone_number.replace(/^0/, "63"); // Convert PH format
        const statusCode = await sendSemaphoreSMS(apiKey, number, message);
        results.push({ name: person.Contact_name, status: statusCode });
      }
    }

    // ✅ Log to Realtime Database
    await admin.database().ref(`alerts/${sensorName}`).set({
      alert_sent: true,
      auto_sent: false,
      distance: roundedDistance,
      location,
      status,
      timestamp: Date.now(),
    });

    // ✅ Log to Firestore Alert_logs
    await admin.firestore().collection("Alert_logs").add({
      type: "Manual",
      location,
      sensorName,
      distance: roundedDistance,
      status,
      timestamp: FieldValue.serverTimestamp(),
      message,
    });

    console.log(`✅ Manual SMS alert sent successfully for ${sensorName}`);
    return { success: true, results };

  } catch (error) {
    console.error("❌ Error sending manual alert:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to send SMS alert.");
  }
});

// ================================================================
// 🔸 Function 2: AUTOMATIC FLOOD ALERT (Triggered by Realtime DB)
// ================================================================
/**
 * Automatically sends a flood alert when the water level exceeds a threshold.
 * Triggered whenever Realtime Database value changes at /realtime/{deviceName}.
 *
 * Firestore Collections Used:
 * - devices → to fetch sensor info (location, name)
 * - Authorized_personnel → to get contact list
 * - Alert_logs → to record automatic alerts
 * 
 * Realtime DB Path:
 * - alerts/{deviceName} → records last alert sent
 */
exports.autoFloodAlert = onValueWritten(
  {
    ref: "/realtime/{deviceName}", // Watches this DB path for changes
    region: "us-central1",
  },
  async (event) => {
    // ✅ Extract sensor data
    const deviceName = event.params.deviceName;
    const newData = event.data.after.val();

    if (!newData || newData.distance === undefined) return;

    const distance = newData.distance;
    const roundedDistance = Math.round(distance); // ✅ Convert to whole number
    const db = admin.database();
    const status = getStatus(distance);

    // ✅ Skip alert if water level is Normal
    if (status === "Normal") {
      console.log(`✅ Normal water level for ${deviceName}: ${roundedDistance} cm`);
      return null;
    }

    console.log(`🚨 High water level detected at ${deviceName}: ${roundedDistance} cm (${status})`);

    // ✅ Prevent duplicate alerts (avoid spamming)
    const alertRef = db.ref(`alerts/${deviceName}`);
    const alertSnap = await alertRef.get();
    if (alertSnap.exists() && alertSnap.val().alert_sent) {
      console.log(`ℹ️ Alert already sent for ${deviceName}. Skipping duplicate.`);
      return null;
    }

    const apiKey = process.env.SEMAPHORE_API_KEY;

    try {
      // ✅ Get device details from Firestore
      const deviceDoc = await admin.firestore().collection("devices").doc(deviceName).get();
      const deviceData = deviceDoc.exists ? deviceDoc.data() : {};
      const location = deviceData.location || "Unknown";
      const sensorName = deviceData.sensorName || deviceName;

      // ✅ SMS Message Content for automatic alerts
      const message = 
`⚠️ AUTOMATIC FLOOD ALERT ⚠️
An automatic alert has been detected by the flood monitoring system.

📍 Location: ${location}
🛰️ Sensor: ${sensorName}
📏 Water Level: ${roundedDistance} cm
📊 Status: ${status}
⏰ Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}

Please assess the area immediately and implement necessary safety precautions.

- Sent by Molave Flood Monitoring System`;

      console.log("📨 Sending automatic SMS alert with message:\n", message);

      // ✅ Send SMS to all authorized personnel
      const personnelSnap = await admin.firestore().collection("Authorized_personnel").get();
      for (const doc of personnelSnap.docs) {
        const person = doc.data();
        if (person.Phone_number) {
          const number = person.Phone_number.replace(/^0/, "63");
          await sendSemaphoreSMS(apiKey, number, message);
          console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
        }
      }

      // ✅ Log automatic alert to Realtime Database
      await alertRef.set({
        alert_sent: true,
        auto_sent: true,
        distance: roundedDistance,
        location,
        status,
        timestamp: Date.now(),
      });

      // ✅ Log to Firestore Alert_logs
      await admin.firestore().collection("Alert_logs").add({
        type: "Automatic",
        location,
        sensorName,
        distance: roundedDistance,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      console.log(`✅ Automatic alert successfully sent for ${sensorName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.response?.data || err.message);
    }

    return null;
  }
);
