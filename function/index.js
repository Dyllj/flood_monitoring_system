// ================================
// 🌊 FLOOD ALERT SYSTEM with SMS ALERTS
// Firebase Functions v2 + Firestore + Realtime DB + Semaphore SMS API
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore"); // ✅ explicit import
const axios = require("axios");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// ================= Helper: Send SMS via Semaphore API =================
async function sendSemaphoreSMS(apiKey, number, message) {
  try {
    const response = await axios.post("https://api.semaphore.co/api/v4/messages", {
      apikey: apiKey,
      number,
      message,
      sendername: process.env.SENDER_NAME || "MolaveFlood",
    });
    return response.status;
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    return null;
  }
}

// ================= Helper: Determine water level status =================
function getStatus(distance) {
  if (distance >= 400) return "Critical";
  if (distance >= 200) return "Elevated";
  return "Normal";
}

// ================= MANUAL FLOOD ALERT =================
exports.sendFloodAlertSMS = onCall({ region: "us-central1" }, async (request) => {
  const { location: reqLocation, distance, sensorName: reqSensorName } = request.data;

  if (distance === undefined || !reqSensorName) {
    throw new HttpsError("invalid-argument", "Missing required parameters: distance or sensorName.");
  }

  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) throw new HttpsError("internal", "SMS provider not configured properly.");

  // Get sensor details from Firestore if not provided by frontend
  let location = reqLocation;
  let sensorName = reqSensorName;

  const deviceDoc = await admin.firestore().collection("devices").doc(sensorName).get();
  if (deviceDoc.exists) {
    const data = deviceDoc.data();
    location = location || data.location || "Unknown";
    sensorName = data.sensorName || sensorName;
  }

  const status = getStatus(distance);

  const message = `FLOOD ALERT
Location: ${location}
Sensor: ${sensorName}
Distance: ${distance.toFixed(2)} cm
Status: ${status}
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;

  console.log(" Sending SMS with message:", message);

  try {
    const personnelSnap = await admin.firestore().collection("Authorized_personnel").get();
    if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

    const results = [];

    for (const doc of personnelSnap.docs) {
      const person = doc.data();
      if (person.Phone_number) {
        const number = person.Phone_number.replace(/^0/, "63");
        const statusCode = await sendSemaphoreSMS(apiKey, number, message);
        results.push({ name: person.Contact_name, status: statusCode });
      }
    }

    // Realtime DB logging
    await admin.database().ref(`alerts/${sensorName}`).set({
      alert_sent: true,
      auto_sent: false,
      distance,
      location,
      status,
      timestamp: Date.now(),
    });

    // Firestore logging
    await admin.firestore().collection("Alert_logs").add({
      type: "Manual",
      location,
      sensorName,
      distance,
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

// ================= AUTOMATIC FLOOD ALERT =================
exports.autoFloodAlert = onValueWritten(
  {
    ref: "/realtime/{deviceName}",
    region: "us-central1",
  },
  async (event) => {
    const deviceName = event.params.deviceName;
    const newData = event.data.after.val();

    if (!newData || newData.distance === undefined) return;

    const distance = newData.distance;
    const db = admin.database();
    const status = getStatus(distance);

    if (status === "Normal") {
      console.log(`✅ Normal water level for ${deviceName}: ${distance} cm`);
      return null;
    }

    console.log(`🚨 High water level detected at ${deviceName}: ${distance} cm (${status})`);

    // Prevent duplicate alerts
    const alertRef = db.ref(`alerts/${deviceName}`);
    const alertSnap = await alertRef.get();
    if (alertSnap.exists() && alertSnap.val().alert_sent) {
      console.log(`Alert already sent for ${deviceName}.`);
      return null;
    }

    const apiKey = process.env.SEMAPHORE_API_KEY;

    try {
      // Fetch location using sensorName field in Firestore
      const deviceDoc = await admin.firestore().collection("devices").doc(deviceName).get();
      const deviceData = deviceDoc.exists ? deviceDoc.data() : {};
      const location = deviceData.location || "Unknown";
      const sensorName = deviceData.sensorName || deviceName;

      const message = `⚠️ FLOOD ALERT (AUTO) ⚠️
Location: ${location}
Sensor: ${sensorName}
Distance: ${distance.toFixed(2)} cm
Status: ${status}
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;

      // Send to authorized personnel
      const personnelSnap = await admin.firestore().collection("Authorized_personnel").get();
      for (const doc of personnelSnap.docs) {
        const person = doc.data();
        if (person.Phone_number) {
          const number = person.Phone_number.replace(/^0/, "63");
          await sendSemaphoreSMS(apiKey, number, message);
          console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
        }
      }

      // Realtime DB logging
      await alertRef.set({
        alert_sent: true,
        auto_sent: true,
        distance,
        location,
        status,
        timestamp: Date.now(),
      });

      // Firestore logging
      await admin.firestore().collection("Alert_logs").add({
        type: "Automatic",
        location,
        sensorName,
        distance,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      console.log(`✅ Auto alert successfully sent for ${sensorName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.response?.data || err.message);
    }

    return null;
  }
);
