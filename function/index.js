// ================================
// 🌊 FLOOD ALERT SYSTEM - v4 (Dynamic Thresholds + Device Status + Logging)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");

// --------------------
// Lazy Admin Initialization
// --------------------
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

// --------------------
// Helper: Send SMS via Semaphore API
// --------------------
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

// --------------------
// Helper: Determine flood status dynamically
// --------------------
function getStatus(distance, device = {}) {
  const normalLevel = device.normalLevel ?? 0;   // default safe level
  const alertLevel = device.alertLevel ?? 200;   // default alert threshold
  const maxHeight = device.maxHeight ?? 400;     // default critical threshold

  if (distance >= maxHeight) return "Critical";
  if (distance >= alertLevel) return "Elevated";
  if (distance <= normalLevel) return "Normal";

  // Between normalLevel and alertLevel
  return "Normal";
}

// ================================
// Manual Flood Alert Function
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

    try {
      let location = reqLocation;
      let sensorName = reqSensorName;

      // Fetch device thresholds from Firestore
      const deviceDoc = await firestoreDb.collection("devices").doc(sensorName).get();
      const deviceData = deviceDoc.exists ? deviceDoc.data() : {};
      location = location || deviceData.location || "Unknown";
      sensorName = deviceData.sensorName || sensorName;

      const roundedDistance = Math.round(distance);
      const status = getStatus(distance, deviceData);

      const message = `MANUAL FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      // Fetch authorized personnel
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

      // Log alert in RTDB
      await rtdb.ref(`alerts/${sensorName}`).set({
        alert_sent: true,
        auto_sent: false,
        distance: roundedDistance,
        location,
        status,
        timestamp: Date.now(),
      });

      // Log alert in Firestore
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
// Automatic Flood Alert (Dynamic thresholds + cooldown + daily limit + near-critical trigger)
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

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
      const deviceData = deviceDoc.exists ? deviceDoc.data() : {};

      // Mark device active and update last reading timestamp
      await firestoreDb.collection("devices").doc(deviceName).update({
        lastUpdate: FieldValue.serverTimestamp(),
        status: "active",
      });

      // Skip if device is inactive
      if (deviceData.status === "inactive") {
        console.log(`ℹ️ Device ${deviceName} is inactive. Skipping automatic SMS.`);
        return null;
      }

      // ------------------ Near-Critical Threshold Logic ------------------
      const normalLevel = deviceData.normalLevel ?? 0;
      const maxHeight = deviceData.maxHeight ?? 400;

      // Calculate percentage of the water level in the sensor range
      const levelPercentage = ((distance - normalLevel) / (maxHeight - normalLevel)) * 100;

      // Only send alert if reading is above 60% of the range
      if (levelPercentage < 60) {
        console.log(`ℹ️ Water level for ${deviceName} is below 60% of range (${Math.round(levelPercentage)}%). Skipping SMS.`);
        return null;
      }
      // ------------------------------------------------------------------

      const status = getStatus(distance, deviceData);

      // ------------------ Cooldown & Daily Limit Logic ------------------
      const lastAutoSmsSent = deviceData.lastAutoSmsSent?.toMillis?.() || 0;
      const autoSmsCountToday = deviceData.autoSmsCountToday || 0;
      const autoSmsCountDate = deviceData.autoSmsCountDate || "";

      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      let currentCount = autoSmsCountToday;
      if (autoSmsCountDate !== today) currentCount = 0;

      const cooldown = 5 * 60 * 60 * 1000; // 5 hours in ms
      if (Date.now() - lastAutoSmsSent < cooldown) {
        console.log(`ℹ️ Skipping SMS for ${deviceName}: cooldown not reached.`);
        return null;
      }

      if (currentCount >= 3) {
        console.log(`ℹ️ Skipping SMS for ${deviceName}: daily limit reached.`);
        return null;
      }
      // ------------------------------------------------------------------

      const location = deviceData.location || "Unknown";
      const sensorName = deviceData.sensorName || deviceName;

      const message = `AUTOMATIC FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) return;

      // Send SMS to all personnel
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

      // Update RTDB and Firestore logs
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

      // Update last sent timestamp and daily count
      await firestoreDb.collection("devices").doc(deviceName).update({
        lastAutoSmsSent: FieldValue.serverTimestamp(),
        autoSmsCountToday: currentCount + 1,
        autoSmsCountDate: today,
      });

      console.log(`✅ Automatic alert sent for ${deviceName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.message);
    }

    return null;
  }
);

// ================================
// Scheduled Function: Update Device Active/Inactive Status
// Runs every 2 minutes
// ================================
exports.updateDeviceStatus = onSchedule("every 2 minutes", async () => {
  console.log("🕒 Running scheduled device status update...");

  try {
    const firestoreDb = getFirestoreDb();
    const devicesSnap = await firestoreDb.collection("devices").get();
    if (devicesSnap.empty) return;

    const now = Date.now();
    const inactivityThreshold = 2 * 60 * 1000; // 2 minutes in ms

    const batch = firestoreDb.batch();
    devicesSnap.docs.forEach((docSnap) => {
      const device = docSnap.data();
      const lastUpdate = device.lastUpdate?.toMillis?.() || 0;
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
