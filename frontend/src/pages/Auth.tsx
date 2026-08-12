import { useState } from 'react';
import { Card, Form, Input, Button, Tabs, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, GlobalOutlined } from '@ant-design/icons';
import api from '../utils/api';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      const { accessToken, organizations } = response.data.data;

      // Store the access token so api.ts can attach it to all future requests
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
      }

      // Store the first organization as the active context
      if (organizations && organizations.length > 0) {
        localStorage.setItem('active_organization_id', organizations[0].organization._id);
      }

      message.success('Welcome back!');
      window.location.href = '/';
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password,
        organizationName: values.organizationName,
      });

      const { accessToken } = response.data.data;

      // Store access token
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
      }

      if (response.data.data.organization) {
        localStorage.setItem('active_organization_id', response.data.data.organization._id);
      }

      message.success('Account & organization created successfully!');
      window.location.href = '/';
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const [loginForm] = Form.useForm();

  return (
    <div className="auth-container">
      <div className="auth-glow" />
      <Card className="glass-panel auth-card animate-fade-in" bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 4, fontWeight: 700 }}>InsightOps</h1>
          <p style={{ color: 'var(--text-muted)' }}>Multi-Tenant AI Business Operations Platform</p>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <Tabs.TabPane tab="Sign In" key="login">
            <Form
              form={loginForm}
              name="login_form"
              layout="vertical"
              onFinish={onFinishLogin}
              autoComplete="off"
            >
              <Form.Item
                name="email"
                rules={[{ required: true, message: 'Please enter your email!' }, { type: 'email', message: 'Invalid email address' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" autoComplete="off" spellCheck={false} />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please enter your password!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" autoComplete="new-password" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ background: 'var(--accent-glow)', height: 44, fontWeight: 700, letterSpacing: '0.04em' }}>
                  Sign In
                </Button>
              </Form.Item>

              <Divider style={{ borderColor: 'var(--border)', margin: '18px 0 14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  or continue with
                </span>
              </Divider>

              <div>
                <Button
                  onClick={() => { window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:10000/api/v1'}/auth/google`; }}
                  className="hover-scale"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontWeight: 600,
                    height: 44,
                    borderRadius: 8,
                  }}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
                  <span>Google Workspace</span>
                </Button>
              </div>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Register Account" key="register">
            <Form name="register_form" layout="vertical" onFinish={onFinishRegister}>
              <Form.Item
                name="name"
                rules={[{ required: true, message: 'Please enter your name!' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Full Name" size="large" />
              </Form.Item>
              <Form.Item
                name="email"
                rules={[{ required: true, message: 'Please enter your email!' }, { type: 'email', message: 'Invalid email' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
              </Form.Item>
              <Form.Item
                name="organizationName"
                rules={[{ required: true, message: 'Please enter organization name!' }]}
              >
                <Input prefix={<GlobalOutlined />} placeholder="Organization / Company Name" size="large" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Password must be at least 8 characters' }, { min: 8, message: 'Min length is 8' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Password (Min 8 characters)" size="large" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ background: 'var(--accent-glow)', height: 44, fontWeight: 700, letterSpacing: '0.04em' }}>
                  Create Organization Account
                </Button>
              </Form.Item>

              <Divider style={{ borderColor: 'var(--border)', margin: '18px 0 14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  or continue with
                </span>
              </Divider>

              <div>
                <Button
                  onClick={() => { window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:10000/api/v1'}/auth/google`; }}
                  className="hover-scale"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontWeight: 600,
                    height: 44,
                    borderRadius: 8,
                  }}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
                  <span>Google Workspace</span>
                </Button>
              </div>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};
export default Auth;
