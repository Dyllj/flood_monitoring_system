// ================================
// 🌊 FLOOD ALERT SYSTEM - FIXED MANUAL SMS
// Automatically fetches distance from Realtime DB if not provided
// Handles Semaphore V4 API responses correctly
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

    // ✅ Treat array of messages as success
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error(`Semaphore API returned invalid response: ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ SMS queued for ${number}`, response.data);
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
// Fixed Manual SMS Alert
// ================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const { sensorName, distance: manualDistance, location: manualLocation } = request.data || {};
    if (!sensorName) throw new HttpsError("invalid-argument", "Missing sensorName");

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    try {
      // Fetch device metadata from Firestore
      const deviceDoc = await firestoreDb.collection("devices").doc(sensorName).get();
      if (!deviceDoc.exists) throw new HttpsError("not-found", "Device not found");
      const device = deviceDoc.data();

      // Use manual distance if provided, otherwise fetch from Realtime DB
      let distance;
      if (manualDistance !== undefined) {
        distance = Number(manualDistance);
      } else {
        const snapshot = await rtdb.ref(`realtime/${sensorName}/distance`).get();
        if (!snapshot.exists()) throw new HttpsError("not-found", "No distance found in Realtime DB");
        distance = Number(snapshot.val());
      }

      const roundedDistance = Math.round(distance);
      const status = getStatus(distance, device);
      const location = manualLocation || device.location || "Unknown";

      // Prepare alert message
      const message = `MANUAL FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}m (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      // Fetch authorized personnel
      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found");

      // Send SMS to all authorized personnel
      const results = await Promise.all(
        personnelSnap.docs.map(async doc => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return { name: person.Contact_name, success: false, smsResponse: "No number" };
          const smsResponse = await sendSemaphoreSMS(SEMAPHORE_API_KEY, number, message, SENDER_NAME);
          return { name: person.Contact_name, success: true, smsResponse };
        })
      );

      // Update Realtime DB
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
