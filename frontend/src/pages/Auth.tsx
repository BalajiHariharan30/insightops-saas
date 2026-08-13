import { useState } from 'react';
import { Card, Form, Input, Button, Tabs, message, Divider } from 'antd';
import {
  MailOutlined, LockOutlined, UserOutlined, GlobalOutlined,
  SafetyCertificateOutlined, ArrowLeftOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../utils/api';

// ── Types ─────────────────────────────────────────────────────────────────
type AuthStep = 'credentials' | 'otp';

interface MfaState {
  mfaToken: string;
  email: string;
}

// ── Helper: complete login and redirect ──────────────────────────────────
function finalizeLogin(accessToken: string, organizations: any[]) {
  if (accessToken) {
    localStorage.setItem('access_token', accessToken);
  }
  if (organizations && organizations.length > 0) {
    localStorage.setItem('active_organization_id', organizations[0].organization._id);
  }
  message.success('Welcome back!');
  window.location.href = '/';
}

// ── OTP Verification Step ────────────────────────────────────────────────
const OtpStep: React.FC<{
  mfaState: MfaState;
  onBack: () => void;
}> = ({ mfaState, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) {
      message.warning('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        mfaToken: mfaState.mfaToken,
        code,
      });
      const { accessToken, organizations } = res.data.data;
      finalizeLogin(accessToken, organizations);
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(0, 255, 136, 0.1)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <SafetyCertificateOutlined style={{ fontSize: 28, color: 'var(--accent-primary, #00ff88)' }} />
      </div>

      <h2 style={{ color: '#f0fdf4', margin: '0 0 6px', fontWeight: 700, fontSize: 20 }}>
        Verification Required
      </h2>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24 }}>
        A 6-digit code has been sent to<br />
        <strong style={{ color: '#f0fdf4' }}>{mfaState.email}</strong>
      </p>

      {/* 6 individual OTP digit boxes */}
      <Input
        id="otp-input"
        value={code}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setCode(val);
        }}
        onPressEnter={handleVerify}
        size="large"
        maxLength={6}
        placeholder="_ _ _ _ _ _"
        style={{
          textAlign: 'center',
          fontSize: 28,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.4em',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(0, 255, 136, 0.25)',
          color: '#f0fdf4',
          borderRadius: 10,
          height: 60,
          marginBottom: 20,
        }}
        autoFocus
      />

      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        disabled={code.length !== 6}
        onClick={handleVerify}
        style={{
          background: 'var(--accent-glow, #00ff88)',
          height: 44, fontWeight: 700, letterSpacing: '0.04em',
          marginBottom: 12,
        }}
      >
        Verify & Sign In
      </Button>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{ flex: 1, background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          Back
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={onBack}
          style={{ flex: 1, background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          Resend Code
        </Button>
      </div>

      <p style={{ color: '#475569', fontSize: 11, marginTop: 16 }}>
        Code expires in 10 minutes
      </p>
    </div>
  );
};

// ── Main Auth Page ────────────────────────────────────────────────────────
export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [authStep, setAuthStep] = useState<AuthStep>('credentials');
  const [mfaState, setMfaState] = useState<MfaState | null>(null);

  const [loginForm] = Form.useForm();

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      const data = response.data.data;

      // If backend signals MFA required, switch to OTP step
      if (data.mfaRequired) {
        setMfaState({ mfaToken: data.mfaToken, email: data.email });
        setAuthStep('otp');
        return;
      }

      // Normal login — no MFA
      finalizeLogin(data.accessToken, data.organizations);
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || error.response?.data?.message || 'Login failed. Please check credentials.');
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
      if (accessToken) localStorage.setItem('access_token', accessToken);
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

  // ── OTP step — full card replaced ───────────────────────────────────────
  if (authStep === 'otp' && mfaState) {
    return (
      <div className="auth-container">
        <div className="auth-glow" />
        <Card className="glass-panel auth-card animate-fade-in" bordered={false}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 4, fontWeight: 700 }}>InsightOps</h1>
            <p style={{ color: 'var(--text-muted)' }}>Multi-Tenant Business Operations Platform</p>
          </div>
          <OtpStep
            mfaState={mfaState}
            onBack={() => {
              setAuthStep('credentials');
              setMfaState(null);
              loginForm.resetFields(['password']);
            }}
          />
        </Card>
      </div>
    );
  }

  // ── Credentials step ─────────────────────────────────────────────────────
  return (
    <div className="auth-container">
      <div className="auth-glow" />
      <Card className="glass-panel auth-card animate-fade-in" bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 4, fontWeight: 700 }}>InsightOps</h1>
          <p style={{ color: 'var(--text-muted)' }}>Multi-Tenant Business Operations Platform</p>
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
              <Form.Item name="name" rules={[{ required: true, message: 'Please enter your name!' }]}>
                <Input prefix={<UserOutlined />} placeholder="Full Name" size="large" />
              </Form.Item>
              <Form.Item name="email" rules={[{ required: true, message: 'Please enter your email!' }, { type: 'email', message: 'Invalid email' }]}>
                <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
              </Form.Item>
              <Form.Item name="organizationName" rules={[{ required: true, message: 'Please enter organization name!' }]}>
                <Input prefix={<GlobalOutlined />} placeholder="Organization / Company Name" size="large" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: 'Password must be at least 8 characters' }, { min: 8, message: 'Min length is 8' }]}>
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
