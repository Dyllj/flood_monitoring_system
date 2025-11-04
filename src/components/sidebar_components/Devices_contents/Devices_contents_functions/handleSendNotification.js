import { sendFloodAlertSMS } from "../../../../auth/firebase_auth";

export const handleSendNotification = async (sensorName, deviceLocation, distance) => {
  try {
    const response = await sendFloodAlertSMS({
      sensorName,
      location: deviceLocation,
      distance,
    });

    // ✅ callable function response is wrapped in .data
    const data = response.data;

    if (data && data.success) {
      console.log(`✅ Alert sent successfully for ${sensorName}`);
      console.log("SMS results:", data.results);
      return { success: true, sensorName, results: data.results };
    } else {
      console.error("❌ SMS sending failed:", data);
      return { success: false };
    }
  } catch (error) {
    console.error("⚠️ Error triggering SMS alert:", error);
    return { success: false };
  }
};
