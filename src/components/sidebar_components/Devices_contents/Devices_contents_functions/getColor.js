export const getColor = (distance) => {
  if (distance < 200) return "#00C853";
  if (distance < 400) return "#FFD600";
  return "#D50000";
};