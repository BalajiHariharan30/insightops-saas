import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Empty, message, Skeleton } from 'antd';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { InboxOutlined, DollarOutlined, CalendarOutlined, AlertOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { formatINR } from '../utils/currency';
import type { DashboardMetrics, AlertRecord, CategoryExpense } from '../types';

// Shape the category expenses for Recharts
interface ChartDataPoint {
  name: string;
  value: number;
}

export const Dashboard: React.FC = () => {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    inventory: { totalItems: 0, lowStockCount: 0, outOfStockCount: 0 },
    expenses: { currentMonthTotal: 0, previousMonthTotal: 0, percentageChange: 0 },
    scheduling: { activeShiftsThisWeek: 0 },
  });
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<ChartDataPoint[]>([]);

  // 1. Fetch ALL dashboard data in parallel — summary + alerts + chart at the same time
  const loadDashboardData = async () => {
    try {
      const [summaryRes, alertsRes, catRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/alerts'),
        api.get<{ data: CategoryExpense[] }>('/analytics/expenses-by-category'),
      ]);

      setMetrics(summaryRes.data.data);
      setAlerts(alertsRes.data.data);

      const topCategories: ChartDataPoint[] = catRes.data.data
        .slice(0, 7)
        .map((item) => ({ name: item._id, value: item.totalAmount }));
      setCategoryChartData(topCategories);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 2. Real-time updates subscription
  useEffect(() => {
    if (!socket) return;

    socket.on('expense.anomaly_detected', (newAlert: AlertRecord) => {
      message.warning(`⚠️ Anomaly detected: ${newAlert.message}`);
      setAlerts((prev) => [newAlert, ...prev]);
      loadDashboardData();
    });

    socket.on('inventory.updated', (item: { name: string; quantity: number }) => {
      message.info(`📦 Inventory updated: "${item.name}" stock level is now ${item.quantity}`);
      loadDashboardData();
    });

    socket.on('schedule.updated', () => {
      message.info(`📅 Staff schedule shift roster updated.`);
      loadDashboardData();
    });

    return () => {
      socket.off('expense.anomaly_detected');
      socket.off('inventory.updated');
      socket.off('schedule.updated');
    };
  }, [socket]);

  const handleDismissAlert = async (alertId: string) => {
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      message.success('Alert dismissed.');
      setAlerts((prev) => prev.map((a) => (a._id === alertId ? { ...a, status: 'DISMISSED' as const } : a)));
    } catch (err) {
      message.error('Failed to dismiss alert.');
    }
  };

  const alertColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'ANOMALY_EXPENSE' ? 'volcano' : 'gold'}>
          {type.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (sev: string) => (
        <Tag color={sev === 'CRITICAL' ? 'red' : 'orange'}>
          {sev}
        </Tag>
      ),
    },
    {
      title: 'Alert Message',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleTimeString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: AlertRecord) => (
        status === 'ACTIVE' ? (
          <Button type="link" danger onClick={() => handleDismissAlert(record._id)}>
            Dismiss
          </Button>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}><CheckCircleOutlined /> Dismissed</span>
        )
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-panel stat-card" loading={loading} bordered={false}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)' }}>Total Inventory Items</span>}
              value={metrics.inventory.totalItems}
              prefix={<InboxOutlined style={{ color: 'var(--accent-glow)', marginRight: 8 }} />}
              valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-panel stat-card" loading={loading} bordered={false}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)' }}>Expenses (This Month)</span>}
              value={metrics.expenses.currentMonthTotal}
              formatter={(v) => formatINR(Number(v))}
              prefix={<DollarOutlined style={{ color: '#10b981', marginRight: 8 }} />}
              valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-panel stat-card" loading={loading} bordered={false}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)' }}>Low Stock Alerts</span>}
              value={metrics.inventory.lowStockCount}
              prefix={<AlertOutlined style={{ color: '#ef4444', marginRight: 8 }} />}
              valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-panel stat-card" loading={loading} bordered={false}>
            <Statistic
              title={<span style={{ color: 'var(--text-muted)' }}>Shifts This Week</span>}
              value={metrics.scheduling.activeShiftsThisWeek}
              prefix={<CalendarOutlined style={{ color: '#6366f1', marginRight: 8 }} />}
              valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* AI Insight Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            className="glass-panel"
            bordered={false}
            style={{ borderLeft: '3px solid var(--neon)', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--neon)', letterSpacing: '0.06em' }}>
              AI · STOCK INSIGHT
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Inventory Health</div>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
            ) : metrics.inventory.outOfStockCount > 0 ? (
              <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>
                🔴 {metrics.inventory.outOfStockCount} item(s) are completely out of stock. Immediate reorder needed.
              </div>
            ) : metrics.inventory.lowStockCount > 0 ? (
              <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>
                🟡 {metrics.inventory.lowStockCount} item(s) are running low. Consider restocking soon.
              </div>
            ) : (
              <div style={{ color: 'var(--neon)', fontWeight: 600, fontSize: 13 }}>
                ✅ All inventory items are well-stocked.
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="glass-panel"
            bordered={false}
            style={{ borderLeft: '3px solid #6366f1', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#6366f1', letterSpacing: '0.06em' }}>
              AI · SPEND INSIGHT
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Spend Trend</div>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
            ) : metrics.expenses.percentageChange > 20 ? (
              <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>
                📈 Spending is up <strong>{metrics.expenses.percentageChange.toFixed(1)}%</strong> vs last month. Review large expenses.
              </div>
            ) : metrics.expenses.percentageChange < -10 ? (
              <div style={{ color: 'var(--neon)', fontWeight: 600, fontSize: 13 }}>
                📉 Great! Spending is down <strong>{Math.abs(metrics.expenses.percentageChange).toFixed(1)}%</strong> vs last month.
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}>
                📊 Spending is stable ({metrics.expenses.percentageChange >= 0 ? '+' : ''}{metrics.expenses.percentageChange.toFixed(1)}% vs last month).
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="glass-panel"
            bordered={false}
            style={{ borderLeft: '3px solid #f59e0b', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#f59e0b', letterSpacing: '0.06em' }}>
              AI · ALERT INSIGHT
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Active Alerts</div>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
            ) : alerts.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length > 0 ? (
              <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>
                🚨 {alerts.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length} critical alert(s) require immediate attention.
              </div>
            ) : alerts.filter(a => a.status === 'ACTIVE').length > 0 ? (
              <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>
                ⚠️ {alerts.filter(a => a.status === 'ACTIVE').length} active warning alert(s). Review below.
              </div>
            ) : (
              <div style={{ color: 'var(--neon)', fontWeight: 600, fontSize: 13 }}>
                ✅ No active alerts. Operations running normally.
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card className="glass-panel" title="Real-Time Operation Anomaly Alerts" bordered={false}>
            <Table
              dataSource={alerts}
              columns={alertColumns}
              rowKey="_id"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: <Empty description="No anomaly alerts generated." /> }}
              loading={loading}
              className="dark-table"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card className="glass-panel" title="Expenses by Category (Live)" bordered={false}>
            {chartLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : categoryChartData.length === 0 ? (
              <Empty description="No approved expenses yet — data will appear here once expenses are recorded." />
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical">
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#1a1c26', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }}
                      formatter={(v: number) => [formatINR(v), 'Total']}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="glass-panel" title="Month-over-Month Expense Trend" bordered={false}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { name: 'Previous Month', Expenses: metrics.expenses.previousMonthTotal },
                      { name: 'This Month', Expenses: metrics.expenses.currentMonthTotal },
                    ]}
                  >
                    <defs>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#1a1c26', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }}
                      formatter={(v: number) => [formatINR(v), 'Expenses']}
                    />
                    <Area type="monotone" dataKey="Expenses" stroke="#6366f1" fillOpacity={1} fill="url(#colorExpenses)" />
                  </AreaChart>
                </ResponsiveContainer>
                {metrics.expenses.percentageChange !== 0 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Tag color={metrics.expenses.percentageChange > 0 ? 'red' : 'green'}>
                      {metrics.expenses.percentageChange > 0 ? '▲' : '▼'}{' '}
                      {Math.abs(metrics.expenses.percentageChange).toFixed(1)}% vs last month
                    </Tag>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
export default Dashboard;
