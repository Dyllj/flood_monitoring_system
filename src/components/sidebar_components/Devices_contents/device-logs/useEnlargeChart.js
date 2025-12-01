// useEnlargeChart.js - Custom hook for chart enlargement functionality
import { useState } from 'react';

export const useEnlargeChart = () => {
  const [enlargedChart, setEnlargedChart] = useState(null);

  const openEnlargedView = (chartType) => {
    setEnlargedChart(chartType);
  };

  const closeEnlargedView = () => {
    setEnlargedChart(null);
  };

  return {
    enlargedChart,
    openEnlargedView,
    closeEnlargedView
  };
};