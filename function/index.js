// ================================
// 🌊 FLOOD ALERT SYSTEM - v2 (CRITICAL ALERT ONLY)
// ================================
// ✅ Change: Auto SMS alerts now trigger only when status === "Critical"
// ================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const axios = require("axios");

let app;
function getAdminApp() {
  if (!app) {
    app = admin.initializeApp();
  }
  return app;
}

const SMS_API = "https://sms.teamssolutions.com/api/v3/sms/send";
const SMS_API_KEY = "YOUR_SMS_API_KEY"; // 🔒 Replace with your real key in production

// =============================================================
// 🧭 Helper: Flood Status Calculation
// =============================================================
function getStatus(distance, deviceData) {
  const maxHeight = deviceData.maxHeight ?? 400;
  const normalLevel = deviceData.normalLevel ?? 0;
  const alertLevel = deviceData.alertLevel ?? 250;

  if (distance <= alertLevel) return "Critical";
  if (distance <= alertLevel + 10) return "Elevated";
  if (distance <= maxHeight) return "Normal";
  return "Unknown";
}

// =============================================================
// 🚨 Auto Flood Alert (Realtime Trigger)
// =============================================================
exports.autoFloodAlert = onValueWritten(
  { ref: "/devices/{deviceId}/distance", region: "asia-southeast1" },
  async (event) => {
    const adminApp = getAdminApp();
    const db = adminApp.database();

    const deviceId = event.params.deviceId;
    const distance = event.data.after.val();

    if (distance == null) {
      console.log(`❌ No distance data for device ${deviceId}`);
      return null;
    }

    const deviceRef = db.ref(`/devices/${deviceId}`);
    const snapshot = await deviceRef.once("value");
    const deviceData = snapshot.val();

    if (!deviceData) {
      console.log(`⚠️ Device ${deviceId} not found`);
      return null;
    }

    const deviceName = deviceData.deviceName || "Unnamed Device";
    const deviceLocation = deviceData.deviceLocation || "Unknown Location";

    console.log(`📡 ${deviceName} @ ${deviceLocation} | Distance: ${distance} cm`);

    // ------------------ Determine Flood Status ------------------
    const status = getStatus(distance, deviceData);

    // ✅ Trigger SMS only when the status is CRITICAL
    if (status !== "Critical") {
      console.log(`ℹ️ Status for ${deviceName} is "${status}". SMS will only be sent on Critical level.`);
      return null;
    }

    // =============================================================
    // ⚙️ COOLDOWN LOGIC - Prevent spam alerts
    // =============================================================
    const alertRef = db.ref(`/alerts/${deviceId}`);
    const alertSnapshot = await alertRef.once("value");
    const alertData = alertSnapshot.val() || {};

    const now = Date.now();
    const lastAlert = alertData.lastAlert || 0;
    const diffMinutes = (now - lastAlert) / (1000 * 60);

    if (diffMinutes < 5) {
      console.log(`⏳ Skipping alert for ${deviceName} (Cooldown: ${diffMinutes.toFixed(1)} min)`);
      return null;
    }

    // =============================================================
    // 📤 Send SMS Alert
    // =============================================================
    try {
      const message = `🚨 FLOOD ALERT 🚨
Device: ${deviceName}
Location: ${deviceLocation}
Status: CRITICAL
Water Level: ${(distance / 100).toFixed(2)} m
Please take immediate action.`;

      await axios.post(
        SMS_API,
        {
          apikey: SMS_API_KEY,
          recipient: deviceData.contactNumber || "YOUR_DEFAULT_CONTACT",
          message,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(`✅ SMS alert sent for ${deviceName}`);

      // =============================================================
      // 💾 Update Firestore + RTDB logs
      // =============================================================
      await alertRef.update({
        lastAlert: now,
        lastStatus: status,
      });

      await db.ref(`/logs`).push({
        deviceId,
        deviceName,
        deviceLocation,
        distance,
        status,
        message,
        timestamp: adminApp.database.ServerValue.TIMESTAMP,
      });

      return null;
    } catch (error) {
      console.error(`❌ Failed to send SMS for ${deviceName}:`, error.message);
      throw new HttpsError("internal", "Failed to send SMS alert");
    }
  }
);

// =============================================================
// 🧭 Callable Function: Manual Alert
// =============================================================
exports.sendFloodAlertSMS = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const adminApp = getAdminApp();
    const { sensorName, deviceLocation, distance, contactNumber } = request.data;

    if (!sensorName || !deviceLocation || !distance || !contactNumber) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    try {
      const message = `🚨 FLOOD ALERT 🚨
Device: ${sensorName}
Location: ${deviceLocation}
Water Level: ${(distance / 100).toFixed(2)} m
Please take necessary precautions.`;

      await axios.post(
        SMS_API,
        {
          apikey: SMS_API_KEY,
          recipient: contactNumber,
          message,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(`📨 Manual SMS alert sent for ${sensorName}`);

      await adminApp.database().ref(`/manual_alerts`).push({
        sensorName,
        deviceLocation,
        distance,
        message,
        timestamp: adminApp.database.ServerValue.TIMESTAMP,
      });

      return { success: true, message: "Manual alert sent successfully." };
    } catch (error) {
      console.error("❌ Manual SMS failed:", error.message);
      throw new HttpsError("internal", "Failed to send manual alert.");
    }
  }
);
