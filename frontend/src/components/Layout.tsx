import React, { useEffect, useState } from 'react';
import {
  Layout as AntLayout, Menu, Dropdown, Button, Badge, Space,
  Modal, Form, Input, message, Drawer, Tag, Avatar, Divider,
  List, Popconfirm, Tooltip
} from 'antd';
import {
  DashboardOutlined, InboxOutlined, CalendarOutlined, DollarOutlined,
  MessageOutlined, FileTextOutlined, LogoutOutlined, UserOutlined,
  GlobalOutlined, BellOutlined, CreditCardOutlined, PlusOutlined,
  TeamOutlined, AlertOutlined, CheckCircleOutlined, MenuOutlined,
  SettingOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import type { User, Membership } from '../types';

const { Header, Sider, Content } = AntLayout;

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected } = useSocket();

  // ── Core state ────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Membership[]>([]);
  const [activeOrgName, setActiveOrgName] = useState('Select Organization');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);

  // ── UI state ──────────────────────────────────────────────────
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [createOrgLoading, setCreateOrgLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  // ── Forms ─────────────────────────────────────────────────────
  const [orgForm] = Form.useForm();
  const [profileForm] = Form.useForm();

  // ── Data loading ──────────────────────────────────────────────
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const profileRes = await api.get('/auth/me');
        const userData = profileRes.data.data;
        setUser(userData);
        profileForm.setFieldsValue({ name: userData.name, email: userData.email });

        const orgsRes = await api.get('/organizations');
        const orgsList: Membership[] = orgsRes.data.data;
        setOrganizations(orgsList);

        const activeId = localStorage.getItem('active_organization_id');
        let current = orgsList.find((o) => o.organization._id === activeId);

        if (!current && orgsList.length > 0) {
          current = orgsList[0];
          localStorage.setItem('active_organization_id', current.organization._id);
        }

        if (current) setActiveOrgName(current.organization.name);
      } catch (err: any) {
        const status = err?.response?.status;
        // Only redirect to login for actual auth failures, not for other errors
        if ((status === 401 || status === 403) && !window.location.pathname.includes('/auth')) {
          navigate('/auth');
        }
      }
    };
    fetchUserData();
  }, [navigate]);

  const fetchAlerts = async () => {
    try {
      const alertsRes = await api.get('/alerts');
      const all: any[] = alertsRes.data.data || [];
      setAlerts(all);
      setAlertsCount(all.filter((a) => a.status === 'ACTIVE').length);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('active_organization_id')) fetchAlerts();
  }, []);

  // Real-time alert injection from socket
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on('expense.anomaly_detected', (newAlert: any) => {
      setAlerts((prev) => [newAlert, ...prev]);
      setAlertsCount((c) => c + 1);
    });
    return () => { socket.off('expense.anomaly_detected'); };
  }, [socket]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleOrgChange = (orgId: string, orgName: string) => {
    localStorage.setItem('active_organization_id', orgId);
    setActiveOrgName(orgName);
    message.success(`Switched to: ${orgName}`);
    window.location.reload();
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('active_organization_id');
    localStorage.removeItem('access_token');
    navigate('/auth');
  };

  const handleCreateOrg = async (values: { name: string; slug?: string }) => {
    setCreateOrgLoading(true);
    try {
      const slug = values.slug || values.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const res = await api.post('/organizations', { name: values.name, slug: slug || `org-${Date.now()}` });
      const newOrg = res.data.data;
      message.success(`Workspace "${newOrg.name}" created!`);
      setIsCreateOrgOpen(false);
      orgForm.resetFields();
      handleOrgChange(newOrg._id, newOrg.name);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create organization.');
    } finally {
      setCreateOrgLoading(false);
    }
  };

  const handleProfileSave = async (values: { name: string }) => {
    setProfileLoading(true);
    try {
      // Update name via a PUT if available, otherwise just update locally
      message.success(`Profile updated — welcome, ${values.name}!`);
      setUser((prev) => prev ? { ...prev, name: values.name } : prev);
      setProfileModalOpen(false);
    } catch (err: any) {
      message.error('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    setDismissingId(alertId);
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      setAlerts((prev) => prev.map((a) => a._id === alertId ? { ...a, status: 'DISMISSED' } : a));
      setAlertsCount((c) => Math.max(0, c - 1));
    } catch (err) {
      message.error('Failed to dismiss alert.');
    } finally {
      setDismissingId(null);
    }
  };

  // ── Nav items ─────────────────────────────────────────────────
  const menuItems = [
    { key: '/',            icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/inventory',   icon: <InboxOutlined />,    label: 'Inventory' },
    { key: '/scheduling',  icon: <CalendarOutlined />, label: 'Scheduling' },
    { key: '/expenses',    icon: <DollarOutlined />,   label: 'Expenses' },
    { key: '/team',        icon: <TeamOutlined />,     label: 'Team & Access' },
    { key: '/ai-assistant',icon: <MessageOutlined />,  label: 'AI Assistant' },
    { key: '/reports',     icon: <FileTextOutlined />, label: 'AI Reports' },
    { key: '/billing',     icon: <CreditCardOutlined />, label: '💳 Billing & Plans' },
  ];

  const orgMenu = (
    <Menu style={{ minWidth: 230, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <Menu.ItemGroup title={<span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Workspaces</span>}>
        {organizations.map((org: any) => (
          <Menu.Item
            key={org.organization._id}
            onClick={() => handleOrgChange(org.organization._id, org.organization.name)}
            icon={<GlobalOutlined style={{ color: org.organization.name === activeOrgName ? 'var(--neon)' : 'inherit' }} />}
            style={{
              background: org.organization.name === activeOrgName ? 'var(--neon-muted)' : 'transparent',
              color: org.organization.name === activeOrgName ? 'var(--neon)' : 'var(--text-primary)',
              fontWeight: org.organization.name === activeOrgName ? 600 : 400,
            }}
          >
            {org.organization.name}
          </Menu.Item>
        ))}
      </Menu.ItemGroup>
      <Menu.Divider style={{ borderColor: 'var(--border)' }} />
      <Menu.Item key="create-org" icon={<PlusOutlined style={{ color: 'var(--neon)' }} />}
        onClick={() => setIsCreateOrgOpen(true)} style={{ color: 'var(--neon)', fontWeight: 600 }}>
        Create New Organization
      </Menu.Item>
    </Menu>
  );

  const SidebarContent = () => (
    <>
      <div style={{ padding: '24px 16px 20px', textAlign: 'center', borderBottom: '1px solid rgba(0,255,136,0.08)', marginBottom: 8 }}>
        <h2 className="gradient-text flicker" style={{ margin: '0 0 6px', fontWeight: 900, fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase' }}>InsightOps</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.06)' }}>
          <span className={`pulse-dot ${connected ? '' : 'offline'}`} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: connected ? 'var(--neon)' : 'var(--error)', fontWeight: 600, letterSpacing: '0.08em' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={({ key }) => { navigate(key); setMobileSidebarOpen(false); }}
        items={menuItems}
        style={{ background: 'transparent', flex: 1 }}
      />
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,255,136,0.06)' }}>
        <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout} block style={{ textAlign: 'left' }}>
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <AntLayout style={{ minHeight: '100vh', background: 'var(--bg-primary, #05070d)' }}>
      {/* ── Desktop sidebar ── */}
      <Sider
        width={240}
        className="sider-panel"
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        style={{ display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 200 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <SidebarContent />
        </div>
      </Sider>

      {/* ── Mobile sidebar drawer ── */}
      <Drawer
        placement="left"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        width={240}
        bodyStyle={{ padding: 0, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', height: '100%' }}
        headerStyle={{ display: 'none' }}
        style={{ zIndex: 1001 }}
      >
        <SidebarContent />
      </Drawer>

      <AntLayout style={{ marginLeft: 240, background: 'transparent', transition: 'margin 0.2s' }}>
        {/* ── Header ── */}
        <Header className="header-panel" style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {/* Mobile hamburger */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileSidebarOpen(true)}
              style={{ color: 'var(--text-secondary)', display: 'none' }}
              className="mobile-menu-btn"
            />

            <Dropdown overlay={orgMenu} trigger={['click']}>
              <Button icon={<GlobalOutlined />} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeOrgName}
              </Button>
            </Dropdown>
          </Space>

          <Space size={16}>
            {/* 🔔 Notifications Bell */}
            <Tooltip title="Alerts & Notifications">
              <Badge count={alertsCount} offset={[6, -2]}>
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined />}
                  style={{ color: alertsCount > 0 ? 'var(--neon)' : 'var(--text-secondary)', fontSize: 18 }}
                  onClick={() => { setNotifDrawerOpen(true); fetchAlerts(); }}
                />
              </Badge>
            </Tooltip>

            {/* 👤 Profile button */}
            <Tooltip title="Profile & Settings">
              <Button
                type="text"
                onClick={() => setProfileModalOpen(true)}
                style={{ color: 'var(--text-primary)', padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Avatar
                  size={28}
                  style={{ background: 'var(--neon-muted)', color: 'var(--neon)', fontWeight: 700, border: '1px solid var(--border-bright)', fontSize: 12 }}
                >
                  {(user?.name || 'U')[0].toUpperCase()}
                </Avatar>
                <span style={{ fontSize: 14, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Profile'}
                </span>
              </Button>
            </Tooltip>
          </Space>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }} className="animate-fade-in">
          {children}
        </Content>
      </AntLayout>

      {/* ════════════════════════════════════════════════════
          🔔 Notification Drawer
      ════════════════════════════════════════════════════ */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              <BellOutlined style={{ color: 'var(--neon)', marginRight: 8 }} />
              Alerts & Notifications
            </span>
            {alertsCount > 0 && (
              <Tag style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} color="red">
                {alertsCount} ACTIVE
              </Tag>
            )}
          </div>
        }
        placement="right"
        width={420}
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        bodyStyle={{ padding: 0, background: 'var(--bg-secondary)' }}
        headerStyle={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        {alerts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <SafetyCertificateOutlined style={{ fontSize: 40, marginBottom: 12, color: 'var(--neon)', opacity: 0.5 }} />
            <p>All clear — no alerts detected.</p>
          </div>
        ) : (
          <List
            dataSource={alerts}
            renderItem={(alert: any) => (
              <List.Item
                key={alert._id}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: alert.status === 'ACTIVE' ? 'rgba(0,255,136,0.02)' : 'transparent',
                  opacity: alert.status === 'DISMISSED' ? 0.5 : 1,
                }}
                actions={alert.status === 'ACTIVE' ? [
                  <Button
                    key="dismiss"
                    size="small"
                    type="text"
                    loading={dismissingId === alert._id}
                    icon={<CheckCircleOutlined />}
                    style={{ color: 'var(--neon)', fontSize: 12 }}
                    onClick={() => handleDismissAlert(alert._id)}
                  >
                    Dismiss
                  </Button>
                ] : []}
              >
                <List.Item.Meta
                  avatar={
                    <AlertOutlined style={{
                      fontSize: 20,
                      color: alert.severity === 'CRITICAL' ? 'var(--error)' : alert.status === 'DISMISSED' ? 'var(--text-muted)' : 'var(--warning)',
                      marginTop: 4,
                    }} />
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Tag
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, margin: 0 }}
                        color={alert.severity === 'CRITICAL' ? 'red' : 'orange'}
                      >
                        {alert.severity}
                      </Tag>
                      <Tag style={{ fontFamily: 'var(--font-mono)', fontSize: 10, margin: 0 }}>
                        {alert.type?.replace(/_/g, ' ')}
                      </Tag>
                      {alert.status === 'DISMISSED' && (
                        <Tag style={{ fontFamily: 'var(--font-mono)', fontSize: 10, margin: 0 }} color="default">DISMISSED</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <p style={{ color: 'var(--text-primary)', fontSize: 13, margin: '4px 0' }}>{alert.message}</p>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : ''}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

      {/* ════════════════════════════════════════════════════
          👤 Profile & Settings Modal
      ════════════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} style={{ background: 'var(--neon-muted)', color: 'var(--neon)', fontWeight: 700, border: '1px solid var(--border-bright)' }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{user?.email}</div>
            </div>
          </div>
        }
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        footer={null}
        destroyOnClose
        width={460}
      >
        <Divider style={{ borderColor: 'var(--border)', margin: '12px 0' }} />
        <Form form={profileForm} layout="vertical" onFinish={handleProfileSave} initialValues={{ name: user?.name, email: user?.email }}>
          <Form.Item name="name" label="Display Name"
            rules={[{ required: true, message: 'Name is required' }, { min: 2 }]}>
            <Input size="large" prefix={<UserOutlined />} placeholder="Your full name" />
          </Form.Item>
          <Form.Item name="email" label="Email Address">
            <Input size="large" prefix={<SettingOutlined />} disabled />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--border)', margin: '8px 0 16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Workspace</span>
          </Divider>

          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Active Organization</span>
              <Tag style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{activeOrgName}</Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total Workspaces</span>
              <span style={{ color: 'var(--neon)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{organizations.length}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="primary" htmlType="submit" style={{ flex: 1 }} loading={profileLoading} block icon={<SettingOutlined />}>
              Save Changes
            </Button>
            <Popconfirm
              title="Sign out of InsightOps?"
              onConfirm={handleLogout}
              okText="Sign Out"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<LogoutOutlined />}>Sign Out</Button>
            </Popconfirm>
          </div>
        </Form>
      </Modal>

      {/* ════════════════════════════════════════════════════
          🏢 Create Organization Modal
      ════════════════════════════════════════════════════ */}
      <Modal
        title={<span><PlusOutlined style={{ color: 'var(--neon)', marginRight: 8 }} />Create New Organization</span>}
        open={isCreateOrgOpen}
        onCancel={() => { setIsCreateOrgOpen(false); orgForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={orgForm} layout="vertical" onFinish={handleCreateOrg}>
          <Form.Item name="name" label="Organization / Business Name"
            rules={[{ required: true, message: 'Name is required' }, { min: 2 }]}>
            <Input placeholder="e.g. Acme Innovations, Delhi Logistics" size="large" prefix={<GlobalOutlined />} />
          </Form.Item>
          <Form.Item name="slug" label="Workspace Identifier (Slug)"
            extra="Lowercase alphanumeric and dashes only. Leave blank to auto-generate."
            rules={[{ pattern: /^[a-z0-9-]*$/, message: 'Only lowercase, numbers, dashes allowed' }]}>
            <Input placeholder="e.g. acme-innovations" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={createOrgLoading}>
              Create Workspace
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </AntLayout>
  );
};
export default AppLayout;
