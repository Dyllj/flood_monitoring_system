// ================================
// 🌊 FLOOD ALERT SYSTEM - v6 (Semaphore SMS Only, Cleaned & Number Formatting Fixed)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");
const { FieldValue } = require("firebase-admin/firestore");

// --- Lazy Admin Initialization ---
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
// --- End Lazy Init ---

// ---------------- Semaphore Config ----------------
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || "";
const SENDER_NAME = process.env.SENDER_NAME || "MolaveFlood";
const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";

// ---------------- Shared Message Builder ----------------
function buildFloodMessage(location, distance, waterLevelStatus) {
  const timeframe = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  return `Flood Alert
Maayung Adlaw!
Ang tubig sa ${location} kay ming abot na sa ${distance.toFixed(2)} m (${waterLevelStatus})
Pag alerto og pagbantay sa posible na baha anang luraga.
${timeframe}
- Molave Municipal Disaster Risk Reduction Management Office`;
}

// ---------------- Shared Phone Number Formatter ----------------
function formatNumber(number) {
  if (!number || typeof number !== "string") return null;

  let cleanNumber = number.replace(/[^0-9]/g, "");

  if (cleanNumber.startsWith("09") && cleanNumber.length === 11) {
    return "63" + cleanNumber.substring(1);
  } else if (cleanNumber.startsWith("639") && cleanNumber.length === 12) {
    return cleanNumber;
  }

  return null;
}

// ================================
// ☎️ Manual SMS Alert Function
// ================================
exports.sendFloodAlertSMS = onCall(
  { cors: true, region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (request) => {
    const { sensorName } = request.data || {};
    if (!sensorName) throw new HttpsError("invalid-argument", "Missing sensorName");

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    try {
      // --- 1. Fetch Device Data ---
      const deviceRef = firestoreDb.collection("devices").doc(sensorName);
      const deviceSnap = await deviceRef.get();
      if (!deviceSnap.exists) throw new HttpsError("not-found", `Device "${sensorName}" not found.`);

      const device = deviceSnap.data();
      const location = device.location || "Unknown Location";
      const waterLevelStatus = device.waterLevelStatus || "Normal";

      // --- 2. Get Current Reading ---
      const rtdbRef = rtdb.ref(`realtime/${sensorName}`);
      const rtdbSnap = await rtdbRef.get();
      const distance = parseFloat(rtdbSnap.val()?.distance || 0);

      // --- 3. Fetch & Format Personnel Numbers ---
      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) throw new HttpsError("not-found", "No authorized personnel found.");

      const recipients = personnelSnap.docs
        .map((doc) => formatNumber(doc.data().Phone_number))
        .filter(Boolean);

      if (recipients.length === 0) throw new HttpsError("not-found", "No valid phone numbers found after formatting.");

      const recipientsString = recipients.join(",");
      const message = buildFloodMessage(location, distance, waterLevelStatus);

      // --- 4. Send SMS via Semaphore ---
      await axios.post(SEMAPHORE_API_URL, null, {
        params: {
          apikey: SEMAPHORE_API_KEY,
          number: recipientsString,
          message,
          sendername: SENDER_NAME,
        },
      });

      return { success: true, message: "SMS Alert sent successfully!" };
    } catch (error) {
      console.error("sendFloodAlertSMS failed:", error.message);
      throw new HttpsError("internal", error.message);
    }
  }
);

// ================================
// 🔔 Automatic SMS Alert Function
// ================================
exports.autoFloodAlertSMS = onSchedule(
  "every 10 minutes",
  { timeZone: "Asia/Manila", 
    region: "asia-southeast1", 
    secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async () => {
    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();
    const now = Date.now();
    const results = [];

    try {
      const devicesSnap = await firestoreDb.collection("devices").get();
      if (devicesSnap.empty) return null;

      for (const docSnap of devicesSnap.docs) {
        const device = docSnap.data();
        const sensorName = docSnap.id;
        const alertLevel = parseFloat(device.alertLevel || 0);
        const status = device.status || "inactive";

        if (status !== "active") continue;

        const rtdbSnap = await rtdb.ref(`realtime/${sensorName}`).get();
        const distance = parseFloat(rtdbSnap.val()?.distance || 0);

        if (distance < alertLevel * 1.05) continue;

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

        const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
        if (personnelSnap.empty) continue;

        const recipients = personnelSnap.docs
          .map((d) => formatNumber(d.data().Phone_number))
          .filter(Boolean);

        if (recipients.length === 0) continue;

        const recipientsString = recipients.join(",");
        const message = buildFloodMessage(device.location, distance, device.waterLevelStatus || "Critical");

        try {
          await axios.post(SEMAPHORE_API_URL, null, {
            params: {
              apikey: SEMAPHORE_API_KEY,
              number: recipientsString,
              message,
              sendername: SENDER_NAME,
            },
          });

          meta.count += 1;
          meta.lastSent = now;
          await metaRef.set(meta);

          results.push({ sensorName, distance, sentTo: recipients.length });
        } catch (err) {
          console.error(`Failed to send SMS for ${sensorName}:`, err.message);
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error("Error in autoFloodAlertSMS:", error.message);
      return { success: false, error: error.message };
    }
  }
);

// ================================
// Scheduled: Update device status
// ================================
exports.updateDeviceStatus = onSchedule(
  {
    schedule: "every 2 minutes",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
  },
  async () => {
    const firestoreDb = getFirestoreDb();
    const now = Date.now();

    try {
      const devicesSnap = await firestoreDb.collection("devices").get();
      if (devicesSnap.empty) return null;

      const inactivityThreshold = 2 * 60 * 1000; // 2 minutes
      const batch = firestoreDb.batch();

      devicesSnap.docs.forEach((docSnap) => {
        const device = docSnap.data();
        const lastUpdate = device.lastUpdate?.toMillis ? device.lastUpdate.toMillis() : 0;
        const newStatus = now - lastUpdate > inactivityThreshold ? "inactive" : "active";

        if (device.status !== newStatus) {
          batch.update(docSnap.ref, { status: newStatus });
        }
      });

      await batch.commit();
      console.log("✅ Device statuses updated successfully");
      return null;
    } catch (err) {
      console.error("Failed to update device statuses:", err.message);
      return null;
    }
  }
);
