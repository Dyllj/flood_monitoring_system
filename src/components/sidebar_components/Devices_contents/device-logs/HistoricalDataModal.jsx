import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../auth/firebase_auth";
import { HiMiniXMark } from "react-icons/hi2";
import { TbFilterCog } from "react-icons/tb";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  Legend,
} from "recharts";

import "./historicalDataModal.css";

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p><strong>{label}</strong></p>
        {payload.map((p, idx) => (
          <p key={idx} style={{ color: p.stroke || "#000" }}>{`${p.name}: ${p.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const HistoricalDataModal = ({ sensorId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [combinedDeviceLogs, setCombinedDeviceLogs] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxMetadata, setMaxMetadata] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        // 1. Fetch historical device logs (distance)
        const logsRef = collection(db, "devices-logs", sensorId, "logs");
        const logsSnapshot = await getDocs(logsRef);
        const logsData = logsSnapshot.docs.map((doc) => doc.data());

        const chartData = logsData
          .map((item) => {
            const dateObj = new Date(
              item.lastUpdate?.toDate ? item.lastUpdate.toDate() : item.lastUpdate
            );

            setMaxMetadata({
              maxHeight: item.maxHeight,
              normalLevel: item.normalLevel,
              alertLevel: item.alertLevel,
            });

            return { dateObj, distance: item.distance };
          })
          .sort((a, b) => a.dateObj - b.dateObj);

        const uniqueLogs = [];
        const seenMinutes = new Set();

        chartData.forEach((log) => {
          const key = `${log.dateObj.getFullYear()}-${log.dateObj.getMonth()}-${log.dateObj.getDate()}-${log.dateObj.getHours()}-${log.dateObj.getMinutes()}`;
          if (!seenMinutes.has(key)) {
            seenMinutes.add(key);
            uniqueLogs.push({
              date: log.dateObj.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              timestamp: log.dateObj.getTime(),
              distance: log.distance,
            });
          }
        });

        setLogs(uniqueLogs);
        setFilteredLogs(uniqueLogs);

        // 2. Fetch online/offline logs
        const onlineRef = collection(db, "devices-logs", sensorId, "device-online-logs");
        const offlineRef = collection(db, "devices-logs", sensorId, "device-offline-logs");
        const [onlineSnap, offlineSnap] = await Promise.all([getDocs(onlineRef), getDocs(offlineRef)]);

        const onlineData = onlineSnap.docs.map((doc) => {
          const d = doc.data();
          const dateObj = new Date(d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp);
          return { timestamp: dateObj.getTime(), date: dateObj.toLocaleString(), online: 1, offline: 0 };
        });

        const offlineData = offlineSnap.docs.map((doc) => {
          const d = doc.data();
          const dateObj = new Date(d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp);
          return { timestamp: dateObj.getTime(), date: dateObj.toLocaleString(), online: 0, offline: 1 };
        });

        // Combine online/offline
        const statusMap = new Map();
        [...onlineData, ...offlineData].forEach((log) => {
          if (!statusMap.has(log.timestamp)) {
            statusMap.set(log.timestamp, { timestamp: log.timestamp, date: log.date, online: 0, offline: 0 });
          }
          const record = statusMap.get(log.timestamp);
          record.online += log.online;
          record.offline += log.offline;
        });

        setCombinedDeviceLogs([...statusMap.values()].sort((a, b) => a.timestamp - b.timestamp));

        // 3. Fetch Alert_logs for this sensor
        const alertRef = collection(db, "Alert_logs");
        const alertSnapshot = await getDocs(alertRef);
        const allAlerts = alertSnapshot.docs.map((doc) => doc.data());
        const sensorAlerts = allAlerts.filter((alert) => alert.sensorName === sensorId);

        const alertMap = {};
        sensorAlerts.forEach((alert) => {
          const dateKey = new Date(alert.timestamp?.toDate ? alert.timestamp.toDate() : alert.timestamp).toLocaleString();
          if (!alertMap[dateKey]) alertMap[dateKey] = { time: dateKey, Automatic: 0, Manual: 0 };
          if (alert.type === "Automatic") alertMap[dateKey].Automatic += 1;
          else if (alert.type === "Manual") alertMap[dateKey].Manual += 1;
        });

        setAlertLogs(Object.values(alertMap).sort((a, b) => new Date(a.time) - new Date(b.time)));

        setLoading(false);
      } catch (err) {
        console.error("Error fetching logs:", err);
        setLoading(false);
      }
    };

    fetchAllLogs();
  }, [sensorId]);

  const applyFilter = () => {
    if (!filterStart || !filterEnd) return;
    const start = new Date(filterStart).getTime();
    const end = new Date(filterEnd).getTime();
    setFilteredLogs(logs.filter((log) => log.timestamp >= start && log.timestamp <= end));
    setFilterOpen(false);
  };

  if (loading) return <div className="modal">Loading...</div>;

  const yDomain = [0, maxMetadata.maxHeight || 7];

  return (
    <div className="modal-overlay" id="historical-data-overlay" onClick={onClose}>
      <div className="modal-container" id="historical-data-container" onClick={(e) => e.stopPropagation()}>
        <HiMiniXMark className="modal-close-icon" onClick={onClose} />
        <TbFilterCog className="modal-filter-icon" onClick={() => setFilterOpen(true)} />

        <div className="history-container">
          <h2 id="history-title">{sensorId} Historical Data</h2>
        </div>

        {filteredLogs.length === 0 ? (
          <p>No historical data.</p>
        ) : (
          <div className="charts-grid">
            {/* Historical Device Data */}
            <div className="grid-item">
              <h3>Historical Data</h3>
              <div className="area-chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={filteredLogs}>
                    <CartesianGrid stroke="rgba(0,0,0,0.5)" />
                    <YAxis domain={yDomain} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={() => ""} 
                      axisLine={{ stroke: "rgba(0,0,0,0.5)" }} 
                      tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={maxMetadata.maxHeight} stroke="#8884d8" strokeDasharray="1.5 1.5" label={{ value: "Max Height" }} />
                    <ReferenceLine y={maxMetadata.normalLevel} stroke="#82ca9d" strokeDasharray="1.5 1.5" label={{ value: "Normal" }} />
                    <ReferenceLine y={maxMetadata.alertLevel} stroke="#ff7300" strokeDasharray="1.5 1.5" label={{ value: "Alert" }} />
                    <Area type="linear" dataKey="distance" stroke="#061694" strokeWidth={2} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alert Frequency Chart (Automatic / Manual) */}
            <div className="grid-item">
              <h3>SMS Alert Frequency</h3>
              <div className="area-chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={alertLogs}>
                    <CartesianGrid stroke="rgba(0,0,0,0.5)" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={() => ""} 
                      axisLine={{ stroke: "rgba(0,0,0,0.5)" }} 
                      tickLine={false} 
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="Automatic" stroke="#00C853" fill="#00C85333" />
                    <Area type="monotone" dataKey="Manual" stroke="#2962FF" fill="#2962FF33" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          {/* Offline Logs Table */}
          <div className="grid-item">
            <h3>Offline Logs</h3>
            <div className="status-table-wrapper">
              {combinedDeviceLogs.filter((l) => l.offline === 1).length === 0 ? (
                <p>No offline logs available.</p>
              ) : (
                <table className="status-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedDeviceLogs
                      .filter((l) => l.offline === 1)
                      .sort((a, b) => b.timestamp - a.timestamp) // sort descending
                      .map((log, i) => (
                        <tr key={i}>
                          <td>{log.date}</td>
                          <td className="offline-status">Offline</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Online Logs Table */}
          <div className="grid-item">
            <h3>Online Logs</h3>
            <div className="status-table-wrapper">
              {combinedDeviceLogs.filter((l) => l.online === 1).length === 0 ? (
                <p>No online logs available.</p>
              ) : (
                <table className="status-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedDeviceLogs
                      .filter((l) => l.online === 1)
                      .sort((a, b) => b.timestamp - a.timestamp) // sort descending
                      .map((log, i) => (
                        <tr key={i}>
                          <td>{log.date}</td>
                          <td className="online-status">Online</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          </div>
        )}

        {/* FILTER MODAL */}
        {filterOpen && (
          <div className="filter-modal-overlay" id="history-filter-overlay" onClick={() => setFilterOpen(false)}>
            <div className="filter-modal-container" id="history-filter-container" onClick={(e) => e.stopPropagation()}>
              <h3>Filter Historical Data</h3>
              <label>
                Start Date:
                <input type="datetime-local" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
              </label>
              <label>
                End Date:
                <input type="datetime-local" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
              </label>
              <div className="history-filter">
                <button id="apply-filter" onClick={applyFilter}>Apply Filter</button>
                <button id="cancel-filter" onClick={() => setFilterOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalDataModal;
