import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../../../auth/firebase_auth";

// ✅ Sends SMS notifications via Firebase Cloud Functions
export const handleSendNotification = async (sensorName, deviceLocation, distance) => {
  try {
    const functions = getFunctions(app);
    const sendFloodAlertSMS = httpsCallable(functions, "sendFloodAlertSMS");

    const response = await sendFloodAlertSMS({
      sensorName,
      location: deviceLocation,
      distance,
    });

    if (response.data.success) {
      console.log(`✅ Alert sent successfully for ${sensorName}`);
      return { success: true, sensorName };
    } else {
      console.error("❌ SMS sending failed:", response.data);
      return { success: false };
    }
  } catch (error) {
    console.error("⚠️ Error triggering SMS alert:", error);
    return { success: false };
  }
};
