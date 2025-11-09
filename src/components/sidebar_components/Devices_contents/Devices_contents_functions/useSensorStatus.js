import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { realtimeDB } from "../../../../auth/firebase_auth";

/**
 * Custom hook to track sensor distance and status (active/inactive)
 * @param {Array} devices - Array of devices from Firestore
 * @param {number} inactiveTimeout - milliseconds before marking inactive (default 90s)
 */
export const useSensorStatus = (devices, inactiveTimeout = 90_000) => {
  const [sensorData, setSensorData] = useState({});
  const [chartHistory, setChartHistory] = useState({});

  useEffect(() => {
    // Initialize all devices as inactive
    const initialData = {};
    devices.forEach((device) => {
      initialData[device.sensorName] = {
        distance: 0,
        timestamp: null,
        status: "inactive",
      };
    });
    setSensorData(initialData);

    const listeners = [];

    devices.forEach((device) => {
      const sensorRef = ref(realtimeDB, `realtime/${device.sensorName}`);
      let timeoutId;

      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          clearTimeout(timeoutId);

          setSensorData((prev) => ({
            ...prev,
            [device.sensorName]: {
              distance: data.distance,
              timestamp: data.timestamp,
              status: "active",
            },
          }));

          // Mark as inactive if no new data for inactiveTimeout
          timeoutId = setTimeout(() => {
            setSensorData((prev) => ({
              ...prev,
              [device.sensorName]: {
                ...prev[device.sensorName],
                status: "inactive",
              },
            }));
          }, inactiveTimeout);

          // Update chart history
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

      listeners.push(() => {
        clearTimeout(timeoutId);
        off(sensorRef, "value", unsubscribe);
      });
    });

    return () => listeners.forEach((unsub) => unsub());
  }, [devices, inactiveTimeout]);

  return { sensorData, chartHistory };
};
