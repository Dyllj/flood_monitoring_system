// src/components/sidebar_components/Devices_contents/Devices_contents.jsx

import { useState, useEffect, useRef } from "react";
import "../../sidebar_components/sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";
import { MdDeleteOutline } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { LuChevronsLeftRight } from "react-icons/lu";
import { MdOutlineNotificationsActive } from "react-icons/md";
import { MdOutlineEditNotifications } from "react-icons/md";

import AddDevice from "../../add-forms/Add-device.jsx";
import { db, realtimeDB } from "../../../auth/firebase_auth.js";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, onValue, off, get, onChildAdded, onChildChanged } from "firebase/database";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { handleDelete } from "../Devices_contents/Devices_contents_functions/handleDelete.js";
import { handleEdit } from "../Devices_contents/Devices_contents_functions/handleEdit.js";
import { handleEditSubmit } from "../Devices_contents/Devices_contents_functions/handleEditSubmit.js";
import { getStatus } from "../Devices_contents/Devices_contents_functions/getStatus.js";
import { getColor } from "../Devices_contents/Devices_contents_functions/getColor.js";
import SmsAlertSuccess from "../../custom-notification/for-sms-alert/sms-alert-success.jsx";
import SmsAlertFailed from "../../custom-notification/for-sms-alert/sms-alert-failed.jsx";
import AutoSmsAlertSuccess from "../../custom-notification/for-sms-alert/auto-sms-alert-success.jsx";
import { handleSendSms } from "../Devices_contents/Devices_contents_functions/handleSendSms.js";

import HistoricalDataModal from "./device-logs/HistoricalDataModal.jsx";
import EditAlertTemplateModal from "../Devices_contents/messageTempModal/EditAlertTemplateModal.jsx";

