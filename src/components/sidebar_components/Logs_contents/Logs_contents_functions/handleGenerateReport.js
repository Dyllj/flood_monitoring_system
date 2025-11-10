// ===============================
// 🌊 Flood Logs - Generate Report (Fixed All Sensors)
// ===============================

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const handleGenerateReport = (filteredLogs, startDate, endDate) => {
  if (!filteredLogs || filteredLogs.length === 0) {
    alert("No logs available to export!");
    return;
  }

  // --- Group logs by normalized sensor name ---
  const grouped = {};
  filteredLogs.forEach((log) => {
    const originalName = log.sensorName || "Unknown Sensor";
    const key = originalName.trim().toLowerCase(); // normalize for grouping
    if (!grouped[key]) {
      grouped[key] = { name: originalName.trim(), logs: [] };
    }
    grouped[key].logs.push(log);
  });

  // --- Create workbook ---
  const wb = XLSX.utils.book_new();

  // --- Sort sensors alphabetically (Sensor01, Sensor02, etc.) ---
  const sortedSensors = Object.values(grouped).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  // --- Create one sheet per sensor ---
  sortedSensors.forEach((group) => {
    const { name: sensorName, logs } = group;
    const distances = logs.map((l) => l.distance || 0);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDistance = Math.max(...distances);
    const minDistance = Math.min(...distances);
    const peakLog = logs.find((l) => l.distance === maxDistance);
    const peakTime = peakLog ? new Date(peakLog.timestamp).toLocaleString("en-PH") : "N/A";

    const floodEvents = logs.filter(
      (l) =>
        l.status?.toLowerCase().includes("elevated") ||
        l.status?.toLowerCase().includes("critical") ||
        l.status?.toLowerCase().includes("flood")
    ).length;

    const avgFloodRate = ((floodEvents / logs.length) * 100).toFixed(2);

    const statusCount = {};
    logs.forEach((l) => {
      const s = l.status || "Unknown";
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    const statusSummary = Object.entries(statusCount)
      .map(([k, v]) => `${k}: ${((v / logs.length) * 100).toFixed(1)}%`)
      .join(", ");

    const summary = [
      ["📘 Sensor Summary Report"],
      ["Sensor Name:", sensorName],
      ["Location:", logs[0]?.location || "N/A"],
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

    const tableData = logs.map((log) => [
      new Date(log.timestamp).toLocaleString("en-PH"),
      log.sensorName,
      log.location,
      log.distance,
      log.status,
      log.type,
    ]);

    const sheetData = [...summary, ...tableData];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Use readable name, limit to 31 chars (Excel limit)
    const safeName = sensorName.replace(/[\\/?*[\]:]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  // --- Save workbook ---
  const date = new Date().toISOString().slice(0, 10);
  const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const filename = `Flood_Report_${date}.xlsx`;

  saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
};
