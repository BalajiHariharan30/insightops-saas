import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Drawer, Radio, Tag, message } from 'antd';
import { PlusOutlined, RetweetOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { formatINR } from '../utils/currency';
import { exportToCSV } from '../utils/export';

export const Inventory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [cursor, _setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  // Modals / Drawers states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();

  const loadInventory = async (currentCursor?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: { limit: 10, cursor: currentCursor },
      });
      const data = res.data.data;
      setItems(data.items || data.results || []);
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      message.error('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await api.post('/inventory', {
        sku: values.sku,
        name: values.name,
        category: values.category,
        quantity: Number(values.quantity) || 0,
        reorderPoint: Number(values.reorderPoint) || 10,
        unitCost: Number(values.unitCost) || 0,
        sellingPrice: Number(values.sellingPrice) || 0,
        supplier: values.supplier || 'Standard Supplier',
      });
      message.success('Inventory item created successfully.');
      setIsCreateOpen(false);
      form.resetFields();
      loadInventory();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create item.');
    }
  };

  const handleAdjustStock = async (values: any) => {
    try {
      const qtyChange = values.type === 'OUTGOING' ? -values.quantity : values.quantity;
      await api.post(`/inventory/${selectedItem._id}/adjust`, {
        quantity: qtyChange,
        type: values.type,
      });

      message.success('Stock levels updated.');
      setIsAdjustOpen(false);
      adjustForm.resetFields();
      loadInventory();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Adjustment failed.');
    }
  };

  const columns = [
    {
      title: 'SKU Code',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => <code style={{ color: 'var(--accent-glow)' }}>{sku}</code>,
    },
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag color="geekblue">{cat}</Tag>,
    },
    {
      title: 'In Stock',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record: any) => {
        let color = '#10b981';
        if (record.status === 'LOW_STOCK') color = '#f59e0b';
        if (record.status === 'OUT_OF_STOCK') color = '#ef4444';
        return <span style={{ color, fontWeight: 600 }}>{qty}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'success';
        if (status === 'LOW_STOCK') color = 'warning';
        if (status === 'OUT_OF_STOCK') color = 'error';
        return <Tag color={color}>{status.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Unit Selling Price (₹)',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price: number) => <span style={{ color: '#10b981', fontWeight: 600 }}>{formatINR(price)}</span>,
    },
    {
      title: 'Unit Cost (₹)',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (cost: number) => <span style={{ color: '#9ca3af' }}>{cost ? formatINR(cost) : '—'}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<RetweetOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setIsAdjustOpen(true);
            }}
          >
            Adjust Stock
          </Button>
        </Space>
      ),
    },
  ];

  const handleExportCSV = () => {
    if (!items || items.length === 0) {
      message.warning('No inventory items to export.');
      return;
    }
    const flatItems = items.map(item => ({
      SKU: item.sku,
      Name: item.name,
      Category: item.category,
      QuantityInStock: item.quantity,
      Status: item.status,
      SellingPrice_INR: item.sellingPrice,
      UnitCost_INR: item.unitCost || 0,
      ReorderPoint: item.reorderPoint,
      Supplier: item.supplier || '',
    }));
    exportToCSV(`InsightOps_Inventory_${Date.now()}`, flatItems);
    message.success('Inventory CSV exported successfully.');
  };

  return (
    <Card
      className="glass-panel"
      title="Inventory Ledger — India Edition"
      extra={
        <Space>
          <Button icon={<FileExcelOutlined style={{ color: '#10b981' }} />} onClick={handleExportCSV} disabled={items.length === 0}>
            Export CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)} style={{ background: 'var(--accent-glow)' }}>
            Add Item
          </Button>
        </Space>
      }
      bordered={false}
    >
      <Table
        dataSource={items}
        columns={columns}
        rowKey="_id"
        pagination={false}
        loading={loading}
        className="dark-table"
      />

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={!cursor} onClick={() => {}}>Previous</Button>
        <Button disabled={!nextCursor} onClick={() => loadInventory(nextCursor)}>Next</Button>
      </div>

      {/* CREATE MODAL */}
      <Modal
        title="Add Inventory Product"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="sku" label="SKU / Unique Identifier" rules={[{ required: true, message: 'Please enter SKU' }]}>
            <Input placeholder="e.g. LAP-MAC-001" />
          </Form.Item>
          <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Please enter name' }]}>
            <Input placeholder="e.g. MacBook Pro 16" />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please enter category' }]}>
            <Input placeholder="e.g. Electronics" />
          </Form.Item>
          <Form.Item name="sellingPrice" label="Unit Selling Price (₹)" rules={[{ required: true, message: 'Please enter selling price in ₹' }]}>
            <InputNumber min={0.01} style={{ width: '100%' }} prefix="₹" placeholder="e.g. 199999" />
          </Form.Item>
          <Form.Item name="unitCost" label="Unit Cost Price (₹)" rules={[{ required: true, message: 'Please enter cost price in ₹' }]}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="₹" placeholder="e.g. 150000" />
          </Form.Item>
          <Form.Item name="quantity" label="Initial Stock Quantity" rules={[{ required: true, message: 'Please enter quantity' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 25" />
          </Form.Item>
          <Form.Item name="reorderPoint" label="Low-Stock Alert Reorder Point" rules={[{ required: true, message: 'Please enter threshold' }]} initialValue={10}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
          </Form.Item>
          <Form.Item name="supplier" label="Supplier / Vendor (Optional)">
            <Input placeholder="e.g. Apple Authorized Distributor" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" style={{ background: 'var(--accent-glow)' }}>
            Add Product to Ledger
          </Button>
        </Form>
      </Modal>

      {/* STOCK ADJUSTMENT DRAWER */}
      <Drawer
        title={`Adjust Stock: ${selectedItem?.name}`}
        placement="right"
        onClose={() => setIsAdjustOpen(false)}
        open={isAdjustOpen}
        destroyOnClose
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjustStock} initialValues={{ type: 'INCOMING' }}>
          <Form.Item name="type" label="Adjustment Operation">
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="INCOMING">Restock (Add)</Radio.Button>
              <Radio.Button value="OUTGOING">Deduct (Ship)</Radio.Button>
              <Radio.Button value="ADJUSTMENT">Write-Off (Audit)</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="quantity" label="Count Offset" rules={[{ required: true, message: 'Please enter amount' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" style={{ background: 'var(--accent-glow)' }}>
            Record Adjustment
          </Button>
        </Form>
      </Drawer>
    </Card>
  );
};
export default Inventory;
