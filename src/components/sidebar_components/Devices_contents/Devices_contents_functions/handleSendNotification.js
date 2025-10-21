// ================================
// 📲 handleSendNotification.js
// Trigger manual flood alert via Firebase Cloud Function
// ================================

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../../../auth/firebase_auth";

export const handleSendNotification = async (sensorName, deviceLocation, distance) => {
  try {
    const functions = getFunctions(app);
    const sendFloodAlertSMS = httpsCallable(functions, "sendFloodAlertSMS");

    // ✅ Match Firestore structure: use 'name' instead of 'sensorName'
    const response = await sendFloodAlertSMS({
      name: sensorName,
      location: deviceLocation,
      distance: distance,
    });

    if (response.data.success) {
      console.log(`✅ Alert sent successfully for ${sensorName}`);
      alert(`Flood alert sent for ${sensorName}!`);
    } else {
      console.error("❌ SMS sending failed:", response.data);
      alert("Failed to send flood alert.");
    }
  } catch (error) {
    console.error("⚠️ Error triggering SMS alert:", error);
    alert("Error sending SMS. Check console for details.");
  }
};
