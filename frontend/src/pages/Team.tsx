import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Avatar,
  Popconfirm, message, Empty, Divider, Tabs, Badge
} from 'antd';
import {
  UserAddOutlined, DeleteOutlined, CrownOutlined, UserOutlined,
  MailOutlined, TeamOutlined, AuditOutlined, ClockCircleOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import { formatIndianDate } from '../utils/currency';

export const Team: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [form] = Form.useForm();

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations/members');
      setMembers(res.data.data || []);

      // Determine current user's role
      const activeOrgId = localStorage.getItem('active_organization_id');
      const orgsRes = await api.get('/organizations');
      const my = (orgsRes.data.data || []).find(
        (m: any) => m.organization._id === activeOrgId
      );
      if (my) setCurrentUserRole(my.role);
    } catch (err: any) {
      message.error('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/organizations/audit-logs', { params: { limit: 20 } });
      const data = res.data.data;
      setAuditLogs(data?.items || data?.results || data || []);
    } catch (err: any) {
      // Admins only — silently fail for staff
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadAuditLogs();
  }, []);

  const handleInvite = async (values: { email: string; role: string }) => {
    setInviteLoading(true);
    try {
      await api.post('/organizations/members', { email: values.email, role: values.role });
      message.success(`Invitation sent to ${values.email}!`);
      setIsInviteOpen(false);
      form.resetFields();
      loadMembers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'STAFF') => {
    try {
      await api.put(`/organizations/members/${memberId}`, { role: newRole });
      message.success('Member role updated successfully.');
      loadMembers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    try {
      await api.delete(`/organizations/members/${memberId}`);
      message.success(`${memberName} has been removed from the workspace.`);
      loadMembers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const memberColumns = [
    {
      title: 'Member',
      key: 'member',
      render: (record: any) => (
        <Space>
          <Avatar
            style={{ background: 'var(--neon-muted)', color: 'var(--neon)', fontWeight: 700, border: '1px solid var(--border-bright)' }}
            size={36}
          >
            {(record.userId?.name || record.userId?.email || 'U')[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{record.userId?.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {record.userId?.email || '—'}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: any) => (
        currentUserRole === 'ADMIN' ? (
          <Select
            value={role}
            size="small"
            style={{ width: 100 }}
            onChange={(val) => handleRoleChange(record._id, val as 'ADMIN' | 'STAFF')}
            options={[
              { value: 'ADMIN', label: <span><CrownOutlined style={{ color: 'var(--warning)', marginRight: 5 }} />Admin</span> },
              { value: 'STAFF', label: <span><UserOutlined style={{ color: 'var(--text-secondary)', marginRight: 5 }} />Staff</span> },
            ]}
          />
        ) : (
          <Tag
            color={role === 'ADMIN' ? 'gold' : 'default'}
            icon={role === 'ADMIN' ? <CrownOutlined /> : <UserOutlined />}
          >
            {role}
          </Tag>
        )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={status === 'ACTIVE' ? 'success' : 'default'}
          text={<span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{status}</span>}
        />
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 5 }} />
          {date ? formatIndianDate(date) : '—'}
        </span>
      ),
    },
    ...(currentUserRole === 'ADMIN' ? [{
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Popconfirm
          title={`Remove ${record.userId?.name || 'this member'} from workspace?`}
          description="This action cannot be undone. They will lose access immediately."
          onConfirm={() => handleRemove(record._id, record.userId?.name || 'Member')}
          okText="Remove"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
        </Popconfirm>
      ),
    }] : []),
  ];

  const auditColumns = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{action}</Tag>
      ),
    },
    {
      title: 'Resource',
      key: 'resource',
      render: (record: any) => (
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {record.resourceType} {record.resourceId ? `· ${String(record.resourceId).slice(-8)}` : ''}
        </span>
      ),
    },
    {
      title: 'Actor',
      dataIndex: 'actorUserId',
      key: 'actorUserId',
      render: (actor: any) => (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <UserOutlined style={{ marginRight: 4 }} />
          {actor?.name || actor?.email || '—'}
        </span>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            <TeamOutlined style={{ color: 'var(--neon)', marginRight: 10 }} />
            Team & Access Control
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Manage workspace members, roles, and view full security audit trail
          </p>
        </div>
        {currentUserRole === 'ADMIN' && (
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsInviteOpen(true)}
            size="large"
          >
            Invite Member
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Members', value: members.length, icon: <TeamOutlined />, color: 'var(--neon)' },
          { label: 'Admins', value: members.filter(m => m.role === 'ADMIN').length, icon: <CrownOutlined />, color: 'var(--warning)' },
          { label: 'Staff', value: members.filter(m => m.role === 'STAFF').length, icon: <UserOutlined />, color: 'var(--accent)' },
          { label: 'Active', value: members.filter(m => m.status === 'ACTIVE').length, icon: <SafetyCertificateOutlined />, color: 'var(--success)' },
        ].map(stat => (
          <Card
            key={stat.label}
            className="glass-panel hover-scale"
            bordered={false}
            style={{ flex: '1 1 160px', minWidth: 140 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 22, color: stat.color }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs
        defaultActiveKey="members"
        items={[
          {
            key: 'members',
            label: <span><TeamOutlined /> Members</span>,
            children: (
              <Card className="glass-panel" bordered={false}>
                <Table
                  dataSource={members}
                  columns={memberColumns}
                  rowKey="_id"
                  loading={loading}
                  className="dark-table"
                  locale={{ emptyText: <Empty description="No team members yet. Invite your first team member." /> }}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          ...(currentUserRole === 'ADMIN' ? [{
            key: 'audit',
            label: <span><AuditOutlined /> Audit Log</span>,
            children: (
              <Card className="glass-panel" bordered={false}>
                <Table
                  dataSource={auditLogs}
                  columns={auditColumns}
                  rowKey="_id"
                  loading={auditLoading}
                  className="dark-table"
                  locale={{ emptyText: <Empty description="No audit log entries yet." /> }}
                  pagination={{ pageSize: 15 }}
                />
              </Card>
            ),
          }] : []),
        ]}
      />

      {/* Invite Member Modal */}
      <Modal
        title={<span><UserAddOutlined style={{ color: 'var(--neon)', marginRight: 8 }} />Invite Team Member</span>}
        open={isInviteOpen}
        onCancel={() => { setIsInviteOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Divider style={{ borderColor: 'var(--border)', marginTop: 0 }} />
        <Form form={form} layout="vertical" onFinish={handleInvite}>
          <Form.Item
            name="email"
            label="Member Email Address"
            rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Enter a valid email' }]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder="colleague@company.com" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            initialValue="STAFF"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Select.Option value="STAFF">
                <UserOutlined style={{ marginRight: 6 }} />Staff — Can submit expenses, view inventory
              </Select.Option>
              <Select.Option value="ADMIN">
                <CrownOutlined style={{ marginRight: 6, color: 'var(--warning)' }} />Admin — Full workspace access
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <Button
              type="primary" htmlType="submit" block size="large"
              loading={inviteLoading}
              icon={<UserAddOutlined />}
            >
              Send Invitation
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Team;
