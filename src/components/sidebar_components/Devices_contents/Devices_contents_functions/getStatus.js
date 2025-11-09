// Returns textual status and color for display
export const getStatus = (distance, normalLevel, alertLevel) => {
  if (distance <= normalLevel) return "Normal";
  if (distance < alertLevel) return "Elevated";
  return "Critical";
};
