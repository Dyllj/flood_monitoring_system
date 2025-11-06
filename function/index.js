// ================================
// 🌊 FLOOD ALERT SYSTEM - v3 (Device Active/Inactive + Logging)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

// ---------------- SMS Helper ----------------
async function sendSemaphoreSMS(apiKey, number, message, senderName) {
  if (!apiKey) throw new Error("Semaphore API Key is missing.");

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

    if (response.status === 200 && response.data) return response.data;
    throw new Error(`Semaphore API returned status ${response.status}`);
  } catch (err) {
    console.error(`❌ FAILED to send SMS to ${number}:`, err.response?.data || err.message);
    throw err;
  }
}

function getStatus(distance) {
  if (distance >= 400) return "Critical";
  if (distance >= 200) return "Elevated";
  return "Normal";
}

// ================================
// Manual Flood Alert
// ================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const senderName = process.env.SENDER_NAME || "MolaveFlood";
    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    const { location: reqLocation, distance, sensorName: reqSensorName } = request.data;
    if (distance === undefined || !reqSensorName) throw new HttpsError("invalid-argument", "Missing parameters.");

    let location = reqLocation;
    let sensorName = reqSensorName;

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(sensorName).get();
      if (deviceDoc.exists) {
        const data = deviceDoc.data();
        location = location || data.location || "Unknown";
        sensorName = data.sensorName || sensorName;
      }

      const roundedDistance = Math.round(distance);
      const status = getStatus(distance);

      const message = `FLOOD ALERT (MANUAL NOTICE)
Location: ${location}
Sensor: ${sensorName}
Water Level: ${roundedDistance} cm
Status: ${status}
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

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

      console.log(`✅ Manual alert sent for ${sensorName}`);
      return { success: true, results };
    } catch (error) {
      console.error("❌ Manual alert failed:", error.message);
      throw new HttpsError("internal", `Failed to send SMS. Reason: ${error.message}`);
    }
  }
);

// ================================
// Automatic Flood Alert
// ================================
exports.autoFloodAlert = onValueWritten(
  { ref: "/realtime/{deviceName}", region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (event) => {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const senderName = process.env.SENDER_NAME || "MolaveFlood";
    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    const deviceName = event.params.deviceName;
    const newData = event.data.after.val();
    if (!newData || newData.distance === undefined) return;

    const distance = newData.distance;
    const roundedDistance = Math.round(distance);
    const status = getStatus(distance);

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
      const deviceData = deviceDoc.exists ? deviceDoc.data() : {};
      
      // 🔹 Update lastUpdate timestamp whenever new reading is received
      await firestoreDb.collection("devices").doc(deviceName).update({
        lastUpdate: FieldValue.serverTimestamp(),
        status: "active", // mark device active on new reading
      });

      // 🔹 Skip if device is inactive
      if (deviceData.status === "inactive") {
        console.log(`ℹ️ Device ${deviceName} is inactive. Skipping automatic SMS.`);
        return null;
      }

      if (status === "Normal") {
        console.log(`✅ Normal water level for ${deviceName}: ${roundedDistance} cm`);
        return null;
      }

      const location = deviceData.location || "Unknown";
      const sensorName = deviceData.sensorName || deviceName;

      const message = `AUTOMATIC FLOOD ALERT
Location: ${location}
Sensor: ${sensorName}
Water Level: ${roundedDistance} cm
Status: ${status}
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) return;

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

      await rtdb.ref(`alerts/${deviceName}`).set({
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

      console.log(`✅ Automatic alert sent for ${deviceName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.message);
    }

    return null;
  }
);

// ================================
// Scheduled function: Update device active/inactive status
// ================================
exports.updateDeviceStatus = onSchedule("every 2 minutes", async () => {
  console.log("🕒 Running scheduled device status update...");

  try {
    const firestoreDb = getFirestoreDb();
    const devicesSnap = await firestoreDb.collection("devices").get();

    if (devicesSnap.empty) return;

    const now = Date.now();
    const inactivityThreshold = 2 * 60 * 1000;

    const batch = firestoreDb.batch();

    devicesSnap.docs.forEach((docSnap) => {
      const device = docSnap.data();
      const lastUpdate = device.lastUpdate?.toMillis ? device.lastUpdate.toMillis() : 0;
      const newStatus = now - lastUpdate > inactivityThreshold ? "inactive" : "active";

      if (device.status !== newStatus) {
        batch.update(docSnap.ref, { status: newStatus });
        console.log(`🔄 Device ${device.sensorName} status updated to ${newStatus}`);
      }
    });

    await batch.commit();
    console.log("✅ Device status update completed.");
  } catch (err) {
    console.error("❌ Failed to update device statuses:", err.message);
  }

  return null;
});
