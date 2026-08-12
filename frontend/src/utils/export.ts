import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatINR, formatIndianDate } from './currency';

/**
 * Exports JSON array data to a standard RFC 4180 CSV file and triggers download
 */
export function exportToCSV(filename: string, rows: any[], columns?: { key: string; label: string }[]) {
  if (!rows || rows.length === 0) {
    throw new Error('No data available to export');
  }

  let headers: string[];
  let keys: string[];

  if (columns && columns.length > 0) {
    headers = columns.map(c => c.label);
    keys = columns.map(c => c.key);
  } else {
    keys = Object.keys(rows[0]);
    headers = keys.map(k => k.toUpperCase());
  }

  const csvRows: string[] = [];
  // Add header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Add data rows
  for (const row of rows) {
    const values = keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an executive PDF report document for AI Operations Reports
 */
export function exportReportToPDF(report: any, organizationName = 'InsightOps India') {
  const doc = new jsPDF();

  // Primary Header Banner
  doc.setFillColor(30, 27, 75); // Deep Indigo
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('InsightOps — Executive Operations Report', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 254);
  doc.text(`Organization: ${organizationName}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

  // Metadata Card
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Type: ${report.type || 'GENERAL'} OPERATIONS AUDIT`, 14, 48);

  const startDate = report.startDate ? formatIndianDate(report.startDate) : 'N/A';
  const endDate = report.endDate ? formatIndianDate(report.endDate) : 'N/A';

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Timeframe: ${startDate} to ${endDate}  |  Status: ${report.status || 'GENERATED'}`, 14, 55);

  // Key Metrics Table
  const metricsData = [
    ['Total Inventory Valuation', formatINR(report.metrics?.totalValuation || 0)],
    ['Total Recorded Expenses', formatINR(report.metrics?.totalExpenses || 0)],
    ['Products Monitored', `${report.metrics?.inventoryCount || 0} items`],
    ['Logged Expense Entries', `${report.metrics?.expenseCount || 0} entries`],
    ['Scheduled Staff Shifts', `${report.metrics?.shiftCount || 0} shifts`],
  ];

  autoTable(doc, {
    startY: 62,
    head: [['Metric', 'Value (INR / Quantity)']],
    body: metricsData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // AI Insights Section
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('AI Executive Summary & Operational Recommendations', 14, finalY + 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);

  const summary = report.summaryText || 'No detailed analysis generated for this report.';
  const splitText = doc.splitTextToSize(summary, 180);
  doc.text(splitText, 14, finalY + 20);

  // Footer Note
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('InsightOps India • Confidential Business Intelligence • Auto-generated PDF', 14, pageHeight - 10);

  doc.save(`InsightOps_Report_${report.type || 'Summary'}_${Date.now()}.pdf`);
}
