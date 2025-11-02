import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const handleGenerateReport = (filteredLogs, startDate, endDate) => {
  if (filteredLogs.length === 0) {
    alert("No logs available to export!");
    return;
  }

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
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDistance = Math.max(...distances);
    const minDistance = Math.min(...distances);
    const peakLog = logsForSensor.find((l) => l.distance === maxDistance);
    const peakTime = peakLog ? new Date(peakLog.timestamp).toLocaleString("en-PH") : "N/A";

    const floodEvents = logsForSensor.filter(
      (l) =>
        l.status?.toLowerCase().includes("elevated") ||
        l.status?.toLowerCase().includes("critical") ||
        l.status?.toLowerCase().includes("flood")
    ).length;

    const avgFloodRate = ((floodEvents / logsForSensor.length) * 100).toFixed(2);

    const statusCount = {};
    logsForSensor.forEach((l) => {
      const s = l.status || "Unknown";
      statusCount[s] = (statusCount[s] || 0) + 1;
    });
    const statusSummary = Object.entries(statusCount)
      .map(([k, v]) => `${k}: ${((v / logsForSensor.length) * 100).toFixed(1)}%`)
      .join(", ");

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
