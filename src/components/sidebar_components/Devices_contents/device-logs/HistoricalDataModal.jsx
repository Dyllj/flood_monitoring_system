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
} from "recharts";
import "./historicalDataModal.css";

const HistoricalDataModal = ({ sensorId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxMetadata, setMaxMetadata] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
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
          const minuteKey = `${log.dateObj.getFullYear()}-${log.dateObj.getMonth()}-${log.dateObj.getDate()}-${log.dateObj.getHours()}-${log.dateObj.getMinutes()}`;
          if (!seenMinutes.has(minuteKey)) {
            seenMinutes.add(minuteKey);
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
        setLoading(false);
      } catch (err) {
        console.error("Error fetching historical logs:", err);
        setLoading(false);
      }
    };

    fetchLogs();
  }, [sensorId]);

  const applyFilter = () => {
    if (!filterStart || !filterEnd) return;
    const startTimestamp = new Date(filterStart).getTime();
    const endTimestamp = new Date(filterEnd).getTime();

    const newFiltered = logs.filter(
      (log) => log.timestamp >= startTimestamp && log.timestamp <= endTimestamp
    );
    setFilteredLogs(newFiltered);
    setFilterOpen(false);
  };

  if (loading) return <div className="modal">Loading...</div>;

  const yDomain = [0, maxMetadata.maxHeight || 7];

  return (
    <div className="modal-overlay" id="historical-data-overlay" onClick={onClose}>
      <div className="modal-container" id="historical-data-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Close icon */}
        <HiMiniXMark className="modal-close-icon" onClick={onClose} />

        {/* Filter icon */}
        <TbFilterCog
          className="modal-filter-icon"
          onClick={() => setFilterOpen(true)}
        />
         
        <div className="history-container">
          <h2 id="history-title">{sensorId} Historical Data</h2>
        </div>

        {filteredLogs.length === 0 ? (
          <p>No historical data available for this sensor.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={filteredLogs} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid stroke="rgba(0, 0, 0, 0.5)" />
              <YAxis domain={yDomain} label={{ value: "Level (m)", angle: -90, position: "insideLeft" }} />
              <XAxis dataKey="date" />
              <Tooltip />
              <ReferenceLine
                y={maxMetadata.maxHeight}
                stroke="#8884d8"
                strokeDasharray="3 3"
                label={{ value: "Max Height", position: "top", fill: "#8884d8", fontSize: 12 }}
              />
              <ReferenceLine
                y={maxMetadata.normalLevel}
                stroke="#82ca9d"
                strokeDasharray="3 3"
                label={{ value: "Normal Level", position: "top", fill: "#82ca9d", fontSize: 12 }}
              />
              <ReferenceLine
                y={maxMetadata.alertLevel}
                stroke="#ff7300"
                strokeDasharray="3 3"
                label={{ value: "Alert Level", position: "top", fill: "#ff7300", fontSize: 12 }}
              />
              <Area type="linear" dataKey="distance" stroke="#061694ff" strokeWidth={5} fill="none" name="Water Distance (m)" style={{ pointerEvents: "none" }}/>
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Filter modal */}
        {filterOpen && (
          <div className="filter-modal-overlay" id="history-filter-overlay" onClick={() => setFilterOpen(false)}>
            <div className="filter-modal-container" id="history-filter-container" onClick={(e) => e.stopPropagation()}>
              <h3>Filter Historical Data</h3>
              <label>
                Start Date & Time:
                <input
                  type="datetime-local"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                />
              </label>
              <label>
                End Date & Time:
                <input
                  type="datetime-local"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                />
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
