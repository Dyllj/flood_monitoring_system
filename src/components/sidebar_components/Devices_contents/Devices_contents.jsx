import { useState, useEffect } from "react";
import "../sidebar_contents_styles.css";
import "../../sidebar_components/sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";
import { MdDeleteOutline } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { MdOutlineNotificationsActive } from "react-icons/md";
import AddDevice from "../../add-forms/Add-device";
import { db, realtimeDB } from "../../../auth/firebase_auth";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { handleDelete } from "./Devices_contents_functions/handleDelete";
import { handleEdit } from "./Devices_contents_functions/handleEdit";
import { handleEditSubmit } from "./Devices_contents_functions/handleEditSubmit";
import { getStatus } from "./Devices_contents_functions/getStatus";
import { getColor } from "./Devices_contents_functions/getColor";
import { handleSendSms } from "./Devices_contents_functions/handleSendSms";
// import SmsAlertSuccess from "../../custom-notification/for-sms-alert/sms-alert-success";
// import SmsAlertFailed from "../../custom-notification/for-sms-alert/sms-alert-failed";

const Devices_contents = ({ isAdmin }) => {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [chartHistory, setChartHistory] = useState({});
  const [editingDevice, setEditingDevice] = useState(null);
  const [editData, setEditData] = useState({
    sensorName: "",
    location: "",
    description: "",
    maxHeight: "",
    normalLevel: "",
    alertLevel: "",
  });

  // const [showSmsAlert, setShowSmsAlert] = useState(false);
  // const [showSmsAlertFailed, setShowSmsAlertFailed] = useState(false);

  // ----------------------------
  // Firestore listener (with device status)
  // ----------------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "devices"), (snapshot) => {
      const updatedDevices = [];
      snapshot.forEach((doc) =>
        updatedDevices.push({ id: doc.id, ...doc.data() })
      );
      setDevices(updatedDevices);

      // 🔹 Extract active/inactive status for dots
      snapshot.forEach((doc) => {
        const device = doc.data();
        setSensorData((prev) => ({
          ...prev,
          [device.sensorName]: {
            ...prev[device.sensorName],
            status: device.status || "inactive",
          },
        }));
      });
    });

    return () => unsub();
  }, []);

  // ----------------------------
  // Realtime DB listener for distance readings (in meters)
  // ----------------------------
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
              distance: data.distance, // in meters
              timestamp: data.timestamp,
              status: prev[device.sensorName]?.status || "inactive",
            },
          }));

          // Add chart data (using meters)
          setChartHistory((prev) => {
            const prevData = prev[device.sensorName] || [];
            const newPoint = {
              time: new Date().toLocaleTimeString(),
              value: data.distance, // meters (removed * 100)
            };
            const updated = [...prevData, newPoint];
            if (updated.length > 30) updated.shift();
            return { ...prev, [device.sensorName]: updated };
          });
        }
      });

      listeners.push(() => off(sensorRef, "value", unsubscribe));
    });

    return () => listeners.forEach((unsub) => unsub());
  }, [devices]);

  // ----------------------------
  // Tooltip for non-editable sensor name
  // ----------------------------
  const addSensorTooltip = () => {
    const parent = document.querySelector(".sensor-label");
    if (!parent || parent.querySelector(".input-tooltip")) return;
    const tooltip = document.createElement("span");
    tooltip.innerText = "This field cannot be edited!";
    tooltip.className = "input-tooltip";
    parent.appendChild(tooltip);
  };

  const removeSensorTooltip = () => {
    const parent = document.querySelector(".sensor-label");
    const tooltip = parent?.querySelector(".input-tooltip");
    if (tooltip) tooltip.remove();
  };

  // ----------------------------
  // Wrapper for edit (kept in meters)
  // ----------------------------
  const handleEditWrapper = (device) => {
    const deviceInMeters = {
      ...device,
      maxHeight: (device.maxHeight || 6).toString(),
      normalLevel: (device.normalLevel || 2).toString(),
      alertLevel: (device.alertLevel || 4).toString(),
    };
    handleEdit(deviceInMeters, setEditingDevice, setEditData);
  };

  // ----------------------------
  // Main UI
  // ----------------------------
  return (
    <>
      {/* {showSmsAlert && <SmsAlertSuccess />}
      {showSmsAlertFailed && <SmsAlertFailed />} */}

      <div className="devices-contents"></div>

      <div className="devices_contents2">
        <ImLocation />
        <h2>Devices Location</h2>
      </div>

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

      {/* DEVICE CARDS */}
      <div className="devices-grid">
        {devices.map((device) => {
          const reading = sensorData[device.sensorName] || {};
          const distance = parseFloat(reading.distance) || 0; // meters
          const maxHeight = device.maxHeight || 6;
          const normalLevel = device.normalLevel || 2;
          const alertLevel = device.alertLevel || 4;

          const status = getStatus(distance, normalLevel, alertLevel);
          const color = getColor(distance, normalLevel, alertLevel);
          const chartData = chartHistory[device.sensorName] || [];
          const percentage = Math.min((distance / maxHeight) * 100, 100);
          const dotStatus = reading.status || "active";

          return (
            <div key={device.id} className="device-card shadow">
              {/* Header */}
              <div className="device-header">
                <h3>
                  <span
                    className={`status-dot ${
                      dotStatus === "active" ? "active" : "inactive"
                    }`}
                    data-status={dotStatus === "active" ? "Active" : "Inactive"}
                  ></span>
                  {device.sensorName}
                </h3>

                <div className="device-actions">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: color }}
                  >
                    {status}
                  </span>

                  {isAdmin && (
                    <>
                      {/* 🔔 Notify (SMS Alert) */}
                      <button
                        className="notify-btn"
                        onClick={async () => {
                          try {
                            const res = await handleSendSms(device.sensorName);
                            alert(`✅ SMS Alert sent successfully to all authorized personnel!`);
                            console.log(res);
                          } catch (err) {
                              console.error("❌ SMS Alert Error:", err);
                              alert("❌ Failed to send SMS Alert. Please check your connection or backend logs.");
                            }

                        }}
                      >
                        <MdOutlineNotificationsActive />
                      </button>

                      {/* ⚙️ Edit */}
                      <button
                        className="edit-btn"
                        onClick={() => handleEditWrapper(device)}
                      >
                        <IoSettingsOutline />
                      </button>

                      {/* 🗑️ Delete */}
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

              {/* Info Section */}
              <div className="device-meta">
                <p>
                  <strong>Location:</strong> {device.location || "Unknown"}
                </p>
                {device.description && (
                  <p>
                    <strong>Description:</strong> {device.description}
                  </p>
                )}
                <p>
                  <strong>Max Height:</strong> {maxHeight} m
                </p>
                <p>
                  <strong>Normal Level:</strong> {normalLevel} m
                </p>
              </div>

              <p className="level-text">
                Current Level: <b>{distance.toFixed(2)} m</b> / {maxHeight} m
              </p>

              {/* Progress Bar */}
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${percentage}%`,
                    background: color,
                  }}
                ></div>

                <div
                  className={`progress-alert-line ${
                    percentage >= (alertLevel / maxHeight) * 100
                      ? "exceeded"
                      : ""
                  }`}
                  style={{
                    left: `${(alertLevel / maxHeight) * 100}%`,
                  }}
                ></div>
              </div>

              <div className="alert-row">
                <strong>⚠️ Alert Level:</strong> {alertLevel} m
              </div>

              {/* Chart */}
              <div className="waterlevel-chart-container">
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <XAxis dataKey="time"/>
                    <YAxis domain={[0, maxHeight]} />
                    <CartesianGrid stroke="rgba(16,16,16,0.5)" />

                    <defs>
                      <linearGradient
                        id={`waterColor-${device.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={color}
                          stopOpacity={0.6}
                        >
                          <animate
                            attributeName="stopColor"
                            values={`${color};${color}`}
                            dur="1.2s"
                            fill="freeze"
                          />
                        </stop>
                        <stop
                          offset="100%"
                          stopColor={color}
                          stopOpacity={0.1}
                        >
                          <animate
                            attributeName="stopColor"
                            values={`${color};${color}`}
                            dur="1.2s"
                            fill="freeze"
                          />
                        </stop>
                      </linearGradient>
                    </defs>

                    <Area
                      type="natural"
                      dataKey="value"
                      stroke={color}
                      fill={`url(#waterColor-${device.id})`}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      className="waterlevel-area"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit Device Metadata</h2>
            <form
              onSubmit={(e) =>
                handleEditSubmit(e, editingDevice, editData, setEditingDevice)
              }
            >
              <label className="sensor-label">
                Sensor Name:
                <input
                  type="text"
                  value={editData.sensorName}
                  readOnly
                  className="locked-input"
                  onMouseEnter={addSensorTooltip}
                  onMouseLeave={removeSensorTooltip}
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

              <label>
                Max Height (m):
                <input
                  type="number"
                  value={editData.maxHeight}
                  onChange={(e) =>
                    setEditData({ ...editData, maxHeight: e.target.value })
                  }
                />
              </label>

              <label>
                Normal Level (m):
                <input
                  type="number"
                  value={editData.normalLevel}
                  onChange={(e) =>
                    setEditData({ ...editData, normalLevel: e.target.value })
                  }
                />
              </label>

              <label>
                Alert Level Trigger (m):
                <input
                  type="number"
                  value={editData.alertLevel}
                  onChange={(e) =>
                    setEditData({ ...editData, alertLevel: e.target.value })
                  }
                />
              </label>

              <div className="modal-actions">
                <button type="submit" id="save_changes">
                  Save Changes
                </button>
                <button
                  type="button"
                  id="cancel_save"
                  onClick={() => setEditingDevice(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <AddDevice onClose={() => setShowAddDevice(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Devices_contents;
