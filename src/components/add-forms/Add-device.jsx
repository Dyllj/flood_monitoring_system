// ================================
// 🌊 ADD DEVICE FORM COMPONENT
// ================================

import "./Forms.css";
import { useState } from "react";
import { MdOutlineSensors } from "react-icons/md";
import { ref, get } from "firebase/database";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { realtimeDB, db } from "../../auth/firebase_auth";
import AddDeviceSuccess from "../custom-notification/for-add-device/add-device-success";
import AddDeviceFailed from "../custom-notification/for-add-device/add-device-failed";

const AddDevice = ({ onClose }) => {
  // ================================
  // ✅ Form State
  // ================================
  const [sensorName, setSensorName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [alertLevel, setAlertLevel] = useState("");
  const [normalLevel, setNormalLevel] = useState("");
  const [loading, setLoading] = useState(false);

  // ================================
  // ✅ Notification State
  // ================================
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [failedMsg, setFailedMsg] = useState({ message: "", subText: "" });

  // ================================
  // ✅ Handle Form Submission
  // ================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔹 Validate required fields
    if (!sensorName || !deviceLocation || !maxHeight || !alertLevel || !normalLevel) {
      setFailedMsg({
        message: "Missing required fields",
        subText: "Please fill in all fields before submitting",
      });
      setShowFailed(true);
      return;
    }

    setLoading(true);

    try {
      // 🔹 Check if sensor exists in RealtimeDB
      const deviceRef = ref(realtimeDB, `realtime/${sensorName}`);
      const snapshot = await get(deviceRef);

      if (!snapshot.exists()) {
        setFailedMsg({
          message: "Device not found",
          subText: `No device found in RealtimeDB with name "${sensorName}"`,
        });
        setShowFailed(true);
        return;
      }

      // 🔹 Prepare device data
      const deviceData = {
        sensorName,
        location: deviceLocation,
        maxHeight: parseFloat(maxHeight),
        normalLevel: parseFloat(normalLevel),
        alertLevel: parseFloat(alertLevel),
        unit: "m",
        waterLevelStatus: "normal",
        status: "inactive",
        lastUpdate: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      // 🔹 Save device in Firestore
      await setDoc(doc(collection(db, "devices"), sensorName), deviceData);

      // 🔹 Show success notification
      setShowSuccess(true);

      // 🔹 Auto-close form after 2 seconds
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error(error);
      setFailedMsg({
        message: "Error adding device",
        subText: "Please try again later or check your connection",
      });
      setShowFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // ✅ JSX
  // ================================
  return (
    <div>
      {/* Notifications */}
      <div style={{ position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 9999 }}>
        {showSuccess && (
          <AddDeviceSuccess
            onClose={() => setShowSuccess(false)}
            message="Device Added!"
            subText="Device successfully linked and stored"
          />
        )}
        {showFailed && (
          <AddDeviceFailed
            onClose={() => setShowFailed(false)}
            message={failedMsg.message}
            subText={failedMsg.subText}
          />
        )}
      </div>

      {/* Form Header */}
      <div className="add-device-title">
        <MdOutlineSensors />
        <h2>Add New Device</h2>
      </div>

      {/* Form */}
      <div className="add-device-form">
        <form onSubmit={handleSubmit}>
          <label id="label1">
            Sensor Name:
            <input
              type="text"
              value={sensorName}
              onChange={(e) => setSensorName(e.target.value)}
              placeholder='Must match DB key (e.g. "sensor01")'
              required
            />
          </label>

          <label>
            Device Location:
            <input
              type="text"
              value={deviceLocation}
              onChange={(e) => setDeviceLocation(e.target.value)}
              placeholder="e.g. River South Zone"
              required
            />
          </label>

          <label>
            Max Height (m):
            <input
              type="number"
              value={maxHeight}
              onChange={(e) => setMaxHeight(e.target.value)}
              placeholder="Enter height in meters"
              min="0"
              step="0.01"
              required
            />
          </label>

          <label>
            Normal Water Level (m):
            <input
              type="number"
              value={normalLevel}
              onChange={(e) => setNormalLevel(e.target.value)}
              placeholder="Enter normal level in meters"
              min="0"
              step="0.01"
              required
            />
          </label>

          <label>
            Alert Trigger Level (m):
            <input
              type="number"
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value)}
              placeholder="Enter alert level in meters"
              min="0"
              step="0.01"
              required
            />
          </label>

          <div className="devices-buttons">
            <button type="submit" id="add-device" disabled={loading}>
              {loading ? "Adding..." : "Add Device"}
            </button>
            <button type="button" id="close-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDevice;
