export const getColor = (distance) => {
  if (distance < 100) return "#00C853";
  if (distance < 180) return "#FFD600";
  return "#D50000";
};