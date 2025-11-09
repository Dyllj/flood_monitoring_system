import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { realtimeDB } from "../../../../auth/firebase_auth";

/**
 * Tracks sensor distance and auto-updates device status (active/inactive)
 * Status is based on last reading timestamp.
 */
export const useSensorStatus = (devices, inactiveTimeout = 90_000) => {
  const [sensorData, setSensorData] = useState({});
  const [chartHistory, setChartHistory] = useState({});

  useEffect(() => {
    if (!devices.length) return;

    const listeners = [];

    devices.forEach((device) => {
      const sensorRef = ref(realtimeDB, `realtime/${device.sensorName}`);
      let timeoutId;

      // Initialize device as inactive
      setSensorData((prev) => ({
        ...prev,
        [device.sensorName]: {
          distance: 0,
          timestamp: null,
          status: "inactive",
        },
      }));

      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        clearTimeout(timeoutId);

        const now = Date.now();
        const lastReadingTime = data.timestamp || now;

        // Compute active/inactive based on last reading
        const isActive = now - lastReadingTime < inactiveTimeout;

        setSensorData((prev) => ({
          ...prev,
          [device.sensorName]: {
            distance: data.distance,
            timestamp: lastReadingTime,
            status: isActive ? "active" : "inactive",
          },
        }));

        // Schedule automatic inactive if no new reading comes
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
