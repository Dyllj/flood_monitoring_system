import { useState, useEffect } from "react";
import "../sidebar_contents_styles.css";
import "../../sidebar_components/sidebar_contents_styles.css"; // ✅ external ECG CSS
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
  LineChart,
  Line,
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
  });

  // ✅ Toast notification states
  const [showSmsAlert, setShowSmsAlert] = useState(false);
  const [showSmsAlertFailed, setShowSmsAlertFailed] = useState(false);

  // ✅ Load Firestore devices
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

  // ✅ Realtime listener per device
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

          setChartHistory((prev) => {
            const prevData = prev[device.sensorName] || [];
            const newPoint = {
              time: new Date().toLocaleTimeString(),
              value: data.distance,
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

  return (
    <>
      {/* ✅ Toast notifications */}
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

      <div className="devices-grid">
        {devices.map((device) => {
          const reading = sensorData[device.sensorName] || {};
          const distance = reading.distance || 0;
          const status = getStatus(distance);
          const color = getColor(distance);
          const chartData = chartHistory[device.sensorName] || [];

          return (
            <div key={device.id} className="device-card shadow">
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
                            setTimeout(
                              () => setShowSmsAlertFailed(false),
                              4000
                            );
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

              <p className="level-text">
                Current Level: <b>{Math.floor(distance)} cm</b> / 600 cm
              </p>

              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${(distance / 600) * 100}%`,
                    background: color,
                  }}
                ></div>
              </div>

              <div className="alert-row">
                <span>⚠ Alert Level</span>
                <span>{Math.floor(distance)} cm</span>
              </div>

              {/* ✅ Realtime ECG-like chart */}
              <div style={{ width: "100%", height: 70 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 600]} hide />
                    <CartesianGrid
                      stroke="rgba(16, 16, 16, 0.2)"
                      strokeDasharray="0"
                      vertical={true}
                      horizontal={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={600}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <AddDevice onClose={() => setShowAddDevice(false)} />
          </div>
        </div>
      )}

      {editingDevice && (
        <div
          className="modal-overlay"
          id="edit_modal_overlay"
          onClick={() => setEditingDevice(null)}
        >
          <div
            className="modal-container"
            id="edit_modal_container"
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
                  onMouseEnter={() => {
                    const tooltip = document.createElement("span");
                    tooltip.innerText = "This field cannot be edited!";
                    tooltip.className = "input-tooltip";
                    const parent = document.querySelector(".sensor-label");
                    parent.appendChild(tooltip);
                  }}
                  onMouseLeave={() => {
                    const tooltip = document.querySelector(".input-tooltip");
                    if (tooltip) tooltip.remove();
                  }}
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
    </>
  );
};

export default Devices_contents;
