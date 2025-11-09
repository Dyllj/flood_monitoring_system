// ================================
// 🌊 FLOOD ALERT SYSTEM - STABLE V5
// Manual + Auto SMS Alerts Functional
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
  if (!_adminApp) _adminApp = admin.initializeApp();
  return _adminApp;
};
const getFirestoreDb = () => { getAdminApp(); return admin.firestore(); };
const getRtdb = () => { getAdminApp(); return admin.database(); };

// --------------------
// Semaphore SMS Helper
// --------------------
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SENDER_NAME = process.env.SENDER_NAME || "MolaveFlood";

function formatNumber(number) {
  if (!number || typeof number !== "string") return null;
  const clean = number.replace(/[^0-9]/g, "");
  if (clean.startsWith("09") && clean.length === 11) return "63" + clean.slice(1);
  if (clean.startsWith("639") && clean.length === 12) return clean;
  return null;
}

async function sendSemaphoreSMS(apiKey, number, message, senderName) {
  if (!apiKey) throw new Error("Semaphore API Key missing");
  if (!number) throw new Error("Recipient number missing");
  if (!message) throw new Error("Message content missing");

  try {
    const payload = new URLSearchParams();
    payload.append("apikey", apiKey);
    payload.append("number", number);
    payload.append("message", message);
    if (senderName) payload.append("sendername", senderName);

    const response = await axios.post(
      "https://api.semaphore.co/api/v4/messages",
      payload,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (!response.data || !response.data.success) {
      throw new Error(`Semaphore API failed: ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ SMS sent to ${number}`);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    throw err;
  }
}

// --------------------
// Flood Status Helper
// --------------------
function getStatus(distance, device = {}) {
  const normal = device.normalLevel ?? 0;
  const alert = device.alertLevel ?? 200;
  const max = device.maxHeight ?? 400;

  if (distance >= max) return "Critical";
  if (distance >= alert) return "Elevated";
  return "Normal";
}

// ================================
// Manual SMS Alert
// ================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const { sensorName, distance: manualDistance, location: manualLocation } = request.data || {};
    if (!sensorName) throw new HttpsError("invalid-argument", "Missing sensorName");
    if (manualDistance === undefined) throw new HttpsError("invalid-argument", "Missing distance");

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(sensorName).get();
      const device = deviceDoc.exists ? deviceDoc.data() : {};
      const location = manualLocation || device.location || "Unknown";

      const distance = Number(manualDistance);
      const roundedDistance = Math.round(distance);
      const status = getStatus(distance, device);

      const message = `MANUAL FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found");

      const results = await Promise.all(
        personnelSnap.docs.map(async doc => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return { name: person.Contact_name, success: false, smsResponse: "No number" };
          const smsResponse = await sendSemaphoreSMS(SEMAPHORE_API_KEY, number, message, SENDER_NAME);
          return { name: person.Contact_name, success: true, smsResponse };
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
        sensorName,
        distance: roundedDistance,
        location,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      return { success: true, results };
    } catch (err) {
      console.error("❌ Manual alert failed:", err.message);
      throw new HttpsError("internal", err.message);
    }
  }
);

// ================================
// Automatic SMS Alert
// Triggered by Realtime Database changes
// ================================
exports.autoFloodAlert = onValueWritten(
  { ref: "/realtime/{deviceName}", region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (event) => {
    const deviceName = event.params.deviceName;
    const newData = event.data.after.val();
    if (!newData || newData.distance === undefined) return;

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();
    const apiKey = SEMAPHORE_API_KEY;

    const distance = Number(newData.distance);
    const roundedDistance = Math.round(distance);

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
      const device = deviceDoc.exists ? deviceDoc.data() : {};

      await firestoreDb.collection("devices").doc(deviceName).update({
        lastUpdate: FieldValue.serverTimestamp(),
        status: "active",
      });

      if (device.status === "inactive") return;

      const status = getStatus(distance, device);

      // Cooldown & daily limit
      const lastAutoSmsSent = device.lastAutoSmsSent?.toMillis?.() || 0;
      const autoSmsCountToday = device.autoSmsCountToday || 0;
      const autoSmsCountDate = device.autoSmsCountDate || "";
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

      let currentCount = autoSmsCountToday;
      if (autoSmsCountDate !== today) currentCount = 0;

      const cooldown = 5 * 60 * 60 * 1000; // 5h
      if (Date.now() - lastAutoSmsSent < cooldown) return;
      if (currentCount >= 3) return;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) return;

      const location = device.location || "Unknown";
      const sensorName = device.sensorName || deviceName;

      const message = `AUTOMATIC FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      await Promise.all(
        personnelSnap.docs.map(async doc => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return;
          await sendSemaphoreSMS(apiKey, number, message, SENDER_NAME);
        })
      );

      // Update RTDB and Firestore
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

      await firestoreDb.collection("devices").doc(deviceName).update({
        lastAutoSmsSent: FieldValue.serverTimestamp(),
        autoSmsCountToday: currentCount + 1,
        autoSmsCountDate: today,
      });

      console.log(`✅ Automatic alert sent for ${deviceName}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.message);
    }
  }
);

// ================================
// Scheduled Device Status Update
// ================================
exports.updateDeviceStatus = onSchedule(
  "every 2 minutes",
  { region: "asia-southeast1", timeZone: "Asia/Manila" },
  async () => {
    const firestoreDb = getFirestoreDb();
    try {
      const devicesSnap = await firestoreDb.collection("devices").get();
      if (devicesSnap.empty) return;

      const now = Date.now();
      const inactivityThreshold = 2 * 60 * 1000; // 2min
      const batch = firestoreDb.batch();

      devicesSnap.docs.forEach(docSnap => {
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
  }
);
