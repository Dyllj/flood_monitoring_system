import "./Forms.css";
import { useState } from "react";
import { MdOutlineSensors } from "react-icons/md";
import { ref, get } from "firebase/database";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { realtimeDB, db } from "../../auth/firebase_auth";

const AddDevice = ({ onClose }) => {
  const [sensorName, setSensorName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sensorName || !deviceLocation) {
      alert("Both fields are required!");
      return;
    }

    try {
      setLoading(true);
      const deviceRef = ref(realtimeDB, `realtime/${sensorName}`);

      // ✅ Check if sensor exists in RealtimeDB
      const snapshot = await get(deviceRef);
      if (!snapshot.exists()) {
        alert(`No device found in RealtimeDB with name "${sensorName}"`);
        return;
      }

      // ✅ Create Firestore metadata (renamed to sensorName)
      const deviceData = {
        sensorName: sensorName,
        location: deviceLocation,
        createdAt: serverTimestamp(),
      };

      // ✅ Save using sensorName as document ID
      await setDoc(doc(collection(db, "devices"), sensorName), deviceData);

      alert("Device successfully linked and added!");
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error adding device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="add-device-title">
        <MdOutlineSensors />
        <h2>Add New Device</h2>
      </div>
      <div className="add-device-form">
        <form onSubmit={handleSubmit}>
          <label id="label1">
            Sensor Name:
            <input
              type="text"
              value={sensorName}
              onChange={(e) => setSensorName(e.target.value)}
              placeholder="Must match DB key (e.g. sensor01)"
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
