// Returns a status object (label + color) based on measured distance.
export const getStatus = (distance) => {
  if (distance < 200) return { text: "Normal", color: "#4CAF50" };    // safe
  if (distance < 400) return { text: "Elevated", color: "#FFC107" };  // warning
  return { text: "Critical", color: "#F44336" };                      // danger
};
