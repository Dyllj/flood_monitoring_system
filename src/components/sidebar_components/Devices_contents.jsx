import { useState, useEffect } from "react";
import "./sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";
import { MdDeleteOutline } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { MdOutlineNotificationsActive } from "react-icons/md";
import AddDevice from "../add-forms/Add-device";
import { db, realtimeDB } from "../../auth/firebase_auth";
import {
  collection,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

const Devices_contents = ({ isAdmin }) => {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    location: "",
    description: "",
  });

  // ✅ Firestore real-time listener for devices
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

  // ✅ RealtimeDB listener for each device
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

    return () => listeners.forEach((unsub) => unsub());
  }, [devices]);

  // ✅ Delete Device Metadata (Firestore only)
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "devices", id));
      console.log("Device deleted successfully");
    } catch (error) {
      console.error("Error deleting device:", error);
    }
  };

  // ✅ Edit Device Metadata
  const handleEdit = (device) => {
    setEditingDevice(device.id);
    setEditData({
      name: device.name,
      location: device.location,
      description: device.description || "",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "devices", editingDevice), {
        name: editData.name,
        location: editData.location,
        description: editData.description,
      });
      setEditingDevice(null);
      console.log("Device updated successfully");
    } catch (error) {
      console.error("Error updating device:", error);
    }
  };

  // ✅ Helpers for status
  const getStatus = (distance) => {
    if (distance < 100) return { text: "Normal", color: "#4CAF50" };
    if (distance < 180) return { text: "Elevated", color: "#FFC107" };
    return { text: "Critical", color: "#F44336" };
  };

  const getColor = (distance) => {
    if (distance < 100) return "#00C853";
    if (distance < 180) return "#FFD600";
    return "#D50000";
  };

  const createChartData = (distance) => {
    const points = [];
    for (let i = 0; i < 10; i++) {
      points.push({ time: i, value: distance + Math.random() * 5 - 2 });
    }
    return points;
  };

  return (
    <>
      {/* Section Titles */}
      <div className="devices-contents"></div>
      <div className="devices_contents2">
        <ImLocation />
        <h2>Devices Location</h2>
      </div>

      {/* Add Button */}
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

      {/* Device Grid */}
      <div className="devices-grid">
        {devices.map((device) => {
          const reading = sensorData[device.name] || {};
          const distance = reading.distance || 0;
          const status = getStatus(distance);
          const color = getColor(distance);

          return (
            <div key={device.id} className="device-card shadow">
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
                      <button className="notify-btn">
                        <MdOutlineNotificationsActive />
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(device)}
                      >
                        <IoSettingsOutline />
                      </button>
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

              {/* Metadata */}
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

              {/* Distance Display */}
              <p className="level-text">
                Current Level: <b>{distance.toFixed(2)} cm</b> / 300 cm
              </p>

              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${(distance / 300) * 100}%`,
                    background: color,
                  }}
                ></div>
              </div>

              <div className="alert-row">
                <span>⚠ Alert Level</span>
                <span>{distance.toFixed(2)} cm</span>
              </div>

              {/* Mini Line Chart */}
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

      {/* Edit Metadata Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Device Metadata</h2>
            <form onSubmit={handleEditSubmit}>
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
