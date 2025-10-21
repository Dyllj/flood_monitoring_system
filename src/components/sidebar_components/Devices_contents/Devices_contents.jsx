// ✅ Import core React features
import { useState, useEffect } from "react";
import "../sidebar_contents_styles.css";

// ✅ Import icons for UI actions
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";
import { MdDeleteOutline } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { MdOutlineNotificationsActive } from "react-icons/md";

// ✅ Import AddDevice form component
import AddDevice from "../../add-forms/Add-device";

// ✅ Firebase imports for Firestore, Realtime Database, and Functions
import { db, realtimeDB } from "../../../auth/firebase_auth";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";

// ✅ Charting components for device data visualization
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

// ✅ External helper functions
import { handleDelete } from "./Devices_contents_functions/handleDelete";
import { handleEdit } from "./Devices_contents_functions/handleEdit";
import { handleEditSubmit } from "./Devices_contents_functions/handleEditSubmit";
import { handleSendNotification } from "./Devices_contents_functions/handleSendNotification";
import { getStatus } from "./Devices_contents_functions/getStatus";
import { getColor } from "./Devices_contents_functions/getColor";
import { createChartData } from "./Devices_contents_functions/createChartData";

// ✅ Main component for displaying and managing devices
const Devices_contents = ({ isAdmin }) => {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [editData, setEditData] = useState({
    sensorName: "",
    location: "",
    description: "",
  });

  // ✅ Firestore real-time listener: updates device list dynamically
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

  // ✅ Realtime Database listener: listens to live sensor data
  useEffect(() => {
    const listeners = [];
    devices.forEach((device) => {
      const sensorRef = ref(realtimeDB, `realtime/${device.sensorName}`);
      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSensorData((prev) => ({
            ...prev,
            [device.sensorName]: {
              distance: data.distance,
              timestamp: data.timestamp,
            },
          }));
        }
      });
      listeners.push(() => off(sensorRef, "value", unsubscribe));
    });
    return () => listeners.forEach((unsub) => unsub());
  }, [devices]);

  return (
    <>
      {/* Background or section styling */}
      <div className="devices-contents"></div>

      {/* Section header */}
      <div className="devices_contents2">
        <ImLocation />
        <h2>Devices Location</h2>
      </div>

      {/* Add Device button (Admin only) */}
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

      {/* Device Cards Grid */}
      <div className="devices-grid">
        {devices.map((device) => {
          const reading = sensorData[device.sensorName] || {};
          const distance = reading.distance || 0;
          const status = getStatus(distance);
          const color = getColor(distance);

          return (
            <div key={device.id} className="device-card shadow">
              {/* Device Header */}
              <div className="device-header">
                <h3>{device.sensorName}</h3>
                <div className="device-actions">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: status.color }}
                  >
                    {status.text}
                  </span>

                  {isAdmin && (
                    <>
                      {/* Notify button */}
                      <button
                        className="notify-btn"
                        onClick={() =>
                          handleSendNotification(
                            device.sensorName,
                            device.location,
                            distance
                          )
                            .then(() =>
                              alert(
                                `Notification triggered for ${device.sensorName}`
                              )
                            )
                            .catch(() =>
                              alert("Failed to send alert. Check console.")
                            )
                        }
                      >
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

              {/* Device metadata */}
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

              {/* Progress bar */}
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

              {/* Mini chart */}
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

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <AddDevice onClose={() => setShowAddDevice(false)} />
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
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
                Sensor Name:
                <input
                  type="text"
                  value={editData.sensorName}
                  onChange={(e) =>
                    setEditData({ ...editData, sensorName: e.target.value })
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
