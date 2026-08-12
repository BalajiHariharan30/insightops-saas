import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Tag, Spin, Empty, Table } from 'antd';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined,
  BarChartOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../utils/api';

const COLORS = ['#00ff88', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'];

const SUGGESTED_PROMPTS = [
  { label: 'Low stock items', prompt: 'Which inventory items are low on stock?' },
  { label: 'Top expenses', prompt: 'Show total expenses grouped by category' },
  { label: 'Pending approvals', prompt: 'List all pending expenses' },
  { label: 'Out of stock', prompt: 'Which products are completely out of stock?' },
  { label: 'Published shifts', prompt: 'Show all published staff shifts' },
  { label: 'Active alerts', prompt: 'What are the active system alerts?' },
  { label: 'Most expensive vendor', prompt: 'Which vendor has the highest total expense amount?' },
  { label: 'Stock value', prompt: 'What is the total inventory stock value by item?' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: any;
  error?: string;
  timestamp: Date;
}

const formatValue = (val: any) => {
  if (typeof val === 'number') {
    return val > 1000 ? `₹${val.toLocaleString('en-IN')}` : val.toLocaleString('en-IN');
  }
  return String(val ?? '—');
};

const ResultView = ({ result }: { result: any }) => {
  if (!result?.results || result.results.length === 0) {
    return <Empty description="No data found for this query." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const { visualization, results } = result;

  if (visualization === 'pie') {
    return (
      <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={results}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
            >
              {results.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any) => formatValue(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (visualization === 'bar') {
    return (
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={results}>
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#1a1c26', borderRadius: 8, border: '1px solid var(--border)' }}
              formatter={(v: any) => formatValue(v)}
            />
            <Bar dataKey="value" fill="var(--neon)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Table fallback
  const keys = Object.keys(results[0]).filter(k => k !== '_id');
  const columns = keys.map(key => ({
    title: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
    dataIndex: key,
    key,
    render: (val: any) => formatValue(val),
  }));

  return (
    <Table
      dataSource={results}
      columns={columns}
      rowKey={(_r, idx) => String(idx)}
      pagination={{ pageSize: 5 }}
      className="dark-table"
      size="small"
    />
  );
};

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildHistory = () =>
    messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setPrompt('');
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await api.post('/ask', {
        prompt: text,
        conversationHistory: buildHistory(),
      });

      const data = res.data.data;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Queried **${data.query?.collection}** collection. Found **${data.results?.length ?? 0}** record(s).`,
        result: data,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        error: err.response?.data?.message || 'AI query failed. Please try rephrasing your question.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => setMessages([]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RobotOutlined style={{ color: 'var(--neon)' }} />
            InsightOps AI Assistant
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Ask anything about your inventory, expenses, shifts, or alerts. Context-aware — remembers your conversation.
          </p>
        </div>
        {messages.length > 0 && (
          <Button icon={<ReloadOutlined />} size="small" onClick={handleClear} style={{ color: 'var(--text-muted)' }}>
            Clear chat
          </Button>
        )}
      </div>

      {/* Suggested Prompts — only shown when chat is empty */}
      {messages.length === 0 && (
        <Card className="glass-panel" bordered={false} style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            <ThunderboltOutlined style={{ marginRight: 6, color: 'var(--neon)' }} />
            Suggested Questions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTED_PROMPTS.map(s => (
              <Tag
                key={s.label}
                onClick={() => sendMessage(s.prompt)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 0.2s',
                }}
                className="hover-scale"
              >
                {s.label}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* Chat Window */}
      <Card
        className="glass-panel"
        bordered={false}
        bodyStyle={{ padding: 0 }}
        style={{ marginBottom: 16 }}
      >
        <div style={{ minHeight: 300, maxHeight: 520, overflowY: 'auto', padding: '20px' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--text-muted)' }}>
              <RobotOutlined style={{ fontSize: 48, color: 'var(--neon)', opacity: 0.4, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Ask a question to analyse your business data</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontFamily: 'var(--font-mono)' }}>Natural language → live database results</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  marginBottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Bubble */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: '90%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? 'var(--neon-muted)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${msg.role === 'user' ? 'var(--neon)' : 'rgba(99,102,241,0.4)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {msg.role === 'user'
                      ? <UserOutlined style={{ color: 'var(--neon)', fontSize: 14 }} />
                      : <RobotOutlined style={{ color: '#6366f1', fontSize: 14 }} />
                    }
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Text bubble */}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: msg.role === 'user' ? 'var(--neon-muted)' : 'var(--bg-tertiary)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(0,255,136,0.2)' : 'var(--border)'}`,
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}>
                      {msg.error ? (
                        <span style={{ color: 'var(--error)' }}>⚠ {msg.error}</span>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {/* Result visualization */}
                    {msg.result && (
                      <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}>
                        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <BarChartOutlined style={{ color: 'var(--neon)' }} />
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {msg.result.query?.visualization?.toUpperCase() || 'TABLE'} · {msg.result.query?.collection}
                          </span>
                        </div>
                        <ResultView result={msg.result} />
                      </div>
                    )}

                    {/* Timestamp */}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', marginTop: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RobotOutlined style={{ color: '#6366f1', fontSize: 14 }} />
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 6 }}>
                <Spin size="small" />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>Querying database...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <Input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onPressEnter={() => sendMessage(prompt)}
            placeholder="Ask anything — 'Which items are low on stock?' or 'Total expense by vendor'"
            size="large"
            disabled={loading}
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            size="large"
            loading={loading}
            onClick={() => sendMessage(prompt)}
            disabled={!prompt.trim()}
            style={{ background: 'var(--accent-glow)', minWidth: 100 }}
          >
            Ask AI
          </Button>
        </div>
      </Card>

      {/* Suggested prompts when chat has messages */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTED_PROMPTS.slice(0, 4).map(s => (
            <Tag
              key={s.label}
              onClick={() => sendMessage(s.prompt)}
              style={{
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {s.label}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
