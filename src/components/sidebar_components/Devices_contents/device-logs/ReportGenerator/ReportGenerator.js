// ReportGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMDRRMOReport = async (sensorId, fullLogs, alertLogs, maxMetadata, filterStart, filterEnd) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let yPos = 20;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Helper to add section header
  const addSectionHeader = (title, size = 14) => {
    checkPageBreak(15);
    doc.setFontSize(size);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
  };

  // ===========================
  // HEADER
  // ===========================
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('FLOOD RISK ASSESSMENT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;
  doc.text('AND EARLY WARNING REPORT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Municipal Disaster Risk Reduction and Management Office', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text('Molave, Zamboanga Del Sur', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Report Details Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 30);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('REPORT DETAILS', margin + 3, yPos);
  yPos += 7;

  doc.setFont(undefined, 'normal');
  const startDate = new Date(filterStart || fullLogs[0]?.timestamp);
  const endDate = new Date(filterEnd || fullLogs[fullLogs.length - 1]?.timestamp);
  
  doc.text(`Reporting Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, margin + 3, yPos);
  yPos += 5;
  doc.text(`Sensor Location: ${sensorId}`, margin + 3, yPos);
  yPos += 5;
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin + 3, yPos);
  yPos += 5;
  doc.text(`Prepared By: MDRRMO Monitoring Team`, margin + 3, yPos);
  yPos += 15;

  // ===========================
  // 1. EXECUTIVE SUMMARY / RISK LEVEL
  // ===========================
  addSectionHeader('EXECUTIVE SUMMARY', 14);
  
  const criticalCount = fullLogs.filter(log => log.distance >= maxMetadata.alertLevel).length;
  const avgLevel = (fullLogs.reduce((sum, log) => sum + log.distance, 0) / fullLogs.length).toFixed(2);
  const maxLevel = Math.max(...fullLogs.map(log => log.distance)).toFixed(2);
  
  // Determine risk level
  let riskLevel = 'LOW';
  let riskColor = [0, 200, 0];
  if (criticalCount > 10) {
    riskLevel = 'HIGH';
    riskColor = [255, 0, 0];
  } else if (criticalCount > 5) {
    riskLevel = 'MODERATE';
    riskColor = [255, 165, 0];
  }

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Current Risk Level: ', margin, yPos);
  doc.setTextColor(...riskColor);
  doc.text(riskLevel, margin + 45, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Key Findings:', margin, yPos);
  yPos += 6;

  doc.setFont(undefined, 'normal');
  const findings = [
    `• Water levels reached critical threshold ${criticalCount} times during the reporting period`,
    `• Average water level: ${avgLevel}m | Peak level: ${maxLevel}m`,
    `• Total data points collected: ${fullLogs.length} readings`,
  ];

  findings.forEach(finding => {
    checkPageBreak();
    doc.text(finding, margin + 2, yPos);
    yPos += 5;
  });
  yPos += 10;

  // ===========================
  // 2. WATER LEVEL STATUS OVERVIEW
  // ===========================
  addSectionHeader('1. WATER LEVEL STATUS OVERVIEW', 12);

  const normalCount = fullLogs.filter(log => log.distance <= maxMetadata.normalLevel).length;
  const elevatedCount = fullLogs.filter(log => log.distance > maxMetadata.normalLevel && log.distance < maxMetadata.alertLevel).length;
  const criticalFullCount = fullLogs.filter(log => log.distance >= maxMetadata.alertLevel).length;

  const normalPct = ((normalCount / fullLogs.length) * 100).toFixed(1);
  const elevatedPct = ((elevatedCount / fullLogs.length) * 100).toFixed(1);
  const criticalPct = ((criticalFullCount / fullLogs.length) * 100).toFixed(1);

  doc.setFontSize(10);
  doc.text(`Average Water Level: ${avgLevel}m`, margin, yPos);
  yPos += 5;
  doc.text(`Highest Recorded Level: ${maxLevel}m`, margin, yPos);
  yPos += 5;
  doc.text(`Total Data Points: ${fullLogs.length}`, margin, yPos);
  yPos += 10;

  // Status distribution table
  autoTable(doc, {
    startY: yPos,
    head: [['Status', 'Count', 'Percentage', 'Description']],
    body: [
      ['Normal', normalCount, `${normalPct}%`, `Below ${maxMetadata.normalLevel}m - No immediate risk`],
      ['Elevated', elevatedCount, `${elevatedPct}%`, `${maxMetadata.normalLevel}m - ${maxMetadata.alertLevel}m - Increased monitoring`],
      ['Critical', criticalFullCount, `${criticalPct}%`, `Above ${maxMetadata.alertLevel}m - High flood risk`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ===========================
  // 3. CRITICAL EVENTS SUMMARY
  // ===========================
  checkPageBreak(40);
  addSectionHeader('2. CRITICAL EVENTS SUMMARY', 12);

  const criticalEvents = [];
  let inCritical = false;
  let eventStart = null;
  let eventPeak = 0;

  fullLogs.forEach((log, idx) => {
    if (log.distance >= maxMetadata.alertLevel && !inCritical) {
      inCritical = true;
      eventStart = log;
      eventPeak = log.distance;
    } else if (inCritical) {
      if (log.distance > eventPeak) eventPeak = log.distance;
      
      if (log.distance < maxMetadata.alertLevel || idx === fullLogs.length - 1) {
        const duration = Math.round((log.timestamp - eventStart.timestamp) / (1000 * 60));
        criticalEvents.push({
          date: eventStart.date,
          peak: eventPeak.toFixed(2),
          duration: `${duration} min`,
        });
        inCritical = false;
      }
    }
  });

  doc.setFontSize(10);
  doc.text(`Total Critical Events: ${criticalEvents.length}`, margin, yPos);
  yPos += 10;

  if (criticalEvents.length > 0) {
    const tableData = criticalEvents.slice(0, 10).map((evt, i) => [
      i + 1,
      evt.date,
      evt.peak + 'm',
      evt.duration,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Date & Time', 'Peak Level', 'Duration']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 5;
    
    if (criticalEvents.length > 10) {
      doc.text(`... and ${criticalEvents.length - 10} more events`, margin, yPos);
      yPos += 5;
    }
  } else {
    doc.text('No critical events recorded during this period.', margin, yPos);
    yPos += 5;
  }

  yPos += 10;

  // ===========================
  // 4. RISK PATTERNS (Time-based)
  // ===========================
  checkPageBreak(40);
  addSectionHeader('3. RISK PATTERNS IDENTIFIED', 12);

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('A. Time-Based Patterns (Critical Events Frequency):', margin, yPos);
  yPos += 7;

  const hourlyDistribution = {};
  criticalEvents.forEach(evt => {
    const date = new Date(evt.date);
    const hour = date.getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });

  doc.setFont(undefined, 'normal');
  if (Object.keys(hourlyDistribution).length > 0) {
    const sortedHours = Object.entries(hourlyDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedHours.forEach(([hour, count]) => {
      checkPageBreak();
      const pct = ((count / criticalEvents.length) * 100).toFixed(1);
      doc.text(`• ${hour}:00 - ${parseInt(hour)+1}:00: ${count} events (${pct}%)`, margin + 2, yPos);
      yPos += 5;
    });
  } else {
    doc.text('No significant time patterns detected.', margin + 2, yPos);
    yPos += 5;
  }

  yPos += 10;

  // ===========================
  // 5. EARLY WARNING EFFECTIVENESS
  // ===========================
  checkPageBreak(30);
  addSectionHeader('4. EARLY WARNING SYSTEM EFFECTIVENESS', 12);

  const autoAlerts = alertLogs.reduce((sum, log) => sum + (log.Automatic || 0), 0);
  const manualAlerts = alertLogs.reduce((sum, log) => sum + (log.Manual || 0), 0);
  const totalAlerts = autoAlerts + manualAlerts;
  const alertAccuracy = criticalEvents.length > 0 ? ((totalAlerts / criticalEvents.length) * 100).toFixed(1) : 'N/A';

  doc.setFontSize(10);
  doc.text(`Total Automatic Alerts: ${autoAlerts}`, margin, yPos);
  yPos += 5;
  doc.text(`Total Manual Alerts: ${manualAlerts}`, margin, yPos);
  yPos += 5;
  doc.text(`Total Alerts Sent: ${totalAlerts}`, margin, yPos);
  yPos += 5;
  doc.text(`Alert Response Rate: ${alertAccuracy}%`, margin, yPos);
  yPos += 5;
  doc.text(`Critical Events Detected: ${criticalEvents.length}`, margin, yPos);
  yPos += 15;

  // ===========================
  // 6. COMPARATIVE ANALYSIS
  // ===========================
  checkPageBreak(50);
  addSectionHeader('5. COMPARATIVE ANALYSIS', 12);

  // Day over Day (last 7 days)
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Day-over-Day Comparison (Last 7 Days):', margin, yPos);
  yPos += 7;

  const last7Days = fullLogs.slice(-7 * 24 * 12); // Assuming 5-min intervals
  const dailyAvg = {};
  
  last7Days.forEach(log => {
    const date = new Date(log.timestamp);
    const dayKey = date.toLocaleDateString();
    if (!dailyAvg[dayKey]) dailyAvg[dayKey] = { sum: 0, count: 0 };
    dailyAvg[dayKey].sum += log.distance;
    dailyAvg[dayKey].count += 1;
  });

  const dailyData = Object.entries(dailyAvg).map(([day, data]) => [
    day,
    (data.sum / data.count).toFixed(2) + 'm',
  ]);

  if (dailyData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Avg Water Level']],
      body: dailyData.slice(-7),
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40 },
      },
    });
    yPos = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFont(undefined, 'normal');
    doc.text('Insufficient data for daily comparison.', margin + 2, yPos);
    yPos += 10;
  }

  // Week over Week
  checkPageBreak(30);
  doc.setFont(undefined, 'bold');
  doc.text('Week-over-Week Comparison:', margin, yPos);
  yPos += 7;

  doc.setFont(undefined, 'normal');
  const weeklyData = calculateWeeklyAverages(fullLogs);
  
  if (weeklyData.length >= 2) {
    const current = weeklyData[weeklyData.length - 1];
    const previous = weeklyData[weeklyData.length - 2];
    const change = ((current.avg - previous.avg) / previous.avg * 100).toFixed(1);
    
    doc.text(`Current Week Avg: ${current.avg.toFixed(2)}m`, margin + 2, yPos);
    yPos += 5;
    doc.text(`Previous Week Avg: ${previous.avg.toFixed(2)}m`, margin + 2, yPos);
    yPos += 5;
    doc.text(`Change: ${change > 0 ? '+' : ''}${change}%`, margin + 2, yPos);
    yPos += 10;
  } else {
    doc.text('Insufficient data for weekly comparison.', margin + 2, yPos);
    yPos += 10;
  }

  // Month over Month
  checkPageBreak(30);
  doc.setFont(undefined, 'bold');
  doc.text('Month-over-Month Comparison:', margin, yPos);
  yPos += 7;

  doc.setFont(undefined, 'normal');
  doc.text('Note: This requires historical data spanning multiple months.', margin + 2, yPos);
  yPos += 5;
  doc.text('Current implementation shows data within selected date range.', margin + 2, yPos);
  yPos += 15;

  // ===========================
  // FOOTER / CERTIFICATION
  // ===========================
  checkPageBreak(50);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('CERTIFICATION', margin, yPos);
  yPos += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const certText = 'This report has been prepared in accordance with RA 10121 and NDRRMC guidelines. All data presented are based on actual sensor readings and verified incident reports.';
  const splitCert = doc.splitTextToSize(certText, pageWidth - 2 * margin);
  doc.text(splitCert, margin, yPos);
  yPos += splitCert.length * 5 + 10;

  doc.text('Prepared by: MDRRMO Monitoring Team', margin, yPos);
  yPos += 5;
  doc.text('Approved by: MDRRMO Head Officer, Molave, Zamboanga Del Sur', margin, yPos);
  yPos += 10;

  doc.setFontSize(8);
  doc.text(`Report generated on ${new Date().toLocaleString()}`, margin, yPos);

  // Save PDF
  const fileName = `MDRRMO_Report_${sensorId}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Helper function to calculate weekly averages
function calculateWeeklyAverages(logs) {
  const weeklyMap = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { sum: 0, count: 0 };
    weeklyMap[weekKey].sum += log.distance;
    weeklyMap[weekKey].count += 1;
  });
  
  return Object.entries(weeklyMap).map(([week, data]) => ({
    week,
    avg: data.sum / data.count,
    count: data.count,
  }));
}