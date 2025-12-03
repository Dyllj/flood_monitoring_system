import "./../sidebar_contents_styles.css";
import { useState, useEffect } from "react";
import { TbLogs, TbSearch, TbFilterCog } from "react-icons/tb";
import { MdCreateNewFolder, MdDeleteOutline } from "react-icons/md";
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
import { handleDeleteLog, handleDeleteAllLogs } from "./Logs_contents_functions/handleDeleteLog";

// Import SMS Logs Report Success Notification
import SmsLogsReportSuccess from "../../custom-notification/for-generate-report/for-generate-smsLogs-report";

const Logs_contents = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sensor, setSensor] = useState("All");
  const [sensorsList, setSensorsList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // NEW: SMS Report generation notification
  const [showSmsReportSuccess, setShowSmsReportSuccess] = useState(false);

  useEffect(() => {
    fetchSensors(setSensorsList);
  }, []);

  useEffect(() => {
    fetchLogs(setLogs);
  }, []);

  const filteredLogs = filterLogs(logs, startDate, endDate, sensor, searchTerm);

  // Enhanced report generation handler with notification
  const handleGenerateReportWithNotification = () => {
    handleGenerateReport(filteredLogs, startDate, endDate);
    setShowSmsReportSuccess(true);
    setTimeout(() => setShowSmsReportSuccess(false), 4000);
  };

  return (
    <>
      {/* SMS Report Success Notification */}
      {showSmsReportSuccess && <SmsLogsReportSuccess onClose={() => setShowSmsReportSuccess(false)} />}

      <div className="logs-contents"></div>

      <div className="logs_contents2">
        <TbLogs />
        <h2>Logs</h2>
      </div>

      <div className="logs-contents-container">
        <div className="search-container">
          <TbSearch
            className={`search-icon ${isSearchFocused ? "icon-right" : "icon-left"}`}
          />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {/* Delete All Logs Icon */}

        </div>
            <MdDeleteOutline
            className="delete-all-icon"
            title="Delete all logs"
            onClick={() => handleDeleteAllLogs(setLogs)}
          />

        {filteredLogs.length === 0 ? (
          <p className="no-logs-msg">No logs available.</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Sensor</th>
                <th>Location</th>
                <th>Distance</th>
                <th>Status</th>
                <th>Type</th>
                <th>Action</th>
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
                  <td>
                    <button
                      className="delete-btn"
                      id="Delete-btn"
                      onClick={() => handleDeleteLog(log.id, setLogs)}
                      title="Delete log"
                    >
                      <MdDeleteOutline />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="report">
        <button
          className="filter-btn"
          onClick={() => setShowFilterModal(!showFilterModal)}
        >
          <TbFilterCog />
        </button>
        <button
          className="report-btn"
          onClick={handleGenerateReportWithNotification}
        >
          <MdCreateNewFolder />
        </button>
      </div>

      {showFilterModal && (
        <div
          className="filter-modal-overlay"
          onClick={() => handleCancel(setShowFilterModal)}
        >
          <div
            className="filter-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="filter-modal-header">
              <TbLogs size={22} />
              <h3>Log Filter</h3>
            </div>

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
              <button
                className="reset-btn-icon"
                onClick={() => handleReset(setStartDate, setEndDate, setSensor)}
              >
                <GrPowerReset />
              </button>
              <button
                className="save-btn-icon"
                onClick={() =>
                  handleSave(startDate, endDate, sensor, setShowFilterModal)
                }
              >
                <FaCheck />
              </button>
              <button
                className="cancel-btn-icon"
                onClick={() => handleCancel(setShowFilterModal)}
              >
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