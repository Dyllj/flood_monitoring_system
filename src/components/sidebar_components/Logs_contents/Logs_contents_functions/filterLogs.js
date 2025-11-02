export const filterLogs = (logs, startDate, endDate, sensor, searchTerm) => {
  return logs
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
};
