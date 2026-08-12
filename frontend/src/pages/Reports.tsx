import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Tag, Empty, message, Tooltip } from 'antd';
import {
  FilePdfOutlined,
  FileAddOutlined,
  BookOutlined,
  DownloadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import api from '../utils/api';
import { formatINR, formatIndianDate } from '../utils/currency';
import { exportReportToPDF, exportToCSV } from '../utils/export';

export const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports');
      setReports(res.data.data);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerateReport = async (type: 'WEEKLY' | 'MONTHLY') => {
    setGenerating(true);
    message.loading(`Generating ${type.toLowerCase()} AI report...`, 2.5);
    try {
      await api.post('/reports', { type });
      message.success('AI report compiled successfully.');
      loadReports();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to compile AI report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!reports || reports.length === 0) {
      message.warning('No report records to export.');
      return;
    }

    try {
      const flatReports = reports.map((r: any) => ({
        ID: r._id,
        Type: r.type,
        Status: r.status,
        StartDate: r.startDate ? formatIndianDate(r.startDate) : 'N/A',
        EndDate: r.endDate ? formatIndianDate(r.endDate) : 'N/A',
        StockValuation_INR: r.metrics?.totalValuation || 0,
        TotalExpenses_INR: r.metrics?.totalExpenses || 0,
        ProductsMonitored: r.metrics?.inventoryCount || 0,
        ExpensesLogged: r.metrics?.expenseCount || 0,
        ShiftsScheduled: r.metrics?.shiftCount || 0,
        AISummary: r.summaryText || '',
      }));

      exportToCSV(`InsightOps_Reports_Ledger_${Date.now()}`, flatReports);
      message.success('Reports CSV file exported successfully.');
    } catch (err: any) {
      message.error('Failed to export CSV: ' + err.message);
    }
  };

  const handleDownloadPDF = (report: any) => {
    try {
      exportReportToPDF(report);
      message.success('Executive PDF report downloaded.');
    } catch (err: any) {
      message.error('Failed to generate PDF: ' + err.message);
    }
  };

  const columns = [
    {
      title: 'Report Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={type === 'MONTHLY' ? 'blue' : 'purple'}>{type}</Tag>,
    },
    {
      title: 'Metrics Compiled',
      key: 'metrics',
      render: (_: any, record: any) => (
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Valuation: {formatINR(record.metrics?.totalValuation || 0)} | Expenses: {formatINR(record.metrics?.totalExpenses || 0)}
        </span>
      ),
    },
    {
      title: 'Timeframe',
      key: 'timeframe',
      render: (_: any, record: any) => {
        if (!record.startDate) return '—';
        const start = formatIndianDate(record.startDate);
        const end = formatIndianDate(record.endDate);
        return <span>{start} – {end}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'GENERATED') color = 'success';
        if (status === 'PENDING') color = 'processing';
        if (status === 'FAILED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<BookOutlined />}
            onClick={() => setSelectedReport(record)}
            disabled={record.status !== 'GENERATED'}
          >
            Read Summary
          </Button>

          <Tooltip title="Export styled PDF report">
            <Button
              size="small"
              type="primary"
              ghost
              icon={<FilePdfOutlined />}
              onClick={() => handleDownloadPDF(record)}
              disabled={record.status !== 'GENERATED'}
            >
              PDF
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        className="glass-panel"
        title="AI Operations Reports — India Edition"
        extra={
          <Space>
            <Button
              icon={<FileExcelOutlined style={{ color: '#10b981' }} />}
              onClick={handleExportCSV}
              disabled={reports.length === 0}
            >
              Export CSV
            </Button>
            <Button type="primary" ghost icon={<FileAddOutlined />} onClick={() => handleGenerateReport('WEEKLY')} loading={generating}>
              Weekly Report
            </Button>
            <Button type="primary" icon={<FilePdfOutlined />} onClick={() => handleGenerateReport('MONTHLY')} loading={generating} style={{ background: 'var(--accent-glow)' }}>
              Monthly Report
            </Button>
          </Space>
        }
        bordered={false}
      >
        <Table
          dataSource={reports}
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No reports generated yet." /> }}
          loading={loading}
          className="dark-table"
        />
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 24 }}>
            <span>AI Summary: {selectedReport?.type} Report</span>
            {selectedReport?.status === 'GENERATED' && (
              <Button
                type="primary"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadPDF(selectedReport)}
                style={{ background: 'var(--accent-glow)' }}
              >
                Download PDF
              </Button>
            )}
          </div>
        }
        open={!!selectedReport}
        onCancel={() => setSelectedReport(null)}
        footer={null}
        width={720}
      >
        <div style={{ background: '#12131a', padding: 20, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', maxHeight: 500, overflowY: 'auto' }}>
          <h4 style={{ color: 'var(--accent-glow)', marginTop: 0 }}>Executive AI Summary</h4>
          <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {selectedReport?.summaryText || 'Compiling summary insights...'}
          </p>
          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <h4 style={{ color: 'var(--text-muted)' }}>Underlying Data Parameters</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, color: '#fff' }}>
              <div>📦 Products Tracked: <strong>{selectedReport?.metrics?.inventoryCount || 0}</strong></div>
              <div>💰 Expenses Logged: <strong>{selectedReport?.metrics?.expenseCount || 0} items</strong></div>
              <div>📅 Scheduled Shifts: <strong>{selectedReport?.metrics?.shiftCount || 0}</strong></div>
              <div>💵 Total Valuation: <strong>{formatINR(selectedReport?.metrics?.totalValuation || 0)}</strong></div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Reports;
