import { sendFloodAlertSMS } from "../../../../auth/firebase_auth";

export const handleSendNotification = async (sensorName, deviceLocation, distance) => {
  try {
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
