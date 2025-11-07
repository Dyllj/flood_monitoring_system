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
import { handleSendNotification } from "./Devices_contents_functions/handleSendNotification";
import { getStatus } from "./Devices_contents_functions/getStatus";
import { getColor } from "./Devices_contents_functions/getColor";
import SmsAlertSuccess from "../../custom-notification/for-sms-alert/sms-alert-success";
import SmsAlertFailed from "../../custom-notification/for-sms-alert/sms-alert-failed";

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

  const [showSmsAlert, setShowSmsAlert] = useState(false);
  const [showSmsAlertFailed, setShowSmsAlertFailed] = useState(false);

  // 🔹 Firestore listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "devices"), (snapshot) => {
      const updatedDevices = [];
      snapshot.forEach((doc) =>
        updatedDevices.push({ id: doc.id, ...doc.data() })
      );
      setDevices(updatedDevices);

      // Maintain sensor status
      snapshot.forEach((doc) => {
        const device = doc.data();
        setSensorData((prev) => ({
          ...prev,
          [device.sensorName]: {
            ...prev[device.sensorName],
            status: device.status || "active",
          },
        }));
      });
    });
    return () => unsub();
  }, []);

  // 🔹 Realtime DB listener for sensor data
  useEffect(() => {
    const listeners = [];
    devices.forEach((device) => {
      const sensorRef = ref(realtimeDB, `realtime/${device.sensorName}`);
      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Convert from cm → m
          const distanceMeters = (data.distance || 0) / 100;

          setSensorData((prev) => ({
            ...prev,
            [device.sensorName]: {
              distance: distanceMeters, // store in meters
              timestamp: data.timestamp,
              status: prev[device.sensorName]?.status || "inactive",
            },
          }));

          // Update chart history (in meters)
          setChartHistory((prev) => {
            const prevData = prev[device.sensorName] || [];
            const newPoint = {
              time: new Date().toLocaleTimeString(),
              value: parseFloat(distanceMeters.toFixed(2)),
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

  const addSensorTooltip = () => {
    const parent = document.querySelector(".sensor-label");
    if (!parent) return;
    if (parent.querySelector(".input-tooltip")) return;
    const tooltip = document.createElement("span");
    tooltip.innerText = "This field cannot be edited!";
    tooltip.className = "input-tooltip";
    parent.appendChild(tooltip);
  };

  const removeSensorTooltip = () => {
    const parent = document.querySelector(".sensor-label");
    if (!parent) return;
    const tooltip = parent.querySelector(".input-tooltip");
    if (tooltip) tooltip.remove();
  };

  return (
    <>
      {showSmsAlert && <SmsAlertSuccess />}
      {showSmsAlertFailed && <SmsAlertFailed />}

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
          const distance = parseFloat(reading.distance || 0); // in meters
          const maxHeight = parseFloat(device.maxHeight || 6.0); // in meters
          const normalLevel = parseFloat(device.normalLevel || 2.0);
          const alertLevel = parseFloat(device.alertLevel || 4.0);

          const status = getStatus(distance, normalLevel, alertLevel);
          const color = getColor(distance, normalLevel, alertLevel);
          const chartData = chartHistory[device.sensorName] || [];

          const percentage = Math.min((distance / maxHeight) * 100, 100);
          const dotStatus = reading.status || "active";

          return (
            <div key={device.id} className="device-card shadow">
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
                    style={{ backgroundColor: status.color }}
                  >
                    {status.text}
                  </span>

                  {isAdmin && (
                    <>
                      <button
                        className="notify-btn"
                        onClick={async () => {
                          try {
                            const res = await handleSendNotification(
                              device.sensorName,
                              device.location,
                              distance
                            );
                            if (res.success) {
                              setShowSmsAlert(true);
                              setTimeout(() => setShowSmsAlert(false), 4000);
                            } else {
                              setShowSmsAlertFailed(true);
                              setTimeout(
                                () => setShowSmsAlertFailed(false),
                                4000
                              );
                            }
                          } catch (err) {
                            console.error(err);
                            setShowSmsAlertFailed(true);
                            setTimeout(() => setShowSmsAlertFailed(false), 4000);
                          }
                        }}
                      >
                        <MdOutlineNotificationsActive />
                      </button>

                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleEdit(device, setEditingDevice, setEditData)
                        }
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

              {/* DEVICE INFO */}
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
                  <strong>Max Height:</strong> {maxHeight.toFixed(2)} m
                </p>
                <p>
                  <strong>Normal Level:</strong> {normalLevel.toFixed(2)} m
                </p>
              </div>

              <p className="level-text">
                Current Level: <b>{distance.toFixed(2)} m</b> /{" "}
                {maxHeight.toFixed(2)} m
              </p>

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
                <strong>Alert Level:</strong> {alertLevel.toFixed(2)} m
              </div>

              {/* REALTIME CHART */}
              <div className="waterlevel-chart-container">
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, maxHeight]} />
                    <CartesianGrid stroke="rgba(16,16,16,0.2)" />
                    <defs>
                      <linearGradient
                        id={`waterColor-${device.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>

                    <Area
                      type="natural"
                      dataKey="value"
                      stroke={color}
                      fill={`url(#waterColor-${device.id})`}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
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
                Alert Level (m):
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

      {/* ADD DEVICE MODAL */}
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
