/* eslint-env node */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// ================================
// 🌊 FLOOD ALERT SYSTEM - v6 (Semaphore SMS + Firebase Secrets)
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { accessSecret } = require("firebase-functions/v2/secret");
const admin = require("firebase-admin");
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

// ---------------- Flood Status Helper ----------------
function getStatus(distance, normalLevel, alertLevel) {
  if (distance >= alertLevel) return "Critical";
  if (distance >= normalLevel) return "Elevated";
  return "Normal";
}

// ================================
// ☎️ Manual SMS Alert Function
// ================================
exports.sendFloodAlertSMS = onCall(async (request) => {
  const { sensorName } = request.data || {};
  if (!sensorName) throw new HttpsError("invalid-argument", "Missing sensorName");

  try {
    // 🔑 Access Semaphore secrets
    const SEMAPHORE_API_KEY = await accessSecret("SEMAPHORE_API_KEY");
    const SENDER_NAME = await accessSecret("SENDER_NAME") || "MolaveFlood";

    if (!SEMAPHORE_API_KEY) {
      throw new HttpsError("failed-precondition", "Semaphore API key is not set.");
    }

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    // 1️⃣ Get device metadata from Firestore
    const deviceRef = firestoreDb.collection("devices").doc(sensorName);
    const deviceSnap = await deviceRef.get();
    if (!deviceSnap.exists) {
      throw new HttpsError("not-found", `Device "${sensorName}" not found in Firestore.`);
    }

    const device = deviceSnap.data();
    const location = device.location || "Unknown Location";
    const waterLevelStatus = device.waterLevelStatus || "Normal";

    // 2️⃣ Get latest distance from Realtime Database
    const rtdbRef = rtdb.ref(`realtime/${sensorName}`);
    const rtdbSnap = await rtdbRef.get();
    const rtdbData = rtdbSnap.val();
    const distance = rtdbData?.distance ? parseFloat(rtdbData.distance).toFixed(2) : "0.00";

    // 3️⃣ Fetch authorized personnel from Firestore
    const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
    if (personnelSnap.empty) {
      throw new HttpsError("not-found", "No authorized personnel found.");
    }

    const recipients = personnelSnap.docs.map((doc) => doc.data().Phone_number);

    // 4️⃣ Construct the message
    const timeframe = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    const message = `Flood Alert
Maayung Adlaw!
Ang tubig sa ${location} kay ming abot na sa ${distance} m (${waterLevelStatus})
Pag alerto og pagbantay sa posible na baha anang luraga.
${timeframe}
- Molave Municipal Disaster Risk Reduction Management Office`;

    // 5️⃣ Send SMS via Semaphore API
    const results = [];
    for (const number of recipients) {
      const res = await axios.post("https://api.semaphore.co/api/v4/messages", null, {
        params: {
          apikey: SEMAPHORE_API_KEY,
          number,
          message,
          sendername: SENDER_NAME,
        },
      });
      results.push({ number, status: res.data[0]?.status || "sent" });
    }

    console.log("✅ SMS Alert sent successfully:", results);
    return { success: true, message: "SMS Alert sent successfully!", results };
  } catch (error) {
    console.error("❌ Error sending SMS:", error.message);
    throw new HttpsError("internal", error.message);
  }
});

// ================================
// Scheduled: Update device status every 2 minutes
// ================================
exports.updateDeviceStatus = onSchedule("every 2 minutes", async () => {
  console.log("🕒 Running scheduled device status update...");

  try {
    const firestoreDb = getFirestoreDb();
    const devicesSnap = await firestoreDb.collection("devices").get();
    if (devicesSnap.empty) return;

    const now = Date.now();
    const inactivityThreshold = 2 * 60 * 1000; // 2 minutes
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
