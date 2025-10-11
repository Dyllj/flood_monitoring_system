// ✅ Import core React features
import { useState, useEffect } from "react";
import "../sidebar_contents_styles.css";

// ✅ Import icons for UI actions
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";
import { MdDeleteOutline } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { MdOutlineNotificationsActive } from "react-icons/md";

// ✅ Import AddDevice form component for adding new devices
import AddDevice from "../../add-forms/Add-device";

// ✅ Firebase imports for Firestore and Realtime Database
import { db, realtimeDB } from "../../../auth/firebase_auth";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";

// ✅ Charting components for device data visualization
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

// ✅ Import separated utility functions for device actions and data processing
import { handleDelete } from "./Devices_contents_functions/handleDelete";
import { handleEdit } from "./Devices_contents_functions/handleEdit";
import { handleEditSubmit } from "./Devices_contents_functions/handleEditSubmit";
import { getStatus } from "./Devices_contents_functions/getStatus";
import { getColor } from "./Devices_contents_functions/getColor";
import { createChartData } from "./Devices_contents_functions/createChartData";

// Main component for displaying and managing devices
const Devices_contents = ({ isAdmin }) => {
  // State for modal visibility, device list, sensor data, and editing state
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    location: "",
    description: "",
  });

  // ✅ Firestore real-time listener: updates device list on any change in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "devices"), (snapshot) => {
      const updatedDevices = [];
      snapshot.forEach((doc) =>
        updatedDevices.push({ id: doc.id, ...doc.data() })
      );
      setDevices(updatedDevices);
    });
    return () => unsub();
  }, []);

  // ✅ Realtime Database listener: subscribes to each device's live sensor data
  useEffect(() => {
    const listeners = [];
    devices.forEach((device) => {
      const sensorRef = ref(realtimeDB, `realtime/${device.name}`);
      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSensorData((prev) => ({
            ...prev,
            [device.name]: {
              distance: data.distance,
              timestamp: data.timestamp,
            },
          }));
        }
      });
      listeners.push(() => off(sensorRef, "value", unsubscribe));
    });
    // Cleanup all listeners when devices list changes or component unmounts
    return () => listeners.forEach((unsub) => unsub());
  }, [devices]);

  return (
    <>
      {/* Background or section styling */}
      <div className="devices-contents"></div>

      {/* Section header with icon */}
      <div className="devices_contents2">
        <ImLocation />
        <h2>Devices Location</h2>
      </div>

      {/* Add Device button — visible only to Admin users */}
      <div className="devices-header">
        {isAdmin && (
          <button
            className="add-device-button"
            onClick={() => setShowAddDevice(true)}
          >
            <IoIosAdd />
          </button>
        )}
      </div>

      {/* Device Cards Grid: displays all devices with live data and admin controls */}
      <div className="devices-grid">
        {devices.map((device) => {
          // Get live reading for this device
          const reading = sensorData[device.name] || {};
          const distance = reading.distance || 0;
          // Compute status and color for UI
          const status = getStatus(distance);
          const color = getColor(distance);

          return (
            <div key={device.id} className="device-card shadow">
              {/* Device Header: name, status, and admin controls */}
              <div className="device-header">
                <h3>{device.name}</h3>
                <div className="device-actions">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: status.color }}
                  >
                    {status.text}
                  </span>
                  {isAdmin && (
                    <>
                      {/* Notify button (for future alert feature) */}
                      <button className="notify-btn">
                        <MdOutlineNotificationsActive />
                      </button>
                      {/* Edit button */}
                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleEdit(device, setEditingDevice, setEditData)
                        }
                      >
                        <IoSettingsOutline />
                      </button>
                      {/* Delete button */}
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(device.id)}
                      >
                        <MdDeleteOutline />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Device metadata: location and description */}
              <div className="device-meta">
                <p>
                  <strong>Location:</strong> {device.location || "Unknown"}
                </p>
                {device.description && (
                  <p>
                    <strong>Description:</strong> {device.description}
                  </p>
                )}
              </div>

              {/* Current water level */}
              <p className="level-text">
                Current Level: <b>{distance.toFixed(2)} cm</b> / 300 cm
              </p>

              {/* Progress bar for water level */}
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${(distance / 300) * 100}%`,
                    background: color,
                  }}
                ></div>
              </div>

              {/* Alert level row */}
              <div className="alert-row">
                <span>⚠ Alert Level</span>
                <span>{distance.toFixed(2)} cm</span>
              </div>

              {/* Mini chart for recent readings */}
              <div style={{ width: "100%", height: 70 }}>
                <ResponsiveContainer>
                  <LineChart data={createChartData(distance)}>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 300]} hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      animationDuration={500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Device Modal (shown when admin clicks +) */}
      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <AddDevice onClose={() => setShowAddDevice(false)} />
          </div>
        </div>
      )}

      {/* Edit Device Metadata Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Device Metadata</h2>
            <form
              onSubmit={(e) =>
                handleEditSubmit(e, editingDevice, editData, setEditingDevice)
              }
            >
              <label>
                Device Name:
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Device Location:
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) =>
                    setEditData({ ...editData, location: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Description:
                <input
                  type="text"
                  value={editData.description}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                />
              </label>
              <div className="modal-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => setEditingDevice(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Devices_contents;
