// ================================
// 🌊 FLOOD ALERT SYSTEM - FULL SMS ALERT
// Manual + Automatic SMS
// Auto SMS: max 3/day, 5-hour cooldown, Semaphore V4 API compliant
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

  if (!response.data || !Array.isArray(response.data)) {
    throw new Error(`Semaphore API returned invalid response: ${JSON.stringify(response.data)}`);
  }

  console.log(`✅ SMS queued for ${number}`, response.data);
  return response.data;
}

// --------------------
// Flood Status Helper
// --------------------
function getStatus(distance, device = {}) {
  const normalLevel = Number(device.normalLevel) || 0;
  const alertLevel = Number(device.alertLevel) || 2;
  const maxHeight = Number(device.maxHeight) || 4;

  if (distance >= maxHeight) return "Critical";
  if (distance >= alertLevel) return "Elevated";
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

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(sensorName).get();
      if (!deviceDoc.exists) throw new HttpsError("not-found", "Device not found");
      const device = deviceDoc.data() || {};

      let distance;
      if (manualDistance !== undefined) {
        distance = Number(manualDistance);
      } else {
        const snapshot = await rtdb.ref(`realtime/${sensorName}/distance`).get();
        if (!snapshot.exists()) throw new HttpsError("not-found", "No distance found in Realtime DB");
        distance = Number(snapshot.val()) || 0;
      }

      const roundedDistance = Math.round(distance);
      const status = getStatus(distance, device);
      if (status !== "Critical") return;

      const location = manualLocation || device.location || "Unknown";

      const message = `MANUAL FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}m (${status}).
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

      let waterLevelStatus = "Normal";
      if (distance >= device.alertLevel) waterLevelStatus = "Elevated";
      if (distance >= device.maxHeight) waterLevelStatus = "Critical";

      await firestoreDb.collection("devices").doc(sensorName).update({
        lastUpdate: FieldValue.serverTimestamp(),
        waterLevelStatus,
        status: "active",
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
// ================================
exports.autoFloodAlert = onValueWritten(
  { ref: "/realtime/{deviceName}", region: "asia-southeast1", secrets: ["SEMAPHORE_API_KEY", "SENDER_NAME"] },
  async (event) => {
    const deviceName = event.params.deviceName;
    const newData = event.data.after.val();
    if (!newData || newData.distance === undefined) return;

    const firestoreDb = getFirestoreDb();
    const rtdb = getRtdb();
    const distance = Number(newData.distance);
    const roundedDistance = Math.round(distance * 100) / 100;

    try {
      const deviceDoc = await firestoreDb.collection("devices").doc(deviceName).get();
      if (!deviceDoc.exists) return;
      const device = deviceDoc.data() || {};

      let waterLevelStatus = "Normal";
      if (distance > device.normalLevel && distance < device.alertLevel) {
        waterLevelStatus = "Elevated";
      } else if (distance >= device.alertLevel) {
        waterLevelStatus = "Critical";
      }

      await firestoreDb.collection("devices").doc(deviceName).update({
        lastUpdate: FieldValue.serverTimestamp(),
        waterLevelStatus,
        status: "active",
      });

      const status = waterLevelStatus;
      const location = device.location || "Unknown";
      const sensorName = device.sensorName || deviceName;

      if (device.status === "inactive") return;

      const lastAutoSmsSent = device.lastAutoSmsSent?.toMillis?.() || 0;
      const autoSmsCountToday = device.autoSmsCountToday || 0;
      const autoSmsCountDate = device.autoSmsCountDate || "";
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

      let currentCount = autoSmsCountToday;
      if (autoSmsCountDate !== today) currentCount = 0;

      const cooldown = 5 * 60 * 60 * 1000; // 5 hours
      if (Date.now() - lastAutoSmsSent < cooldown) return;
      if (currentCount >= 3) return;

      const personnelSnap = await firestoreDb.collection("Authorized_personnel").get();
      if (personnelSnap.empty) return;

      const message = `AUTOMATIC FLOOD ALERT
Maayung Adlaw!
Ang tubig sa ${location} naabot na ang lebel na ${roundedDistance}m (${status}).
Pag-alerto ug pag-andam sa posibleng baha.
Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
- Sent by Molave Municipal Risk Reduction and Management Office`;

      await Promise.all(
        personnelSnap.docs.map(async doc => {
          const person = doc.data();
          const number = formatNumber(person.Phone_number);
          if (!number) return;
          await sendSemaphoreSMS(SEMAPHORE_API_KEY, number, message, SENDER_NAME);
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

      console.log(`✅ Automatic alert sent for ${deviceName}: ${roundedDistance}m → ${status}`);
    } catch (err) {
      console.error("❌ Auto alert failed:", err.message);
    }
  }
);

// ================================
// SCHEDULED DEVICE STATUS CHECK
// Logs offline events reliably
// ================================
exports.checkDeviceActivity = onSchedule(
  { schedule: "every 2 minutes", region: "asia-southeast1" },
  async () => {
    try {
      const firestoreDb = getFirestoreDb();
      const devicesSnapshot = await firestoreDb.collection("devices").get();

      for (const doc of devicesSnapshot.docs) {
        await toggleDeviceStatus(doc);
      }
    } catch (err) {
      console.error("❌ Device activity check failed:", err.message);
    }
  }
);

// ================================
// TOGGLE DEVICE STATUS FUNCTION
// Only used for offline detection
// ================================
const toggleDeviceStatus = async (doc) => {
  const firestoreDb = getFirestoreDb();
  const data = doc.data();
  const sensorId = doc.id;
  const now = Date.now();
  const THRESHOLD = 2 * 60 * 1000; // 2 minute
  const lastUpdate = data.lastUpdate?.toMillis?.() || 0;

  const offlineLogsRef = firestoreDb
    .collection("devices-logs")
    .doc(sensorId)
    .collection("device-offline-logs");

  if (now - lastUpdate > THRESHOLD && data.status !== "inactive") {
    await doc.ref.update({ status: "inactive" });
    await offlineLogsRef.add({
      timestamp: FieldValue.serverTimestamp(),
      status: "inactive",
      message: `Device ${sensorId} stopped sending readings.`,
      reason: `No new data for more than ${THRESHOLD / 60000} minutes`,
    });
    console.log(`📴 ${sensorId} → INACTIVE (logged offline event)`);
  }
};

// ================================
// 🔄 DEVICE READINGS LOGGER (Updated with online logs)
// ================================
exports.logDeviceReadings = onValueWritten(
  { ref: "/realtime/{sensorId}", region: "asia-southeast1" },
  async (event) => {
    const sensorId = event.params.sensorId;
    const newData = event.data.after.val();
    if (!newData || newData.distance === undefined) return;

    const firestoreDb = getFirestoreDb();
    const distance = Number(newData.distance);
    const roundedDistance = Math.round(distance * 100) / 100;

    try {
      const deviceRef = firestoreDb.collection("devices").doc(sensorId);
      const deviceDoc = await deviceRef.get();
      if (!deviceDoc.exists) return;

      const deviceData = deviceDoc.data();

      // Determine waterLevelStatus
      let waterLevelStatus = "Normal";
      if (distance > deviceData.normalLevel && distance < deviceData.alertLevel) {
        waterLevelStatus = "Elevated";
      } else if (distance >= deviceData.alertLevel) {
        waterLevelStatus = "Critical";
      }

      // --- ONLINE LOGS ---
      const prevStatus = deviceData.status || "active";
      if (prevStatus === "inactive") {
        const onlineLogsRef = firestoreDb
          .collection("devices-logs")
          .doc(sensorId)
          .collection("device-online-logs");

        await onlineLogsRef.add({
          timestamp: FieldValue.serverTimestamp(),
          status: "active",
          message: `Device ${sensorId} resumed sending readings.`,
          reason: "New data received after being inactive",
        });

        console.log(`✅ ${sensorId} → ACTIVE (logged online event)`);
      }

      // Reference for normal logs collection
      const logsRef = firestoreDb
        .collection("devices-logs")
        .doc(sensorId)
        .collection("logs");

      // Get latest log
      const latestLogSnap = await logsRef.orderBy("lastUpdate", "desc").limit(1).get();
      let shouldLog = true;

      if (!latestLogSnap.empty) {
        const latestLog = latestLogSnap.docs[0].data();
        const lastLogTime = latestLog.lastUpdate?.toMillis?.() || 0;
        const now = Date.now();
        if (now - lastLogTime < 60 * 1000) shouldLog = false;
      }

      if (shouldLog) {
        await logsRef.add({
          lastUpdate: FieldValue.serverTimestamp(),
          distance: roundedDistance,
          maxHeight: deviceData.maxHeight,
          normalLevel: deviceData.normalLevel,
          alertLevel: deviceData.alertLevel,
          waterLevelStatus,
        });
        console.log(`📊 Logged new reading for ${sensorId}: ${roundedDistance}m → ${waterLevelStatus}`);
      }

      // Update main device doc
      await deviceRef.update({
        lastUpdate: FieldValue.serverTimestamp(),
        waterLevelStatus,
        status: "active",
      });
    } catch (err) {
      console.error("❌ Failed to log reading:", err.message);
    }
  }
);
