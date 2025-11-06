// ================================
// 🌊 FLOOD ALERT SYSTEM - v2 (FINAL SMS FIX + LOGGING)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");

// --- Lazy Admin Initialization ---
let _adminApp;
const getAdminApp = () => {
  if (!_adminApp) {
    _adminApp = admin.initializeApp();
  }
  return _adminApp;
};

const getFirestoreDb = () => {
  getAdminApp();
  return admin.firestore();
};

const getRtdb = () => {
  getAdminApp();
  return admin.database();
};
// --- End Lazy Init ---

/**
 * Sends an SMS using the Semaphore API.
 */
async function sendSemaphoreSMS(apiKey, number, message, senderName) {
  if (!apiKey) {
    console.error("❌ SMS Helper: API Key is missing!");
    throw new Error("Semaphore API Key is not configured in secrets.");
  }

  try {
    const payload = new URLSearchParams();
    payload.append("apikey", apiKey);
    payload.append("number", number);
    payload.append("message", message);
    if (senderName) payload.append("sendername", senderName);

    const response = await axios.post(
      "https://api.semaphore.co/api/v4/messages",
      payload.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (response.status === 200 && response.data) {
      console.log(
        `✅ SMS API Success for ${number}. Response ID: ${response.data[0]?.message_id}. Check Semaphore logs.`
      );
      return response.data;
    } else {
      console.warn(`⚠️ SMS API non-critical error for ${number}.`, response.data);
      throw new Error(`Semaphore API returned status ${response.status}`);
    }
  } catch (err) {
    console.error(
      `❌ FAILED to send SMS to ${number}:`,
      err.response?.data || err.message,
      `Status: ${err.response?.status || 'N/A'}`
    );
    throw err;
  }
}

function getStatus(distance) {
  if (distance >= 400) return "Critical";
  if (distance >= 200) return "Elevated";
  return "Normal";
}

// ================================
// Manual Flood Alert Trigger via HTTPS call
// ================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const senderName = process.env.SENDER_NAME || "MolaveFlood";
    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    if (!apiKey) {
      console.error("❌ SMS Alert failed: API Key is not configured in secrets.");
      throw new HttpsError("internal", "SMS provider not configured properly.");
    }

    const { location: reqLocation, distance, sensorName: reqSensorName } = request.data;
    if (distance === undefined || !reqSensorName) {
      throw new HttpsError("invalid-argument", "Missing required parameters.");
    }

    let location = reqLocation;
    let sensorName = reqSensorName;

    try {
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
- Sent by Molave Municipal Risk Reduction and Management Office`;

      console.log("📨 Sending manual SMS alert:", message);

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) {
        console.error("❌ SMS Alert failed: No authorized personnel found.");
        throw new HttpsError("not-found", "No authorized personnel found.");
      }

      const results = await Promise.all(
        personnelSnap.docs.map(async (doc) => {
          const person = doc.data();
          if (person.Phone_number) {
            const number = person.Phone_number.replace(/^0/, "63");
            const smsResponse = await sendSemaphoreSMS(apiKey, number, message, senderName);
            return { name: person.Contact_name, success: true, smsResponse };
          }
          return { name: person.Contact_name, success: false, smsResponse: "No Number" };
        })
      );

      await rtdb.ref(`alerts/${sensorName}`).set({
        alert_sent: true,
        auto_sent: false,
        distance: roundedDistance,
        location,
        status,
        timestamp: Date.now(),
      });

      await firestoreDb.collection("Alert_logs").add({
        type: "Manual",
        location,
        sensorName,
        distance: roundedDistance,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      console.log(`✅ Manual alert sent successfully for ${sensorName}`);
      return { success: true, results };
    } catch (error) {
      console.error("❌ Error sending manual alert:", error.message);
      throw new HttpsError("internal", `Failed to send SMS. Reason: ${error.message}`);
    }
  }
);

// ================================
// Automatic Alert (RTDB Trigger)
// ================================
exports.autoFloodAlert = onValueWritten(
  { ref: "/realtime/{deviceName}", region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (event) => {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const senderName = process.env.SENDER_NAME || "MolaveFlood";
    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    if (!apiKey) {
      console.error("❌ Auto-Alert failed: API Key is not configured in secrets.");
      return;
    }

    const deviceName = event.params.deviceName;
    const newData = event.data.after.val();
    if (!newData || newData.distance === undefined) return;

    const distance = newData.distance;
    const roundedDistance = Math.round(distance);
    const status = getStatus(distance);

    if (status === "Normal") {
      console.log(`✅ Normal water level for ${deviceName}: ${roundedDistance} cm`);
      return null;
    }

    console.log(`🚨 High water level detected at ${deviceName}: ${roundedDistance} cm (${status})`);

    const alertRef = rtdb.ref(`alerts/${deviceName}`);
    const alertSnap = await alertRef.once("value");
    if (alertSnap.exists() && alertSnap.val().alert_sent) {
      console.log(`ℹ️ Alert already sent for ${deviceName}. Skipping duplicate.`);
      return null;
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
- Sent by Molave Municipal Risk Reduction and Management Office`;

      console.log("📨 Sending automatic SMS alert:", message);

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) {
        console.error("❌ Auto-Alert failed: No authorized personnel found.");
        return;
      }

      await Promise.all(
        personnelSnap.docs.map(async (doc) => {
          const person = doc.data();
          if (person.Phone_number) {
            const number = person.Phone_number.replace(/^0/, "63");
            try {
              await sendSemaphoreSMS(apiKey, number, message, senderName);
              console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
            } catch (smsError) {
              console.error(`❌ Auto SMS failed for ${person.Contact_name}:`, smsError.message);
            }
          }
        })
      );

      await alertRef.set({
        alert_sent: true,
        auto_sent: true,
        distance: roundedDistance,
        location,
        status,
        timestamp: Date.now(),
      });

      await firestoreDb.collection("Alert_logs").add({
        type: "Automatic",
        location,
        sensorName,
        distance: roundedDistance,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      console.log(`✅ Automatic alert successfully sent for ${deviceName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.message);
    }

    return null;
  }
);
