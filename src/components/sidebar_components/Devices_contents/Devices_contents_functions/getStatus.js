// Returns textual status and color for display
export const getStatus = (distance, normalLevel, alertLevel) => {
  if (distance <= normalLevel) return { text: "Normal", color: "#4CAF50" };
  if (distance < alertLevel) return { text: "Elevated", color: "#FFC107" };
  return { text: "Critical", color: "#F44336" };
};
