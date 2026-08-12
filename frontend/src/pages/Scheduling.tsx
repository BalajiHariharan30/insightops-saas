import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Space, Select, Tag, message } from 'antd';
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { formatINRPerHour, formatIndianDate, formatISTTime } from '../utils/currency';

const { Option } = Select;

// Indian workplace roles
const INDIAN_ROLES = [
  'Manager',
  'Accountant',
  'HR Executive',
  'Sales Executive',
  'Tech Lead',
  'Software Engineer',
  'Cashier',
  'Supervisor',
  'Security Guard',
  'Delivery Staff',
  'Customer Support',
  'Operations Head',
];

export const Scheduling: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const activeOrgId = localStorage.getItem('active_organization_id');
      if (!activeOrgId) return;

      const scheduleRes = await api.get('/schedules', {
        params: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      setShifts(scheduleRes.data.data);

      const membersRes = await api.get('/organizations/members');
      setMembers(membersRes.data.data);
    } catch (err: any) {
      message.error('Failed to load scheduling shifts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCreateShift = async (values: any) => {
    try {
      await api.post('/schedules', {
        userId: values.userId,
        startDateTime: new Date(`${values.date}T${values.startTime}`).toISOString(),
        endDateTime: new Date(`${values.date}T${values.endTime}`).toISOString(),
        roleRequired: values.roleRequired,
        hourlyRate: values.hourlyRate,
      });

      message.success('Shift scheduled successfully.');
      setIsCreateOpen(false);
      form.resetFields();
      loadSchedules();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Conflict: Overlapping shifts detected.');
    }
  };

  const columns = [
    {
      title: 'Staff Member',
      dataIndex: 'userId',
      key: 'userId',
      render: (u: any) => <span style={{ fontWeight: 600 }}>{u?.name || 'Unassigned'}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'roleRequired',
      key: 'roleRequired',
      render: (role: string) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: 'Shift Date',
      dataIndex: 'startDateTime',
      key: 'date',
      render: (date: string) => formatIndianDate(date),
    },
    {
      title: 'Timespan (IST)',
      key: 'timespan',
      // Bug Fix: render must be (cellValue, record) not just (record)
      render: (_: any, record: any) => {
        const start = formatISTTime(record.startDateTime);
        const end = formatISTTime(record.endDateTime);
        return <span><ClockCircleOutlined style={{ marginRight: 6 }} />{start} – {end}</span>;
      },
    },
    {
      title: 'Pay Rate (₹/hr)',
      dataIndex: 'hourlyRate',
      key: 'hourlyRate',
      render: (rate: number) => <span style={{ color: '#10b981', fontWeight: 600 }}>{formatINRPerHour(rate)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'PUBLISHED' ? 'success' : 'default'}>{status}</Tag>
      ),
    },
  ];

  return (
    <Card
      className="glass-panel"
      title="Staff Shift Roster — India Edition"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)} style={{ background: 'var(--accent-glow)' }}>
          Schedule Shift
        </Button>
      }
      bordered={false}
    >
      <Table
        dataSource={shifts}
        columns={columns}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
        loading={loading}
        className="dark-table"
      />

      <Modal
        title="Schedule Staff Shift"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateShift}>
          {/* Bug Fix: Use Ant Design Select instead of native <select> so Form works correctly */}
          <Form.Item name="userId" label="Assign To Employee" rules={[{ required: true, message: 'Please select staff' }]}>
            <Select placeholder="Select Employee" showSearch>
              {members.map((m: any) => (
                <Option key={m.userId._id} value={m.userId._id}>
                  {m.userId.name} ({m.role})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="roleRequired" label="Job Role / Designation" rules={[{ required: true, message: 'Role required' }]}>
            <Select placeholder="Select job role" showSearch>
              {INDIAN_ROLES.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="date" label="Shift Date" rules={[{ required: true, message: 'Date required' }]}>
            <Input type="date" />
          </Form.Item>

          <Space size={16} style={{ width: '100%' }}>
            <Form.Item name="startTime" label="Start Time" rules={[{ required: true, message: 'Required' }]} style={{ width: '50%' }}>
              <Input type="time" />
            </Form.Item>
            <Form.Item name="endTime" label="End Time" rules={[{ required: true, message: 'Required' }]} style={{ width: '50%' }}>
              <Input type="time" />
            </Form.Item>
          </Space>

          <Form.Item name="hourlyRate" label="Hourly Pay Rate (₹/hr)" rules={[{ required: true, message: 'Hourly rate required' }]}>
            <InputNumber min={50} style={{ width: '100%' }} prefix="₹" placeholder="e.g. 150" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" style={{ background: 'var(--accent-glow)' }}>
            Schedule Shift & Validate Overlap
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};
export default Scheduling;
