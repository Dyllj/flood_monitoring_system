export const createChartData = (distance) => {
  const points = [];
  for (let i = 0; i < 10; i++) {
    points.push({ time: i, value: distance + Math.random() * 5 - 2 });
  }
  return points;
};
