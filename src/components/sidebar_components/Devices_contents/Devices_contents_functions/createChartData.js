// Generates smooth, wave-like chart data (ECG-style)
export const createChartData = (distance) => {
  const data = [];
  for (let i = 0; i < 30; i++) {
    const variation = Math.sin(i / 2) * 2 + (Math.random() * 3 - 1.5);
    const value = Math.max(0, Math.floor(distance + variation));
    data.push({ time: i, value });
  }
  return data;
};
