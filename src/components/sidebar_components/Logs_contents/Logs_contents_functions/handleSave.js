export const handleSave = (startDate, endDate, sensor, setShowFilterModal) => {
  console.log("Filters saved:", { startDate, endDate, sensor });
  setShowFilterModal(false);
};
