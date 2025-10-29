import './sidebar_contents_styles.css'
import { MdCreateNewFolder } from "react-icons/md";
import { TbFilterCog, TbLogs, TbSearch } from "react-icons/tb";
import { GrPowerReset } from "react-icons/gr";
import { FaCheck } from "react-icons/fa";
import { TiCancel } from "react-icons/ti";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../auth/firebase_auth";

const Logs_contents = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sensor, setSensor] = useState("All");
  const [sensorsList, setSensorsList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch sensors for filter dropdown
  useEffect(() => {
    const fetchSensors = async () => {
      const devicesRef = collection(db, "devices");
      const snapshot = await getDocs(devicesRef);
      const sensors = snapshot.docs.map(doc => doc.data().sensorName || doc.id);
      setSensorsList(sensors);
    };
    fetchSensors();
  }, []);

  // Fetch logs
  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const logsRef = collection(db, "Alert_logs");
        const q = query(logsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        if (isMounted) {
          const logsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
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

  // Filter logs based on modal selections
  const filteredLogs = logs
    .filter(log => {
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
    .filter(log => {
      // Filter by search term
      const term = searchTerm.toLowerCase();
      return (
        log.sensorName?.toLowerCase().includes(term) ||
        log.location?.toLowerCase().includes(term) ||
        log.status?.toLowerCase().includes(term) ||
        log.type?.toLowerCase().includes(term)
      );
    });

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setSensor("All");
  };

  const handleSave = () => {
    console.log("Filters saved:", { startDate, endDate, sensor });
    setShowFilterModal(false);
  };

  const handleCancel = () => {
    setShowFilterModal(false);
  };

  return (
    <>
    <div className="logs-contents">

    </div>
      <div className="logs_contents2">
        <TbLogs />
        <h2>Logs</h2>
      </div>

      {/* Search Bar */}


      {/* Logs Table */}
      <div className="logs-contents-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) =>
              e.target.nextSibling.classList.replace("icon-left", "icon-right")
            }
            onBlur={(e) =>
              e.target.nextSibling.classList.replace("icon-right", "icon-left")
            }
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
              {filteredLogs.map(log => (
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
        <button className="report-btn">
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
