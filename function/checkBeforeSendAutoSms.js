// functions/checkBeforeSendAutoSms.js

/**
 * Checks if a device is active and has sent recent data.
 * @param {string} deviceStatus - "active" or "inactive" from Firestore.
 * @param {number} lastUpdateTimestamp - Last reading timestamp in milliseconds.
 * @param {number} thresholdMs - Max allowed gap before considering inactive (default: 90_000ms ~1.5 minutes)
 * @returns {boolean} - True if device is active and recent, false otherwise
 */
function canSendAutoSms(deviceStatus, lastUpdateTimestamp, thresholdMs = 90_000) {
  if (deviceStatus !== "active") return false;
  if (!lastUpdateTimestamp) return false;
  const now = Date.now();
  return now - lastUpdateTimestamp < thresholdMs;
}

module.exports = { canSendAutoSms };
