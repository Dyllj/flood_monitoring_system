import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../auth/firebase_auth";
import { HiMiniXMark } from "react-icons/hi2";
import { TbFilterCog } from "react-icons/tb";
import { FaCheck } from "react-icons/fa6";
import { TiCancel } from "react-icons/ti";
import { GrPowerReset } from "react-icons/gr";
import { MdOutlineCreateNewFolder } from "react-icons/md";

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
import { generateMDRRMOReport } from "./ReportGenerator/ReportGenerator";
import { generateTableReport } from "./ReportGenerator/TableReportGenerator";
import { useEnlargeChart } from "./useEnlargeChart";
import EnlargedChartModal from "./EnlargeChartModal";
import { createPortal } from "react-dom";

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
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [fullLogs, setFullLogs] = useState([]);
  const [filteredTableLogs, setFilteredTableLogs] = useState([]);
  const [combinedDeviceLogs, setCombinedDeviceLogs] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [fullAlertLogs, setFullAlertLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxMetadata, setMaxMetadata] = useState({});
  const [generatingReport, setGeneratingReport] = useState(false);

  // Use custom hook for enlargement
  const { enlargedChart, openEnlargedView, closeEnlargedView } = useEnlargeChart();

  // Filter modal state (for historical readings CHART)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterError, setFilterError] = useState("");

  // Alert filter modal state
  const [showAlertFilterModal, setShowAlertFilterModal] = useState(false);
  const [alertFilterStart, setAlertFilterStart] = useState("");
  const [alertFilterEnd, setAlertFilterEnd] = useState("");
  const [alertFilterError, setAlertFilterError] = useState("");

  // Table filter modal state
  const [showTableFilterModal, setShowTableFilterModal] = useState(false);
  const [tableFilterStart, setTableFilterStart] = useState("");
  const [tableFilterEnd, setTableFilterEnd] = useState("");
  const [tableFilterError, setTableFilterError] = useState("");

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

            setMaxMetadata((prev) => ({
              maxHeight: item.maxHeight ?? prev.maxHeight,
              normalLevel: item.normalLevel ?? prev.normalLevel,
              alertLevel: item.alertLevel ?? prev.alertLevel,
            }));

            return { dateObj, distance: item.distance };
          })
          .sort((a, b) => a.dateObj - b.dateObj);

        const uniqueLogs = [];
        const seenMinutes = new Set();

        chartData.forEach((log) => {
          const key = `${log.dateObj.getFullYear()}-${log.dateObj.getMonth()}-${log.dateObj.getDate()}-${log.dateObj.getHours()}-${log.dateObj.getMinutes()}`;
          if (!seenMinutes.has(key)) {
            seenMinutes.add(key);
            
            const month = String(log.dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(log.dateObj.getDate()).padStart(2, '0');
            const year = String(log.dateObj.getFullYear()).slice(-2);
            let hours = log.dateObj.getHours();
            const minutes = String(log.dateObj.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const formattedDate = `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
            
            uniqueLogs.push({
              date: formattedDate,
              timestamp: log.dateObj.getTime(),
              distance: log.distance,
            });
          }
        });

        setFullLogs(uniqueLogs);
        setFilteredLogs(uniqueLogs);
        setFilteredTableLogs(uniqueLogs);

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

        // 3. Fetch Alert_logs
        const alertRef = collection(db, "Alert_logs");
        const alertSnapshot = await getDocs(alertRef);
        const allAlerts = alertSnapshot.docs.map((doc) => doc.data());
        const sensorAlerts = allAlerts.filter((alert) => alert.sensorName === sensorId);

        const alertMap = {};
        sensorAlerts.forEach((alert) => {
          const dateObj = new Date(alert.timestamp?.toDate ? alert.timestamp.toDate() : alert.timestamp);
          const dateKey = dateObj.toLocaleString();
          const ts = dateObj.getTime();
          if (!alertMap[dateKey]) alertMap[dateKey] = { time: dateKey, timestamp: ts, Automatic: 0, Manual: 0 };
          if (alert.type === "Automatic") alertMap[dateKey].Automatic += 1;
          else if (alert.type === "Manual") alertMap[dateKey].Manual += 1;
        });

        const processedAlerts = Object.values(alertMap).sort((a, b) => a.timestamp - b.timestamp);
        setFullAlertLogs(processedAlerts);
        setAlertLogs(processedAlerts);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching logs:", err);
        setLoading(false);
      }
    };

    fetchAllLogs();
  }, [sensorId]);

  // Generate MDRRMO Report
  const handleGenerateReport = async () => {
    if (fullLogs.length === 0) {
      alert("No data available to generate report.");
      return;
    }

    setGeneratingReport(true);
    try {
      await generateMDRRMOReport(
        sensorId,
        fullLogs,
        fullAlertLogs,
        maxMetadata,
        filterStart,
        filterEnd
      );
      alert("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate Table Report
  const handleGenerateTableReport = async () => {
    if (filteredTableLogs.length === 0) {
      alert("No table data available to generate report.");
      return;
    }

    try {
      await generateTableReport(sensorId, filteredTableLogs, maxMetadata);
      alert("Table report generated successfully!");
    } catch (error) {
      console.error("Error generating table report:", error);
      alert("Failed to generate table report. Please try again.");
    }
  };

  // Filter handlers for Historical Chart
  const openFilterModal = () => {
    if (!fullLogs || fullLogs.length === 0) {
      setFilterStart("");
      setFilterEnd("");
    } else {
      const timestamps = fullLogs.map((l) => l.timestamp).sort((a, b) => a - b);
      const min = new Date(timestamps[0]);
      const max = new Date(timestamps[timestamps.length - 1]);
      const toLocalInput = (d) => d.toISOString().slice(0, 16);
      setFilterStart(toLocalInput(min));
      setFilterEnd(toLocalInput(max));
    }
    setFilterError("");
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    if (!filterStart || !filterEnd) {
      setFilterError("Both start and end date/time are required.");
      return;
    }
    const startTs = new Date(filterStart).getTime();
    const endTs = new Date(filterEnd).getTime();
    if (isNaN(startTs) || isNaN(endTs) || startTs > endTs) {
      setFilterError("Invalid date range. Ensure start is before end.");
      return;
    }

    const filtered = fullLogs.filter((l) => l.timestamp >= startTs && l.timestamp <= endTs);
    setFilteredLogs(filtered);
    setShowFilterModal(false);
  };

  const handleResetFilter = () => {
    setFilteredLogs(fullLogs);
    if (fullLogs && fullLogs.length > 0) {
      const timestamps = fullLogs.map((l) => l.timestamp).sort((a, b) => a - b);
      const min = new Date(timestamps[0]);
      const max = new Date(timestamps[timestamps.length - 1]);
      const toLocalInput = (d) => d.toISOString().slice(0, 16);
      setFilterStart(toLocalInput(min));
      setFilterEnd(toLocalInput(max));
    }
    setFilterError("");
    setShowFilterModal(false);
  };

  // Alert filter handlers
  const openAlertFilterModal = () => {
    if (!fullAlertLogs || fullAlertLogs.length === 0) {
      setAlertFilterStart("");
      setAlertFilterEnd("");
    } else {
      const timestamps = fullAlertLogs.map((l) => l.timestamp).sort((a, b) => a - b);
      const min = new Date(timestamps[0]);
      const max = new Date(timestamps[timestamps.length - 1]);
      const toLocalInput = (d) => d.toISOString().slice(0, 16);
      setAlertFilterStart(toLocalInput(min));
      setAlertFilterEnd(toLocalInput(max));
    }
    setAlertFilterError("");
    setShowAlertFilterModal(true);
  };

  const handleApplyAlertFilter = () => {
    if (!alertFilterStart || !alertFilterEnd) {
      setAlertFilterError("Both start and end date/time are required.");
      return;
    }
    const startTs = new Date(alertFilterStart).getTime();
    const endTs = new Date(alertFilterEnd).getTime();
    if (isNaN(startTs) || isNaN(endTs) || startTs > endTs) {
      setAlertFilterError("Invalid date range. Ensure start is before end.");
      return;
    }

    const filtered = fullAlertLogs.filter((l) => l.timestamp >= startTs && l.timestamp <= endTs);
    setAlertLogs(filtered);
    setShowAlertFilterModal(false);
  };

  const handleResetAlertFilter = () => {
    setAlertLogs(fullAlertLogs);
    if (fullAlertLogs && fullAlertLogs.length > 0) {
      const timestamps = fullAlertLogs.map((l) => l.timestamp).sort((a, b) => a - b);
      const min = new Date(timestamps[0]);
      const max = new Date(timestamps[timestamps.length - 1]);
      const toLocalInput = (d) => d.toISOString().slice(0, 16);
      setAlertFilterStart(toLocalInput(min));
      setAlertFilterEnd(toLocalInput(max));
    }
    setAlertFilterError("");
    setShowAlertFilterModal(false);
  };

  // Table filter handlers
  const openTableFilterModal = () => {
    if (!fullLogs || fullLogs.length === 0) {
      setTableFilterStart("");
      setTableFilterEnd("");
    } else {
      const timestamps = fullLogs.map((l) => l.timestamp).sort((a, b) => a - b);
      const min = new Date(timestamps[0]);
      const max = new Date(timestamps[timestamps.length - 1]);
      const toLocalInput = (d) => d.toISOString().slice(0, 16);
      setTableFilterStart(toLocalInput(min));
      setTableFilterEnd(toLocalInput(max));
    }
    setTableFilterError("");
    setShowTableFilterModal(true);
  };

  const handleApplyTableFilter = () => {
    if (!tableFilterStart || !tableFilterEnd) {
      setTableFilterError("Both start and end date/time are required.");
      return;
    }
    const startTs = new Date(tableFilterStart).getTime();
    const endTs = new Date(tableFilterEnd).getTime();
    if (isNaN(startTs) || isNaN(endTs) || startTs > endTs) {
      setTableFilterError("Invalid date range. Ensure start is before end.");
      return;
    }

    const filtered = fullLogs.filter((l) => l.timestamp >= startTs && l.timestamp <= endTs);
    setFilteredTableLogs(filtered);
    setShowTableFilterModal(false);
  };

  const handleResetTableFilter = () => {
    setFilteredTableLogs(fullLogs);
    if (fullLogs && fullLogs.length > 0) {
      const timestamps = fullLogs.map((l) => l.timestamp).sort((a, b) => a - b);
      const min = new Date(timestamps[0]);
      const max = new Date(timestamps[timestamps.length - 1]);
      const toLocalInput = (d) => d.toISOString().slice(0, 16);
      setTableFilterStart(toLocalInput(min));
      setTableFilterEnd(toLocalInput(max));
    }
    setTableFilterError("");
    setShowTableFilterModal(false);
  };

  if (loading) return <div className="modal">Loading...</div>;

  const yDomain = [0, maxMetadata.maxHeight || 7];

  return (
    <>
      <div className="modal-overlay" id="historical-data-overlay" onClick={onClose}>
        <div className="modal-container" id="historical-data-container" onClick={(e) => e.stopPropagation()}>
          <HiMiniXMark className="modal-close-icon" onClick={onClose} />

          <div className="history-container">
            <h2 id="history-title">{sensorId} Historical Data</h2>
            <MdOutlineCreateNewFolder 
              className={`generate-report-icon ${generatingReport ? 'generating' : ''}`}
              onClick={handleGenerateReport}
              title="Generate MDRRMO Report"
              style={{ 
                cursor: generatingReport ? 'wait' : 'pointer',
                opacity: generatingReport ? 0.5 : 1 
              }}
            />
          </div>

          {filteredLogs.length === 0 ? (
            <p>No historical data.</p>
          ) : (
            <div className="charts-grid">
              {/* Historical Data Chart - CLICKABLE */}
              <div className="grid-item">
                <h3>
                  <TbFilterCog className="filterIcon" onClick={openFilterModal}/>
                  Historical Data Chart
                </h3>

                {showFilterModal && (
                  <FilterModal
                    title="Filter Historical Data Chart"
                    startValue={filterStart}
                    endValue={filterEnd}
                    onStartChange={setFilterStart}
                    onEndChange={setFilterEnd}
                    error={filterError}
                    onSave={handleApplyFilter}
                    onCancel={() => setShowFilterModal(false)}
                    onReset={handleResetFilter}
                  />
                )}

                <div 
                  className="area-chart-wrapper clickable-chart" 
                  onClick={() => openEnlargedView('historicalChart')}
                  title="Click to enlarge"
                >
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
                      <ReferenceLine y={maxMetadata.maxHeight} stroke="#8884d8" strokeDasharray="1.5 1.5" label={{ value: "Max Height", className: "ref-line-label" }} />
                      <ReferenceLine y={maxMetadata.normalLevel} stroke="#82ca9d" strokeDasharray="1.5 1.5" label={{ value: "Normal", className: "ref-line-label" }} />
                      <ReferenceLine y={maxMetadata.alertLevel} stroke="#ff7300" strokeDasharray="1.5 1.5" label={{ value: "Alert", className: "ref-line-label" }} />
                      <Area type="linear" dataKey="distance" stroke="#061694" strokeWidth={2} fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SMS Alert Frequency */}
              <div className="grid-item">
                <h3>
                  <TbFilterCog className="filterIcon" onClick={openAlertFilterModal}/>
                  SMS Alert Frequency
                </h3>

                {showAlertFilterModal && (
                  <FilterModal
                    title="Filter SMS Alerts"
                    startValue={alertFilterStart}
                    endValue={alertFilterEnd}
                    onStartChange={setAlertFilterStart}
                    onEndChange={setAlertFilterEnd}
                    error={alertFilterError}
                    onSave={handleApplyAlertFilter}
                    onCancel={() => setShowAlertFilterModal(false)}
                    onReset={handleResetAlertFilter}
                  />
                )}
 
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
                      <YAxis domain={[0, 50]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="Automatic" stroke="#00C853" fill="#00C85333" />
                      <Area type="monotone" dataKey="Manual" stroke="#2962FF" fill="#2962FF33" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
              {/* Historical Data Table - CLICKABLE */}
              <div className="grid-item">
                <h3>
                  <TbFilterCog className="filterIcon" onClick={openTableFilterModal}/>
                  Historical Data Table
                </h3>
 
                {showTableFilterModal && (
                  <FilterModal
                    title="Filter Historical Data Table"
                    startValue={tableFilterStart}
                    endValue={tableFilterEnd}
                    onStartChange={setTableFilterStart}
                    onEndChange={setTableFilterEnd}
                    error={tableFilterError}
                    onSave={handleApplyTableFilter}
                    onCancel={() => setShowTableFilterModal(false)}
                    onReset={handleResetTableFilter}
                  />
                )}
 
                <div 
                  className="status-table-wrapper clickable-table"
                  onClick={() => openEnlargedView('historicalTable')}
                  title="Click to enlarge"
                >
                  {filteredTableLogs.length === 0 ? (
                    <p>No historical readings available.</p>
                  ) : (
                    <table className="status-table">
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Max Height</th>
                          <th>Normal Level</th>
                          <th>Alert Level</th>
                          <th>Sensor Readings</th>
                          <th>Water Level Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTableLogs
                          .slice()
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((log, i) => {
                            let status = "Normal";
                            let statusClass = "normal-status";
                            
                            if (log.distance >= maxMetadata.alertLevel) {
                              status = "Critical";
                              statusClass = "critical-status";
                            } else if (log.distance > maxMetadata.normalLevel && log.distance < maxMetadata.alertLevel) {
                              status = "Elevated";
                              statusClass = "elevated-status";
                            }
                            
                            return (
                              <tr key={i}>
                                <td>{log.date}</td>
                                <td>{maxMetadata.maxHeight || 'N/A'}</td>
                                <td>{maxMetadata.normalLevel || 'N/A'}</td>
                                <td>{maxMetadata.alertLevel || 'N/A'}</td>
                                <td>{log.distance}</td>
                                <td className={statusClass}>{status}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Device Status Logs - CLICKABLE */}
              <div className="grid-item">
                <h3>Device Status Logs</h3>
                <div 
                  className="status-table-wrapper clickable-table"
                  onClick={() => openEnlargedView('deviceStatus')}
                  title="Click to enlarge"
                >
                  {combinedDeviceLogs.length === 0 ? (
                    <p>No status logs available.</p>
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
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((log, i) => (
                            <tr key={i}>
                              <td>{log.date}</td>
                              <td className={log.online === 1 ? "online-status" : "offline-status"}>
                                {log.online === 1 ? "Online" : "Offline"}
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <EnlargedChartModal
          chartType={enlargedChart}
          onClose={closeEnlargedView}
          filteredLogs={filteredLogs}
          filteredTableLogs={filteredTableLogs}
          combinedDeviceLogs={combinedDeviceLogs}
          maxMetadata={maxMetadata}
          onFilterClick={enlargedChart === 'historicalChart' ? openFilterModal : openTableFilterModal}
          onGenerateTableReport={handleGenerateTableReport}
          sensorId={sensorId}
        />
      )}
    </>
  );
};

function FilterModal({
  title,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  error,
  onSave,
  onCancel,
  onReset,
}) {
  if (!document || !document.body) return null;
  return createPortal(
    <div className="filter-historical-data-overlay" onClick={onCancel}>
      <div className="filter-historical-data-modal" onClick={(e) => e.stopPropagation()}>
        <h4>{title}</h4>
        <div className="filter-row">
          <label>Start</label>
          <input type="datetime-local" value={startValue} onChange={(e) => onStartChange(e.target.value)} />
        </div>
        <div className="filter-row">
          <label>End</label>
          <input type="datetime-local" value={endValue} onChange={(e) => onEndChange(e.target.value)} />
        </div>
        {error && <p className="filter-error">{error}</p>}
        <div className="filter-actions">
          <button className="filter-save" onClick={onSave} title="Save filter"><FaCheck /></button>
          <button className="filter-cancel" onClick={onCancel} title="Cancel"><TiCancel /></button>
          <button className="filter-reset" onClick={onReset} title="Reset filter"><GrPowerReset /></button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default HistoricalDataModal;