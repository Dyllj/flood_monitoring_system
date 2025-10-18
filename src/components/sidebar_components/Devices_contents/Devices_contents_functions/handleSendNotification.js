import { sendFloodAlertSMS } from "../../../../auth/firebase_auth";

export const handleSendNotification = async (deviceName, deviceLocation, distance) => {
  try {
    const response = await sendFloodAlertSMS({
      location: deviceLocation,
      distance,
    });

    console.log("✅ SMS function response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending SMS alert:", error);
    throw error;
  }
};
