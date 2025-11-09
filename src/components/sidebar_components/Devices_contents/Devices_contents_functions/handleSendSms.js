import { httpsCallable } from "firebase/functions";
import { functions } from "../../../../auth/firebase_auth"; // adjust the path if needed

// 🔔 Handles sending an SMS alert through Cloud Function
export const handleSendSms = async (sensorName) => {
  try {
    const sendFloodAlertSMS = httpsCallable(functions, "sendFloodAlertSMS");
    const response = await sendFloodAlertSMS({ sensorName });
    console.log("✅ SMS Alert Sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to send SMS:", error.message);
    throw error;
  }
};