// Import new notifications
import EditDeviceSuccess from "../../custom-notification/for-edit-device/edit-device-success.jsx";
import EditDeviceFailed from "../../custom-notification/for-edit-device/edit-device-failed.jsx";
import DeleteDeviceSuccess from "../../custom-notification/for-delete-device/delete-device-success.jsx";
import DeleteDeviceFailed from "../../custom-notification/for-delete-device/delete-device-failed.jsx";
import MessageEditedSuccess from "../../custom-notification/for-edit-sms-format/message-edited.jsx";

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
  
  // SMS Alert notifications
  const [showSmsAlert, setShowSmsAlert] = useState(false);
  const [showSmsAlertFailed, setShowSmsAlertFailed] = useState(false);

  // Auto-sms alert state + seen-tracker ref
  const [autoSmsAlert, setAutoSmsAlert] = useState(null);
  const autoAlertSeenRef = useRef({});

  // Historical modal state
  const [historicalModalSensor, setHistoricalModalSensor] = useState(null);

  // Edit alert template modal state
  const [showEditAlertTemplate, setShowEditAlertTemplate] = useState(false);

  // NEW: Device Edit/Delete notifications
  const [showEditDeviceSuccess, setShowEditDeviceSuccess] = useState(false);
  const [showEditDeviceFailed, setShowEditDeviceFailed] = useState(false);
  const [showDeleteDeviceSuccess, setShowDeleteDeviceSuccess] = useState(false);
  const [showDeleteDeviceFailed, setShowDeleteDeviceFailed] = useState(false);
  const [showMessageEdited, setShowMessageEdited] = useState(false);

  // ----------------------------
  // Firestore listener (devices)
  // ----------------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "devices"), (snapshot) => {
      const updatedDevices = [];
      snapshot.forEach((doc) =>
        updatedDevices.push({ id: doc.id, ...doc.data() })
      );
      setDevices(updatedDevices);

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
  // Realtime DB listener (sensor readings)
  // ----------------------------
  useEffect(() => {
    const listeners = [];

    devices.forEach((device) => {
      const sensorRef = ref(realtimeDB, `realtime/${device.sensorName}`);
      const handler = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSensorData((prev) => ({
            ...prev,
            [device.sensorName]: {
              distance: data.distance,
              timestamp: data.timestamp,
              status: prev[device.sensorName]?.status || "inactive",
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
      };

      onValue(sensorRef, handler);
      listeners.push(() => off(sensorRef, "value", handler));
    });

    return () => listeners.forEach((unsub) => unsub());
  }, [devices]);

  // ----------------------------
  // Realtime DB listener (alerts)
  // ----------------------------
  useEffect(() => {
    const alertsRef = ref(realtimeDB, "alerts");
    let initialized = false;

    get(alertsRef)
      .catch(() => null)
      .then(() => {
        initialized = true;
      });

    const handleChildAdded = (snap) => {
      if (!initialized) return;
      const alertObj = snap.val();
      const sensorName = snap.key;
      if (!alertObj) return;
      if (alertObj.auto_sent) {
        if (autoAlertSeenRef.current[sensorName]) return;
        autoAlertSeenRef.current[sensorName] = true;
        setAutoSmsAlert({
          sensorName,
          location: alertObj.location || "",
          status: alertObj.status || "",
        });
        setTimeout(() => setAutoSmsAlert(null), 4000);
      }
    };

    const handleChildChanged = (snap) => {
      const alertObj = snap.val();
      const sensorName = snap.key;
      if (!alertObj) return;
      if (alertObj.auto_sent) {
        if (autoAlertSeenRef.current[sensorName]) return;
        autoAlertSeenRef.current[sensorName] = true;
        setAutoSmsAlert({
          sensorName,
          location: alertObj.location || "",
          status: alertObj.status || "",
        });
        setTimeout(() => setAutoSmsAlert(null), 4000);
      }
    };

    onChildAdded(alertsRef, handleChildAdded);
    onChildChanged(alertsRef, handleChildChanged);

    return () => {
      off(alertsRef, "child_added", handleChildAdded);
      off(alertsRef, "child_changed", handleChildChanged);
    };
  }, []);

  function addSensorTooltip() {
    const parent = document.querySelector(".sensor-label");
    if (!parent || parent.querySelector(".input-tooltip")) return;
    const tooltip = document.createElement("span");
    tooltip.innerText = "This field cannot be edited!";
    tooltip.className = "input-tooltip";
    parent.appendChild(tooltip);
  }

  const removeSensorTooltip = () => {
    const parent = document.querySelector(".sensor-label");
    const tooltip = parent?.querySelector(".input-tooltip");
    if (tooltip) tooltip.remove();
  };

  const handleEditWrapper = (device) => {
    const deviceInMeters = {
      ...device,
      maxHeight: (device.maxHeight || 6).toString(),
      normalLevel: (device.normalLevel || 2).toString(),
      alertLevel: (device.alertLevel || 4).toString(),
    };
    handleEdit(deviceInMeters, setEditingDevice, setEditData);
  };

  // Enhanced delete handler with notifications
  const handleDeleteWithNotification = async (deviceId) => {
    try {
      await handleDelete(deviceId);
      setShowDeleteDeviceSuccess(true);
      setTimeout(() => setShowDeleteDeviceSuccess(false), 4000);
    } catch (error) {
      console.error("Delete failed:", error);
      setShowDeleteDeviceFailed(true);
      setTimeout(() => setShowDeleteDeviceFailed(false), 4000);
    }
  };

  // Enhanced edit submit handler with notifications
  const handleEditSubmitWithNotification = async (e, editingDevice, editData, setEditingDevice) => {
    e.preventDefault();
    try {
      await handleEditSubmit(e, editingDevice, editData, setEditingDevice);
      setShowEditDeviceSuccess(true);
      setTimeout(() => setShowEditDeviceSuccess(false), 4000);
    } catch (error) {
      console.error("Edit failed:", error);
      setShowEditDeviceFailed(true);
      setTimeout(() => setShowEditDeviceFailed(false), 4000);
    }
  };

  return (
    <>
      {/* Manual SMS notifications */}
      {showSmsAlert && <SmsAlertSuccess onClose={() => setShowSmsAlert(false)} />}
      {showSmsAlertFailed && <SmsAlertFailed onClose={() => setShowSmsAlertFailed(false)} />}

      {/* Auto SMS notification */}
      {autoSmsAlert && (
        <AutoSmsAlertSuccess
          sensorName={autoSmsAlert.sensorName}
          subText={`${autoSmsAlert.location} — ${autoSmsAlert.status}`}
          onClose={() => setAutoSmsAlert(null)}
        />
      )}

      {/* NEW: Device Edit/Delete notifications */}
      {showEditDeviceSuccess && <EditDeviceSuccess onClose={() => setShowEditDeviceSuccess(false)} />}
      {showEditDeviceFailed && <EditDeviceFailed onClose={() => setShowEditDeviceFailed(false)} />}
      {showDeleteDeviceSuccess && <DeleteDeviceSuccess onClose={() => setShowDeleteDeviceSuccess(false)} />}
      {showDeleteDeviceFailed && <DeleteDeviceFailed onClose={() => setShowDeleteDeviceFailed(false)} />}
      {showMessageEdited && <MessageEditedSuccess onClose={() => setShowMessageEdited(false)} />}

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
          const distance = parseFloat(reading.distance) || 0;
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
                      <button
                        className="edit-notify-btn"
                        title="Edit notification template"
                        onClick={() => {
                          setShowEditAlertTemplate(true);
                        }}
                      >
                        <MdOutlineEditNotifications />
                      </button>

                      <button
                        className="notify-btn"
                        onClick={async () => {
                          try {
                            await handleSendSms(device.sensorName);
                            setShowSmsAlert(true);
                            setTimeout(() => setShowSmsAlert(false), 4000);
                          } catch (err) {
                            console.log(err);
                            setShowSmsAlertFailed(true);
                            setTimeout(() => setShowSmsAlertFailed(false), 4000);
                          }
                        }}
                      >
                        <MdOutlineNotificationsActive />
                      </button>

                      <button
                        className="edit-btn"
                        onClick={() => handleEditWrapper(device)}
                      >
                        <IoSettingsOutline />
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteWithNotification(device.id)}
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
                <strong>Alert Level:</strong> {alertLevel} m
              </div>

              <div className="waterlevel-chart-container">
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <XAxis dataKey="time" hide/>
                    <YAxis domain={[0, maxHeight]} />
                    <CartesianGrid stroke="rgba(0, 0, 0, 1)" />
                    <defs>
                      <linearGradient
                        id={`waterColor-${device.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1.1"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="linear"
                      dataKey="value"
                      stroke={color}
                      fill={`url(#waterColor-${device.id})`}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={true}
                      className="waterlevel-area"
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {isAdmin && (
                <LuChevronsLeftRight
                  className="chart-toggle-icon"
                  onClick={() => setHistoricalModalSensor(device.sensorName)}
                />
              )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Data Modal */}
      {historicalModalSensor && (
        <HistoricalDataModal
          sensorId={historicalModalSensor}
          onClose={() => setHistoricalModalSensor(null)}
        />
      )}

      {/* Edit Alert Template Modal */}
      {showEditAlertTemplate && (
        <EditAlertTemplateModal
          onClose={() => {
            setShowEditAlertTemplate(false);
            // Show success notification after closing
            setShowMessageEdited(true);
            setTimeout(() => setShowMessageEdited(false), 4000);
          }}
        />
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit Device Metadata</h2>
            <form
              onSubmit={(e) =>
                handleEditSubmitWithNotification(e, editingDevice, editData, setEditingDevice)
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