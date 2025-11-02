import "./sidebar_contents_styles.css";
import { useState, useEffect } from "react";
import { TbLogs, TbSearch, TbFilterCog } from "react-icons/tb";
import { MdCreateNewFolder } from "react-icons/md";
import { GrPowerReset } from "react-icons/gr";
import { FaCheck } from "react-icons/fa";
import { TiCancel } from "react-icons/ti";

import { fetchSensors } from "./Logs_contents_functions/fetchSensors";
import { fetchLogs } from "./Logs_contents_functions/fetchLogs";
import { filterLogs } from "./Logs_contents_functions/filterLogs";
import { handleGenerateReport } from "./Logs_contents_functions/handleGenerateReport";
import { handleReset } from "./Logs_contents_functions/handleReset";
import { handleSave } from "./Logs_contents_functions/handleSave";
import { handleCancel } from "./Logs_contents_functions/handleCancel";

const Logs_contents = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sensor, setSensor] = useState("All");
  const [sensorsList, setSensorsList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchSensors(setSensorsList); }, []);
  useEffect(() => { fetchLogs(setLogs); }, []);

  const filteredLogs = filterLogs(logs, startDate, endDate, sensor, searchTerm);

  return (
    <>
      <div className="logs_contents2">
        <TbLogs />
        <h2>Logs</h2>
      </div>

      {/* Logs Table */}
      <div className="logs-contents-container">
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
        <button className="filter-btn" onClick={() => setShowFilterModal(!showFilterModal)}>
          <TbFilterCog />
        </button>
        <button className="report-btn" onClick={() => handleGenerateReport(filteredLogs, startDate, endDate)}>
          <MdCreateNewFolder />
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={() => handleCancel(setShowFilterModal)}>
          <div className="filter-modal-container" onClick={(e) => e.stopPropagation()}>
            <h3>Log Filter</h3>
            <div className="filter-dates">
              <label>
                From:
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                To:
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>

            <div className="filter-sensor">
              <label>
                Sensor:
                <select value={sensor} onChange={(e) => setSensor(e.target.value)}>
                  <option value="All">All Sensors</option>
                  {sensorsList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="filter-actions">
              <button className="reset-btn-icon" onClick={() => handleReset(setStartDate, setEndDate, setSensor)}>
                <GrPowerReset />
              </button>
              <button className="save-btn-icon" onClick={() => handleSave(startDate, endDate, sensor, setShowFilterModal)}>
                <FaCheck />
              </button>
              <button className="cancel-btn-icon" onClick={() => handleCancel(setShowFilterModal)}>
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
