import { useEffect, useState } from 'react';
import { Card, Button, Tag, Row, Col, message, Spin, Badge, Divider, Alert } from 'antd';
import {
  CheckCircleFilled,
  CrownOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  CreditCardOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import api from '../utils/api';
import { formatINR } from '../utils/currency';
import type { BillingStatus } from '../types';

// Stripe is loaded dynamically on the server-side checkout redirect — no client-side Elements needed here

const PLANS = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 999,
    description: 'Perfect for small businesses & startups',
    icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#10b981' }} />,
    color: '#10b981',
    badge: null,
    features: [
      '1 Organization',
      '5 Team Members',
      'Inventory Management',
      'Expense Tracking (with GST)',
      'Staff Scheduling',
      'Basic Reports',
      'Email Support',
    ],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    price: 2999,
    description: 'For growing Indian businesses',
    icon: <RocketOutlined style={{ fontSize: 28, color: '#6366f1' }} />,
    color: '#6366f1',
    badge: 'Most Popular',
    features: [
      '3 Organizations',
      '25 Team Members',
      'Everything in Starter',
      'AI Business Assistant',
      'AI-Generated Reports',
      'GST Filing Assistant',
      'Real-time Alerts',
      'Priority Support',
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: 7999,
    description: 'Full-scale enterprise operations',
    icon: <CrownOutlined style={{ fontSize: 28, color: '#f59e0b' }} />,
    color: '#f59e0b',
    badge: 'Best Value',
    features: [
      'Unlimited Organizations',
      'Unlimited Team Members',
      'Everything in Professional',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Guarantee (99.9%)',
      'On-premise Deployment',
      '24/7 Phone Support',
    ],
  },
];

const Billing: React.FC = () => {
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get('success') === 'true';
  const isCancelled = params.get('cancelled') === 'true';
  const successPlan = params.get('plan');

  useEffect(() => {
    loadBillingStatus();
  }, []);

  const loadBillingStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get('/billing/status');
      setBillingStatus(res.data.data);
    } catch (err) {
      console.error('Failed to fetch billing status');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSubscribe = async (planKey: string) => {
    setCheckoutLoading(planKey);
    try {
      const res = await api.post('/billing/checkout', { plan: planKey });
      const { checkoutUrl } = res.data.data;
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to start checkout. Try again.');
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await api.post('/billing/portal');
      window.location.href = res.data.data.portalUrl;
    } catch (err: any) {
      message.error('Failed to open billing portal.');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Success / Cancel Banners */}
      {isSuccess && (
        <Alert
          message={`🎉 Subscription Activated! Welcome to InsightOps ${successPlan || ''} Plan.`}
          description="Your account has been upgraded. All premium features are now available."
          type="success"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 10 }}
        />
      )}
      {isCancelled && (
        <Alert
          message="Checkout Cancelled"
          description="No payment was made. You can subscribe anytime."
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 10 }}
        />
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <CreditCardOutlined style={{ fontSize: 28, color: '#6366f1' }} />
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#fff' }}>
            InsightOps <span className="gradient-text">Billing</span>
          </h1>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 16, margin: 0 }}>
          Transparent pricing in Indian Rupees (₹) — No hidden fees, No foreign currency surprises
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          <span style={{ color: '#10b981', fontSize: 13 }}><SafetyCertificateOutlined /> Secured by Stripe</span>
          <span style={{ color: '#10b981', fontSize: 13 }}><CheckCircleFilled /> Cancel Anytime</span>
          <span style={{ color: '#10b981', fontSize: 13 }}><CheckCircleFilled /> GST Invoice Provided</span>
        </div>
      </div>

      {/* Current Subscription Status */}
      {loadingStatus ? (
        <div style={{ textAlign: 'center', marginBottom: 24 }}><Spin /></div>
      ) : billingStatus?.status === 'ACTIVE' ? (
        <Card className="glass-panel" style={{ marginBottom: 32, borderColor: '#6366f1' }} bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Tag color="success" style={{ fontSize: 13, padding: '4px 12px' }}>
                ✅ Active Subscription
              </Tag>
              <span style={{ color: '#fff', marginLeft: 12, fontWeight: 600 }}>
                {billingStatus.plan} Plan
              </span>
              <span style={{ color: '#9ca3af', marginLeft: 16, fontSize: 13 }}>
                Renews: {new Date(billingStatus.currentPeriodEnd).toLocaleDateString('en-IN')}
              </span>
            </div>
            <Button icon={<SettingOutlined />} onClick={handleManageSubscription}>
              Manage Subscription
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="glass-panel" style={{ marginBottom: 32 }} bordered={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color="default" style={{ fontSize: 13, padding: '4px 12px' }}>Free Plan</Tag>
            <span style={{ color: '#9ca3af' }}>You are currently on the free tier. Upgrade to unlock all features.</span>
          </div>
        </Card>
      )}

      {/* Pricing Cards */}
      <Row gutter={[24, 24]}>
        {PLANS.map((plan) => {
          const isCurrentPlan = billingStatus?.plan === plan.key && billingStatus?.status === 'ACTIVE';
          return (
            <Col xs={24} md={8} key={plan.key}>
              <Badge.Ribbon
                text={plan.badge}
                color={plan.key === 'PROFESSIONAL' ? '#6366f1' : '#f59e0b'}
                style={{ display: plan.badge ? 'block' : 'none' }}
              >
                <Card
                  className="glass-panel hover-scale"
                  bordered={false}
                  style={{
                    height: '100%',
                    border: isCurrentPlan ? `2px solid ${plan.color}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {/* Plan Header */}
                  <div style={{ textAlign: 'center', paddingBottom: 20 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: `${plan.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                      border: `1px solid ${plan.color}40`,
                    }}>
                      {plan.icon}
                    </div>
                    <h2 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 22 }}>{plan.name}</h2>
                    <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0 0' }}>{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                      <span style={{ fontSize: 20, color: plan.color, fontWeight: 700 }}>₹</span>
                      <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                        {plan.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>per month + GST</span>
                  </div>

                  <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '0 0 20px' }} />

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <CheckCircleFilled style={{ color: plan.color, fontSize: 14 }} />
                        <span style={{ color: '#d1d5db', fontSize: 14 }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={checkoutLoading === plan.key}
                    disabled={isCurrentPlan || billingStatus?.status === 'ACTIVE'}
                    onClick={() => handleSubscribe(plan.key)}
                    style={{
                      background: isCurrentPlan
                        ? '#374151'
                        : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                      border: 'none',
                      fontWeight: 700,
                      height: 48,
                      borderRadius: 10,
                      fontSize: 15,
                    }}
                  >
                    {isCurrentPlan ? '✓ Current Plan' : `Subscribe — ${formatINR(plan.price)}/mo`}
                  </Button>
                </Card>
              </Badge.Ribbon>
            </Col>
          );
        })}
      </Row>

      {/* Footer Note */}
      <div style={{ textAlign: 'center', marginTop: 40, color: '#6b7280', fontSize: 13 }}>
        <p>Prices are exclusive of 18% GST · Billed monthly · Secured by Stripe · Cancel anytime</p>
        <p>For enterprise pricing above ₹10,000/month, <a href="mailto:sales@insightops.in" style={{ color: '#6366f1' }}>contact our sales team</a></p>
      </div>
    </div>
  );
};

export default Billing;
