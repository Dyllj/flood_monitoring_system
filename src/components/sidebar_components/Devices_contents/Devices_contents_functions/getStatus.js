export const getStatus = (distance) => {
  if (distance < 100) return { text: "Normal", color: "#4CAF50" };
  if (distance < 180) return { text: "Elevated", color: "#FFC107" };
  return { text: "Critical", color: "#F44336" };
};
