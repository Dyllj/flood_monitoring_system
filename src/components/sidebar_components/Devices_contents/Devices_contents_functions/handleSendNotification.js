import { sendFloodAlertSMS } from "../../../../auth/firebase_auth";

export const handleSendNotification = async (sensorName, deviceLocation, distance) => {
  try {
    const response = await sendFloodAlertSMS({
      sensorName,
      location: deviceLocation,
      distance,
    });

    if (response && response.success) {
      console.log(`✅ Alert sent successfully for ${sensorName}`);
      console.log("SMS results:", response.results);
      return { success: true, sensorName, results: response.results };
    } else {
      console.error("❌ SMS sending failed:", response);
      return { success: false };
    }
  } catch (error) {
    console.error("⚠️ Error triggering SMS alert:", error);
    return { success: false };
  }
};
