// ================================
// 🌊 FLOOD ALERT SYSTEM - v6 (Functional v4 Features + Clean & Semaphore SMS Only)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");
const { FieldValue } = require("firebase-admin/firestore");

// --------------------
// Lazy Admin Initialization
// --------------------
let _adminApp;
const getAdminApp = () => {
  if (!_adminApp) _adminApp = admin.initializeApp();
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
// Semaphore SMS Helper
// --------------------
async function sendSemaphoreSMS(apiKey, number, message, senderName) {
  if (!apiKey) throw new Error("Semaphore API Key is missing.");
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
  return response.data;
}

// --------------------
// Status Helper
// --------------------
function getStatus(distance, device = {}) {
  const normalLevel = device.normalLevel ?? 0;
  const alertLevel = device.alertLevel ?? 200;
  const maxHeight = device.maxHeight ?? 400;

  if (distance >= maxHeight) return "Critical";
  if (distance >= alertLevel) return "Elevated";
  if (distance <= normalLevel) return "Normal";
  return "Normal";
}

// --------------------
// Number Formatter
// --------------------
function formatNumber(number) {
  if (!number) return null;
  const clean = number.replace(/[^0-9]/g, "");
  if (clean.startsWith("09") && clean.length === 11) return "63" + clean.substring(1);
  if (clean.startsWith("639") && clean.length === 12) return clean;
  return null;
}

// ================================
// Manual SMS Alert
// ================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const apiKey = process.env.SEMAPHORE_API_KEY;
    const senderName = process.env.SENDER_NAME || "MolaveFlood";

    const { sensorName, location: reqLocation, distance } = request.data;
    if (!sensorName || distance === undefined)
      throw new HttpsError("invalid-argument", "Missing parameters.");

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    try {
      // Fetch device thresholds
      const deviceSnap = await firestoreDb.collection("devices").doc(sensorName).get();
      const device = deviceSnap.exists ? deviceSnap.data() : {};
      const location = reqLocation || device.location || "Unknown";

      const roundedDistance = Math.round(distance);
      const status = getStatus(distance, device);

      const message = `MANUAL FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Disaster Risk Reduction Management Office`;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

      const results = await Promise.all(
        personnelSnap.docs.map(async (doc) => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return { name: person.Contact_name, success: false, smsResponse: "No Number" };
          const smsResponse = await sendSemaphoreSMS(apiKey, number, message, senderName);
          return { name: person.Contact_name, success: true, smsResponse };
        })
      );

      // Log in RTDB
      await rtdb.ref(`alerts/${sensorName}`).set({
        alert_sent: true,
        auto_sent: false,
        distance: roundedDistance,
        location,
        status,
        timestamp: Date.now(),
      });

      // Log in Firestore
      await firestoreDb.collection("Alert_logs").add({
        type: "Manual",
        sensorName,
        distance: roundedDistance,
        location,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      console.log(`✅ Manual alert sent for ${sensorName}`);
      return { success: true, results };
    } catch (err) {
      console.error("❌ Manual alert failed:", err.message);
      throw new HttpsError("internal", err.message);
    }
  }
);

// ================================
// Automatic SMS Alert
// ================================
exports.autoFloodAlertSMS = onValueWritten(
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
      const deviceSnap = await firestoreDb.collection("devices").doc(deviceName).get();
      const device = deviceSnap.exists ? deviceSnap.data() : {};

      // Update last reading and status
      await firestoreDb.collection("devices").doc(deviceName).update({
        lastUpdate: FieldValue.serverTimestamp(),
        status: "active",
      });

      if (device.status === "inactive") return null;

      const normalLevel = device.normalLevel ?? 0;
      const maxHeight = device.maxHeight ?? 400;
      const levelPercentage = ((distance - normalLevel) / (maxHeight - normalLevel)) * 100;

      if (levelPercentage < 60) return null; // Only above 60% range

      const status = getStatus(distance, device);
      const location = device.location || "Unknown";
      const sensorName = device.sensorName || deviceName;

      // Cooldown & daily limit
      const lastSent = device.lastAutoSmsSent?.toMillis?.() || 0;
      const countToday = device.autoSmsCountToday || 0;
      const lastDate = device.autoSmsCountDate || "";
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      let currentCount = lastDate !== today ? 0 : countToday;

      if (Date.now() - lastSent < 5 * 60 * 60 * 1000) return null; // 5h cooldown
      if (currentCount >= 3) return null; // max 3/day

      const message = `AUTOMATIC FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Disaster Risk Reduction Management Office`;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) return;

      await Promise.all(
        personnelSnap.docs.map(async (doc) => {
          const number = formatNumber(doc.data().Phone_number);
          if (!number) return;
          try {
            await sendSemaphoreSMS(apiKey, number, message, senderName);
          } catch (err) {
            console.error(`❌ Auto SMS failed for ${doc.data().Contact_name}:`, err.message);
          }
        })
      );

      // Log RTDB & Firestore
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
        sensorName,
        distance: roundedDistance,
        location,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      // Update device auto SMS info
      await firestoreDb.collection("devices").doc(deviceName).update({
        lastAutoSmsSent: FieldValue.serverTimestamp(),
        autoSmsCountToday: currentCount + 1,
        autoSmsCountDate: today,
      });

    } catch (err) {
      console.error("❌ Auto alert failed:", err.message);
    }
    return null;
  }
);

// ================================
// Scheduled Device Status Update (every 2 min)
// ================================
exports.updateDeviceStatus = onSchedule("every 2 minutes", { region: "asia-southeast1" }, async () => {
  const firestoreDb = getFirestoreDb();
  const now = Date.now();

  try {
    const devicesSnap = await firestoreDb.collection("devices").get();
    if (devicesSnap.empty) return;

    const batch = firestoreDb.batch();
    const inactivityThreshold = 2 * 60 * 1000;

    devicesSnap.docs.forEach((docSnap) => {
      const device = docSnap.data();
      const lastUpdate = device.lastUpdate?.toMillis?.() || 0;
      const newStatus = now - lastUpdate > inactivityThreshold ? "inactive" : "active";
      if (device.status !== newStatus) batch.update(docSnap.ref, { status: newStatus });
    });

    await batch.commit();
    console.log("✅ Device statuses updated");
  } catch (err) {
    console.error("❌ Failed to update device statuses:", err.message);
  }
  return null;
});
