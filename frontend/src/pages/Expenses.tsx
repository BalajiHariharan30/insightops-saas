import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Divider, message } from 'antd';
import { PlusOutlined, AlertOutlined, SafetyCertificateOutlined, BankOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { formatINRDecimal, formatIndianDate } from '../utils/currency';
import { exportToCSV } from '../utils/export';
import type { Expense } from '../types';

const { Option } = Select;

// Indian expense categories
const INDIAN_EXPENSE_CATEGORIES = [
  'Software & SaaS',
  'Office Rent',
  'Marketing & Ads',
  'Hardware & Equipment',
  'Consulting Fees',
  'Vendor Payment',
  'GST Payment',
  'TDS / Tax Deducted',
  'Salary & Payroll',
  'Travel & Conveyance',
  'Utilities (Electricity/Internet)',
  'Raw Materials',
  'Logistics & Courier',
  'Legal & Compliance',
  'Miscellaneous',
];

const GST_RATES = [0, 5, 12, 18, 28];

export const Expenses: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // cursor history stack: each entry is the cursor used to load that page
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentPage, setCurrentPage] = useState(0); // index into cursorHistory
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [gstType, setGstType] = useState('NONE');

  const loadExpenses = async (cursor?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/expenses', {
        params: { limit: 10, cursor },
      });
      const data = res.data.data;
      setExpenses(data?.items || data?.results || []);
      setNextCursor(data?.hasNextPage ? data?.nextCursor : undefined);

      // Fix: Get role from /organizations instead of /auth/me (which has no memberships field)
      const activeOrgId = localStorage.getItem('active_organization_id');
      const membershipsRes = await api.get('/organizations');
      const memberships = membershipsRes.data.data || [];
      const currentMembership = memberships.find(
        (m: { organization: { _id: string }; role: 'ADMIN' | 'STAFF' }) => m.organization._id === activeOrgId
      );
      if (currentMembership) setRole(currentMembership.role);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      message.error('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (pageIndex: number, pageCursor: string | undefined) => {
    setCurrentPage(pageIndex);
    loadExpenses(pageCursor);
  };

  useEffect(() => {
    loadExpenses(undefined);
  }, []);

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        vendor: values.vendor,
        vendorGSTIN: values.vendorGSTIN || undefined,
        category: values.category,
        amount: Number(values.amount),
        gstType: values.gstType || 'NONE',
        gstRate: values.gstRate ? Number(values.gstRate) : undefined,
        upiTransactionId: values.upiTransactionId || undefined,
        date: values.date,
        description: values.description || undefined,
      };

      await api.post('/expenses', payload);
      message.success('Expense recorded successfully.');
      setIsCreateOpen(false);
      form.resetFields();
      setGstType('NONE');
      // Reset pagination and reload first page
      setCursorHistory([undefined]);
      setCurrentPage(0);
      loadExpenses(undefined);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to record expense.');
    }
  };

  const handleStatusUpdate = async (expenseId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/expenses/${expenseId}`, { status });
      message.success(`Expense ${status.toLowerCase()} successfully.`);
      loadExpenses();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Update failed.');
    }
  };

  const columns = [
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      key: 'vendor',
      render: (vendor: string) => <span style={{ fontWeight: 600 }}>{vendor}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag>{cat}</Tag>,
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{formatINRDecimal(amt)}</span>,
    },
    {
      title: 'GST Type',
      dataIndex: 'gstType',
      key: 'gstType',
      render: (gst: string, record: any) =>
        gst && gst !== 'NONE' ? (
          <Tag color="blue">{gst} @ {record.gstRate}%</Tag>
        ) : (
          <Tag color="default">No GST</Tag>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'success';
        if (status === 'REJECTED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Anomaly',
      dataIndex: 'isAnomaly',
      key: 'isAnomaly',
      render: (anom: boolean, record: any) =>
        anom ? (
          <Tag color="red" icon={<AlertOutlined />}>Z-Score: {record.zScore?.toFixed(2)}</Tag>
        ) : (
          <Tag color="green" icon={<SafetyCertificateOutlined />}>Normal</Tag>
        ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => formatIndianDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      // Bug Fix: render must be (cellValue, record) — not just (record)
      render: (_: any, record: any) =>
        role === 'ADMIN' && record.status === 'PENDING' ? (
          <Space>
            <Button size="small" type="primary" onClick={() => handleStatusUpdate(record._id, 'APPROVED')} style={{ background: '#10b981' }}>
              Approve
            </Button>
            <Button size="small" danger onClick={() => handleStatusUpdate(record._id, 'REJECTED')}>
              Reject
            </Button>
          </Space>
        ) : null,
    },
  ];

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) {
      message.warning('No expenses to export.');
      return;
    }
    const flatExpenses = expenses.map(e => ({
      Vendor: e.vendor,
      VendorGSTIN: e.vendorGSTIN || '',
      Category: e.category,
      Amount_INR: e.amount,
      GST_Type: e.gstType || 'NONE',
      GST_Rate: e.gstRate ? `${e.gstRate}%` : '0%',
      GST_Amount: e.gstAmount || 0,
      Status: e.status,
      UPITransactionID: e.upiTransactionId || '',
      Date: formatIndianDate(e.date),
      Description: e.description || '',
    }));
    exportToCSV(`InsightOps_Expenses_${Date.now()}`, flatExpenses);
    message.success('Expenses CSV exported successfully.');
  };

  return (
    <Card
      className="glass-panel"
      title="Expenses Ledger — India Edition"
      extra={
        <Space>
          <Button icon={<FileExcelOutlined style={{ color: '#10b981' }} />} onClick={handleExportCSV} disabled={expenses.length === 0}>
            Export CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)} style={{ background: 'var(--accent-glow)' }}>
            Record Expense
          </Button>
        </Space>
      }
      bordered={false}
    >
      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="_id"
        pagination={false}
        loading={loading}
        className="dark-table"
      />

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={currentPage === 0}
          onClick={() => {
            const prevPage = currentPage - 1;
            goToPage(prevPage, cursorHistory[prevPage]);
          }}
        >
          Previous
        </Button>
        <Button
          disabled={!nextCursor}
          onClick={() => {
            const nextPage = currentPage + 1;
            // Append next cursor to history if navigating forward for the first time
            setCursorHistory((prev) => {
              const updated = [...prev];
              updated[nextPage] = nextCursor;
              return updated;
            });
            goToPage(nextPage, nextCursor);
          }}
        >
          Next
        </Button>
      </div>

      <Modal
        title="Record Business Expense"
        open={isCreateOpen}
        onCancel={() => { setIsCreateOpen(false); setGstType('NONE'); }}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="vendor" label="Vendor Name" rules={[{ required: true, message: 'Please enter vendor name' }]}>
            <Input placeholder="e.g. Reliance Jio, AWS, Zoho Corp" prefix={<BankOutlined />} />
          </Form.Item>

          <Form.Item name="vendorGSTIN" label="Vendor GSTIN (optional)">
            <Input placeholder="e.g. 29ABCDE1234F1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item name="category" label="Expense Category" rules={[{ required: true, message: 'Please select category' }]}>
            <Select placeholder="Select category" showSearch>
              {INDIAN_EXPENSE_CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Base Amount (₹)" rules={[{ required: true, message: 'Please enter amount' }]}>
            <InputNumber min={1} style={{ width: '100%' }} prefix="₹" formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>

          <Divider orientation="left" style={{ color: 'var(--text-muted)', fontSize: 12 }}>GST Details (optional)</Divider>

          <Form.Item name="gstType" label="GST Type" initialValue="NONE">
            <Select onChange={(v) => setGstType(v)}>
              <Option value="NONE">No GST</Option>
              <Option value="CGST_SGST">CGST + SGST (Intrastate)</Option>
              <Option value="IGST">IGST (Interstate)</Option>
            </Select>
          </Form.Item>

          {gstType !== 'NONE' && (
            <Form.Item name="gstRate" label="GST Rate (%)">
              <Select placeholder="Select GST rate">
                {GST_RATES.map(r => <Option key={r} value={r}>{r}%</Option>)}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="upiTransactionId" label="UPI / Reference ID (optional)">
            <Input placeholder="e.g. UPI123456789 or NEFT/RTGS ref" />
          </Form.Item>

          <Form.Item name="date" label="Expense Date" rules={[{ required: true, message: 'Please select date' }]}>
            <Input type="date" />
          </Form.Item>

          <Form.Item name="description" label="Internal Memo">
            <Input.TextArea placeholder="Describe the purpose of this expense..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" style={{ background: 'var(--accent-glow)' }}>
            Log Expense & Run Anomaly Audit
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};
export default Expenses;
