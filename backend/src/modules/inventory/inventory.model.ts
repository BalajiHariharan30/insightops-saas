import { Schema, model, Document, Types } from 'mongoose';

export interface IInventoryItem extends Document {
  organizationId: Types.ObjectId;
  sku: string;
  name: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryTransaction extends Document {
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  quantity: number;
  type: 'INCOMING' | 'OUTGOING' | 'ADJUSTMENT';
  actorUserId: Types.ObjectId;
  createdAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
      default: 'IN_STOCK',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// SKU must be unique within an organization
inventoryItemSchema.index({ organizationId: 1, sku: 1 }, { unique: true });

// Pre-save hook to compute status based on quantity and reorderPoint
inventoryItemSchema.pre('save', function (next) {
  if (this.quantity === 0) {
    this.status = 'OUT_OF_STOCK';
  } else if (this.quantity <= this.reorderPoint) {
    this.status = 'LOW_STOCK';
  } else {
    this.status = 'IN_STOCK';
  }
  next();
});

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['INCOMING', 'OUTGOING', 'ADJUSTMENT'],
      required: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

inventoryTransactionSchema.index({ organizationId: 1, itemId: 1 });

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);
export const InventoryTransaction = model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema);
