const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");

admin.initializeApp();
const firestoreDb = admin.firestore();
const rtdb = admin.database();

async function sendSemaphoreSMS(apiKey, number, message, senderName = "MolaveFlood") {
  try {
    const response = await axios.post("https://api.semaphore.co/api/v4/messages", {
      api_key: apiKey,
      number,
      message,
      sendername: senderName,
    });
    return response.status;
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    return null;
  }
}

function getStatus(distance) {
  if (distance >= 400) return "Critical";
  if (distance >= 200) return "Elevated";
  return "Normal";
}

exports.sendFloodAlertSMS = onCall({ region: "asia-southeast1" }, async (request) => {
  const { location: reqLocation, distance, sensorName: reqSensorName } = request.data;

  if (distance === undefined || !reqSensorName) {
    throw new HttpsError("invalid-argument", "Missing required parameters: distance or sensorName.");
  }

  const apiKey = process.env.SEMAPHORE_API_KEY || process.env.FIREBASE_CONFIG?.semaphore?.key;
  const senderName = process.env.SENDER_NAME || process.env.FIREBASE_CONFIG?.semaphore?.sender || "MolaveFlood";
  if (!apiKey) throw new HttpsError("internal", "SMS provider not configured properly.");

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
    const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
    if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

    const results = await Promise.all(
      personnelSnap.docs.map(async (doc) => {
        const person = doc.data();
        if (person.Phone_number) {
          const number = person.Phone_number.replace(/^0/, "63");
          const statusCode = await sendSemaphoreSMS(apiKey, number, message, senderName);
          return { name: person.Contact_name, status: statusCode };
        }
        return null;
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

    console.log(`✅ Manual SMS alert sent successfully for ${sensorName}`);
    return { success: true, results };

  } catch (error) {
    console.error("❌ Error sending manual alert:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to send SMS alert.");
  }
});

exports.autoFloodAlert = onValueWritten(
  { ref: "/realtime/{deviceName}", region: "asia-southeast1" },
  async (event) => {
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
    const alertSnap = await alertRef.once('value');
    if (alertSnap.exists() && alertSnap.val().alert_sent) {
      console.log(`ℹ️ Alert already sent for ${deviceName}. Skipping duplicate.`);
      return null;
    }

    const apiKey = process.env.SEMAPHORE_API_KEY || process.env.FIREBASE_CONFIG?.semaphore?.key;
    const senderName = process.env.SENDER_NAME || process.env.FIREBASE_CONFIG?.semaphore?.sender || "MolaveFlood";

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
      const deviceData = deviceDoc.exists ? deviceDoc.data() : {};
      const location = deviceData.location || "Unknown";
      const sensorName = deviceData.sensorName || deviceName;

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

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      await Promise.all(
        personnelSnap.docs.map(async (doc) => {
          const person = doc.data();
          if (person.Phone_number) {
            const number = person.Phone_number.replace(/^0/, "63");
            await sendSemaphoreSMS(apiKey, number, message, senderName);
            console.log(`✅ Auto SMS sent to ${person.Contact_name}`);
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

      console.log(`✅ Automatic alert successfully sent for ${sensorName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.response?.data || err.message);
    }

    return null;
  }
);
