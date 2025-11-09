import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { realtimeDB } from "../../../../auth/firebase_auth";

/**
 * Tracks sensor distance and auto-updates device status (active/inactive)
 * If no data received for 90 seconds, mark inactive.
 */
export const useSensorStatus = (devices, inactiveTimeout = 90_000) => {
  const [sensorData, setSensorData] = useState({});
  const [chartHistory, setChartHistory] = useState({});

  useEffect(() => {
    if (!devices.length) return;

    const initialData = {};
    const listeners = [];

    // Set all devices inactive initially
    devices.forEach((device) => {
      initialData[device.sensorName] = {
        distance: 0,
        timestamp: null,
        status: "inactive",
      };

      const sensorRef = ref(realtimeDB, `realtime/${device.sensorName}`);
      let timeoutId;

      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        clearTimeout(timeoutId);

        // Update device as active
        setSensorData((prev) => ({
          ...prev,
          [device.sensorName]: {
            distance: data.distance,
            timestamp: data.timestamp,
            status: "active",
          },
        }));

        // Set back to inactive after timeout
        timeoutId = setTimeout(() => {
          setSensorData((prev) => ({
            ...prev,
            [device.sensorName]: {
              ...prev[device.sensorName],
              status: "inactive",
            },
          }));
        }, inactiveTimeout);

        // Chart history
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
      });

      listeners.push(() => {
        clearTimeout(timeoutId);
        off(sensorRef, "value", unsubscribe);
      });
    });

    setSensorData(initialData);

    return () => listeners.forEach((unsub) => unsub());
  }, [devices, inactiveTimeout]);

  return { sensorData, chartHistory };
};
