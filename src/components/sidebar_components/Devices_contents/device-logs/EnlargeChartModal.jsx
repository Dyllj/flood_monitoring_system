// EnlargedChartModal.jsx
// Location: src/components/sidebar_components/Devices_contents/device-logs/components/EnlargedChartModal.jsx

import { HiMiniXMark } from "react-icons/hi2";
import { TbFilterCog } from "react-icons/tb";
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
} from "recharts";

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

const EnlargedChartModal = ({
  chartType,
  onClose,
  filteredLogs,
  filteredTableLogs,
  combinedDeviceLogs,
  maxMetadata,
  onFilterClick,
  onGenerateTableReport,
  sensorId
}) => {
  const renderChartContent = () => {
    switch (chartType) {
      case 'historicalChart':
        return (
          <>
            <h3>
              <TbFilterCog className="filterIcon" onClick={onFilterClick} />
              Historical Data Chart - {sensorId}
            </h3>
            <div className="chart-enlarge-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredLogs}>
                  <CartesianGrid stroke="rgba(0,0,0,0.5)" />
                  <YAxis domain={[0, maxMetadata.maxHeight || 7]} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={() => ""}
                    axisLine={{ stroke: "rgba(0,0,0,0.5)" }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={maxMetadata.maxHeight}
                    stroke="#8884d8"
                    strokeDasharray="1.5 1.5"
                    label={{ value: "Max Height", className: "ref-line-label" }}
                  />
                  <ReferenceLine
                    y={maxMetadata.normalLevel}
                    stroke="#82ca9d"
                    strokeDasharray="1.5 1.5"
                    label={{ value: "Normal", className: "ref-line-label" }}
                  />
                  <ReferenceLine
                    y={maxMetadata.alertLevel}
                    stroke="#ff7300"
                    strokeDasharray="1.5 1.5"
                    label={{ value: "Alert", className: "ref-line-label" }}
                  />
                  <Area
                    type="linear"
                    dataKey="distance"
                    stroke="#061694"
                    strokeWidth={2}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        );

      case 'historicalTable':
        return (
          <>
            <h3>
              <TbFilterCog className="filterIcon" onClick={onFilterClick} />
              <MdOutlineCreateNewFolder
                className="generate-table-report-icon"
                onClick={onGenerateTableReport}
                title="Generate Table Report"
              />
              Historical Data Table - {sensorId}
            </h3>
            <div className="enlarged-table-wrapper">
              {filteredTableLogs.length === 0 ? (
                <p>No historical readings available.</p>
              ) : (
                <table className="status-table enlarged-table">
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
                        } else if (
                          log.distance > maxMetadata.normalLevel &&
                          log.distance < maxMetadata.alertLevel
                        ) {
                          status = "Elevated";
                          statusClass = "elevated-status";
                        }

                        return (
                          <tr key={i}>
                            <td>{log.date}</td>
                            <td>{maxMetadata.maxHeight || "N/A"}</td>
                            <td>{maxMetadata.normalLevel || "N/A"}</td>
                            <td>{maxMetadata.alertLevel || "N/A"}</td>
                            <td>{log.distance}</td>
                            <td className={statusClass}>{status}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        );

      case 'deviceStatus':
        return (
          <>
            <h3>Device Status Logs - {sensorId}</h3>
            <div className="enlarged-table-wrapper">
              {combinedDeviceLogs.length === 0 ? (
                <p>No status logs available.</p>
              ) : (
                <table className="status-table enlarged-table">
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
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="chart-enlarge-overlay" onClick={onClose}>
      <div className="chart-enlarge-container" onClick={(e) => e.stopPropagation()}>
        <HiMiniXMark className="chart-enlarge-close" onClick={onClose} />
        {renderChartContent()}
      </div>
    </div>
  );
};

export default EnlargedChartModal;