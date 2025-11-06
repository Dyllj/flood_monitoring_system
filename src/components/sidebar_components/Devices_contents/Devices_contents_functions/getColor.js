// Returns dynamic line color based on live reading vs thresholds
export const getColor = (distance, normalLevel, alertLevel) => {
  if (distance <= normalLevel) return "#00C853"; // Green (normal)
  if (distance < alertLevel) return "#FFD600";   // Yellow (elevated)
  return "#D50000";                              // Red (alert)
};
