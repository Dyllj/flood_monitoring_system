// ================================
// 🌊 FLOOD ALERT SYSTEM - AUTO SMS ALERT
// Auto SMS: max 3/day, 5-hour cooldown, Semaphore V4 API compliant
// ================================

const { onValueWritten } = require("firebase-functions/v2/database");
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

  // ✅ Treat array of messages as success
  if (!response.data || !Array.isArray(response.data)) {
    throw new Error(`Semaphore API returned invalid response: ${JSON.stringify(response.data)}`);
  }

  console.log(`✅ Auto SMS queued for ${number}`, response.data);
  return response.data;
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
// Auto Flood Alert
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
      // Fetch device metadata from Firestore
      const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
      if (!deviceDoc.exists) return;
      const device = deviceDoc.data();

      // Skip if device is inactive
      if (device.status === "inactive") return;

      const status = getStatus(distance, device);
      const location = device.location || "Unknown";
      const sensorName = device.sensorName || deviceName;

      // Check daily limit and cooldown
      const now = Date.now();
      const lastAutoSmsSent = device.lastAutoSmsSent?.toMillis?.() || 0;
      const autoSmsCountToday = device.autoSmsCountToday || 0;
      const autoSmsCountDate = device.autoSmsCountDate || "";
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

      let currentCount = autoSmsCountToday;
      if (autoSmsCountDate !== today) currentCount = 0;

      const cooldown = 5 * 60 * 60 * 1000; // 5 hours
      if (Date.now() - lastAutoSmsSent < cooldown) return; // cooldown not finished
      if (currentCount >= 3) return; // daily limit reached

      // Fetch authorized personnel
      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) return;

      // Prepare message
      const message = `AUTOMATIC FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}m (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      // Send SMS
      await Promise.all(
        personnelSnap.docs.map(async doc => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return;
          await sendSemaphoreSMS(apiKey, number, message, SENDER_NAME);
        })
      );

      // Update Realtime DB
      await rtdb.ref(`alerts/${deviceName}`).set({
        alert_sent: true,
        auto_sent: true,
        distance: roundedDistance,
        location,
        status,
        timestamp: Date.now(),
      });

      // Log alert in Firestore
      await firestoreDb.collection("Alert_logs").add({
        type: "Automatic",
        sensorName,
        distance: roundedDistance,
        location,
        status,
        timestamp: FieldValue.serverTimestamp(),
        message,
      });

      // Update device with last sent timestamp and daily counter
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
