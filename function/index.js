// ================================
// 🌊 FLOOD ALERT SYSTEM - STABLE (Manual + Auto SMS Working)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueWritten } = require("firebase-functions/v2/database");
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
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || "";
const SENDER_NAME = process.env.SENDER_NAME || "MolaveFlood";

function formatNumber(number) {
  if (!number || typeof number !== "string") return null;
  let clean = number.replace(/[^0-9]/g, "");
  if (clean.startsWith("09") && clean.length === 11) return "63" + clean.slice(1);
  if (clean.startsWith("639") && clean.length === 12) return clean;
  return null;
}

async function sendSemaphoreSMS(apiKey, number, message, senderName) {
  try {
    const payload = new URLSearchParams();
    payload.append("apikey", apiKey);
    payload.append("number", number);
    payload.append("message", message);
    if (senderName) payload.append("sendername", senderName);

    await axios.post("https://api.semaphore.co/api/v4/messages", payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch (err) {
    console.error(`❌ Failed to send SMS to ${number}:`, err.response?.data || err.message);
    throw err;
  }
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
  return "Normal";
}

// ================================
// ☎️ Manual SMS Alert
// ================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const { sensorName } = request.data || {};
    if (!sensorName) throw new HttpsError("invalid-argument", "Missing sensorName");

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    try {
      // Fetch device info
      const deviceSnap = await firestoreDb.collection("devices").doc(sensorName).get();
      if (!deviceSnap.exists) throw new HttpsError("not-found", `Device "${sensorName}" not found.`);
      const device = deviceSnap.data();
      const location = device.location || "Unknown";

      // Fetch latest reading
      const rtdbSnap = await rtdb.ref(`realtime/${sensorName}`).get();
      const distance = parseFloat(rtdbSnap.val()?.distance ?? 0);
      const roundedDistance = Math.round(distance);
      const status = getStatus(distance, device);

      const message = `MANUAL FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}cm (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Disaster Risk Reduction Management Office`;

      // Fetch personnel
      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

      const results = await Promise.all(
        personnelSnap.docs.map(async (doc) => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return { name: person.Contact_name, success: false, smsResponse: "No Number" };
          await sendSemaphoreSMS(SEMAPHORE_API_KEY, number, message, SENDER_NAME);
          return { name: person.Contact_name, success: true };
        })
      );

      // Log to RTDB
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
// 🔔 Automatic SMS Alert (Every 10 min)
// ================================
exports.autoFloodAlertSMS = onSchedule(
  "every 10 minutes",
  { timeZone: "Asia/Manila", region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async () => {
    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();
    const now = Date.now();

    try {
      const devicesSnap = await firestoreDb.collection("devices").get();
      if (devicesSnap.empty) return null;

      for (const docSnap of devicesSnap.docs) {
        const device = docSnap.data();
        const sensorName = docSnap.id;
        const alertLevel = parseFloat(device.alertLevel ?? 0);
        const status = device.status || "inactive";

        if (status !== "active") continue;

        // Get latest distance
        const rtdbSnap = await rtdb.ref(`realtime/${sensorName}`).get();
        const distance = parseFloat(rtdbSnap.val()?.distance ?? 0);

        // Only alert if distance >= alert level
        if (distance < alertLevel) continue;

        // Cooldown & daily limit
        const metaRef = firestoreDb.collection("autoSMSMeta").doc(sensorName);
        const metaSnap = await metaRef.get();
        let meta = metaSnap.exists ? metaSnap.data() : { count: 0, lastSent: 0, day: new Date().getDate() };

        const today = new Date().getDate();
        if (meta.day !== today) {
          meta.count = 0;
          meta.day = today;
        }

        if (meta.count >= 3) continue;
        if (now - meta.lastSent < 5 * 60 * 60 * 1000) continue;

        // Get recipients
        const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
        if (personnelSnap.empty) continue;

        const recipients = personnelSnap.docs
          .map((d) => formatNumber(d.data().Phone_number))
          .filter(Boolean);

        if (!recipients.length) continue;

        const message = `AUTOMATIC FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${device.location || "Unknown"} naabot na ang lebel na ${distance.toFixed(0)}cm (${device.waterLevelStatus || "Critical"}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Disaster Risk Reduction Management Office`;

        for (const number of recipients) {
          try {
            await sendSemaphoreSMS(SEMAPHORE_API_KEY, number, message, SENDER_NAME);
          } catch (err) {
            console.error(`Failed to send auto SMS to ${number}:`, err.message);
          }
        }

        // Update meta
        meta.count += 1;
        meta.lastSent = now;
        await metaRef.set(meta);

        // Log alerts
        await rtdb.ref(`alerts/${sensorName}`).set({
          alert_sent: true,
          auto_sent: true,
          distance,
          location: device.location || "Unknown",
          status: device.waterLevelStatus || "Critical",
          timestamp: Date.now(),
        });

        await firestoreDb.collection("Alert_logs").add({
          type: "Automatic",
          sensorName,
          distance,
          location: device.location || "Unknown",
          status: device.waterLevelStatus || "Critical",
          timestamp: FieldValue.serverTimestamp(),
          message,
        });
      }

      return { success: true };
    } catch (err) {
      console.error("❌ AutoFloodAlertSMS failed:", err.message);
      return { success: false, error: err.message };
    }
  }
);

// ================================
// 🕒 Scheduled Device Status Update
// ================================
exports.updateDeviceStatus = onSchedule(
  "every 2 minutes",
  { timeZone: "Asia/Manila", region: "asia-southeast1" },
  async () => {
    const firestoreDb = getFirestoreDb();

    try {
      const devicesSnap = await firestoreDb.collection("devices").get();
      if (devicesSnap.empty) return;

      const now = Date.now();
      const inactivityThreshold = 2 * 60 * 1000; // 2 minutes
      const batch = firestoreDb.batch();

      for (const docSnap of devicesSnap.docs) {
        const device = docSnap.data();
        const lastUpdate = device.lastUpdate?.toMillis?.() || 0;
        const newStatus = now - lastUpdate > inactivityThreshold ? "inactive" : "active";
        if (device.status !== newStatus) batch.update(docSnap.ref, { status: newStatus });
      }

      await batch.commit();
      console.log("✅ Device statuses updated");
    } catch (err) {
      console.error("❌ Failed to update device statuses:", err.message);
    }
  }
);
