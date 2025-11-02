import "./sidebar_contents_styles.css";
import { MdCreateNewFolder } from "react-icons/md";
import { TbFilterCog, TbLogs, TbSearch } from "react-icons/tb";
import { GrPowerReset } from "react-icons/gr";
import { FaCheck } from "react-icons/fa";
import { TiCancel } from "react-icons/ti";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../auth/firebase_auth";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Logs_contents = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sensor, setSensor] = useState("All");
  const [sensorsList, setSensorsList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Fetch sensors for dropdown
  useEffect(() => {
    const fetchSensors = async () => {
      const devicesRef = collection(db, "devices");
      const snapshot = await getDocs(devicesRef);
      const sensors = snapshot.docs.map((doc) => doc.data().sensorName || doc.id);
      setSensorsList(sensors);
    };
    fetchSensors();
  }, []);

  // 🔹 Fetch logs
  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        const logsRef = collection(db, "Alert_logs");
        const q = query(logsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        if (isMounted) {
          const logsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setLogs(logsData);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  // 🔹 Filter logs
  const filteredLogs = logs
    .filter((log) => {
      const logDate = new Date(log.timestamp);
      const fromDate = startDate ? new Date(startDate) : null;
      const toDate = endDate ? new Date(endDate) : null;

      let dateMatch = true;
      let sensorMatch = true;

      if (fromDate) dateMatch = dateMatch && logDate >= fromDate;
      if (toDate) dateMatch = dateMatch && logDate <= toDate;
      if (sensor !== "All") sensorMatch = log.sensorName === sensor;

      return dateMatch && sensorMatch;
    })
    .filter((log) => {
      const term = searchTerm.toLowerCase();
      return (
        log.sensorName?.toLowerCase().includes(term) ||
        log.location?.toLowerCase().includes(term) ||
        log.status?.toLowerCase().includes(term) ||
        log.type?.toLowerCase().includes(term)
      );
    });

  // 🔹 Reset filters
  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setSensor("All");
  };

  // 🔹 Save filters
  const handleSave = () => {
    console.log("Filters saved:", { startDate, endDate, sensor });
    setShowFilterModal(false);
  };

  // 🔹 Cancel modal
  const handleCancel = () => {
    setShowFilterModal(false);
  };

  // 📊 Generate detailed Excel Report with Flood Rate %
  const handleGenerateReport = () => {
    if (filteredLogs.length === 0) {
      alert("No logs available to export!");
      return;
    }

    // Group logs by sensor
    const grouped = {};
    filteredLogs.forEach((log) => {
      const key = log.sensorName || "Unknown Sensor";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });

    const wb = XLSX.utils.book_new();

    Object.keys(grouped).forEach((sensorName) => {
      const logsForSensor = grouped[sensorName];
      const distances = logsForSensor.map((l) => l.distance || 0);

      // Compute metrics
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const maxDistance = Math.max(...distances);
      const minDistance = Math.min(...distances);
      const peakLog = logsForSensor.find((l) => l.distance === maxDistance);
      const peakTime = peakLog ? new Date(peakLog.timestamp).toLocaleString("en-PH") : "N/A";

      // Count flood events (Elevated, Critical, Flood)
      const floodEvents = logsForSensor.filter(
        (l) =>
          l.status?.toLowerCase().includes("elevated") ||
          l.status?.toLowerCase().includes("critical") ||
          l.status?.toLowerCase().includes("flood")
      ).length;

      // ✅ Average Flood Rate in Percentage
      const avgFloodRate = ((floodEvents / logsForSensor.length) * 100).toFixed(2);

      // Count statuses
      const statusCount = {};
      logsForSensor.forEach((l) => {
        const s = l.status || "Unknown";
        statusCount[s] = (statusCount[s] || 0) + 1;
      });
      const statusSummary = Object.entries(statusCount)
        .map(([k, v]) => `${k}: ${((v / logsForSensor.length) * 100).toFixed(1)}%`)
        .join(", ");

      // Create summary section
      const summary = [
        ["📘 Sensor Summary Report"],
        ["Sensor Name:", sensorName],
        ["Location:", logsForSensor[0]?.location || "N/A"],
        ["Date Range:", `${startDate || "All"} to ${endDate || "All"}`],
        ["Average Water Level (cm):", avgDistance.toFixed(2)],
        ["Average Flood Rate (%):", `${avgFloodRate}%`],
        ["Peak Water Level (cm):", maxDistance],
        ["Lowest Water Level (cm):", minDistance],
        ["Peak Flood Time:", peakTime],
        ["Flood Frequency (Elevated/Critical/Flood):", floodEvents],
        ["Status Breakdown:", statusSummary],
        [],
        ["Timestamp", "Sensor", "Location", "Distance (cm)", "Status", "Type"],
      ];

      const tableData = logsForSensor.map((log) => [
        new Date(log.timestamp).toLocaleString("en-PH"),
        log.sensorName,
        log.location,
        log.distance,
        log.status,
        log.type,
      ]);

      const sheetData = [...summary, ...tableData];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, sensorName.substring(0, 31));
    });

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const filename = `Flood_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
  };

  return (
    <>
      <div className="logs-contents"></div>
      <div className="logs_contents2">
        <TbLogs />
        <h2>Logs</h2>
      </div>

      {/* Logs Table */}
      <div className="logs-contents-container">
        {/* Search Bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <TbSearch className="search-icon icon-left" />
        </div>

        {filteredLogs.length === 0 ? (
          <p className="no-logs-msg">No logs available.</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Sensor</th>
                <th>Location</th>
                <th>Distance (cm)</th>
                <th>Status</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString("en-PH")}</td>
                  <td>{log.sensorName}</td>
                  <td>{log.location}</td>
                  <td>{log.distance}</td>
                  <td>{log.status}</td>
                  <td>{log.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Buttons */}
      <div className="report">
        <button
          className="filter-btn"
          onClick={() => setShowFilterModal(!showFilterModal)}
        >
          <TbFilterCog />
        </button>
        <button className="report-btn" onClick={handleGenerateReport}>
          <MdCreateNewFolder />
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={handleCancel}>
          <div
            className="filter-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Log Filter</h3>
            <div className="filter-dates">
              <label>
                From:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label>
                To:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>

            <div className="filter-sensor">
              <label>
                Sensor:
                <select
                  value={sensor}
                  onChange={(e) => setSensor(e.target.value)}
                >
                  <option value="All">All Sensors</option>
                  {sensorsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="filter-actions">
              <button className="reset-btn-icon" onClick={handleReset}>
                <GrPowerReset />
              </button>
              <button className="save-btn-icon" onClick={handleSave}>
                <FaCheck />
              </button>
              <button className="cancel-btn-icon" onClick={handleCancel}>
                <TiCancel />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Logs_contents;
