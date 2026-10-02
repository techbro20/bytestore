/**
 * pending   — awaiting payment (e.g. Paystack link opened but not completed)
 * review    — payment submitted / verified, waiting for admin approval
 * delivered — admin approved and sent the product
 * rejected  — admin rejected the order (see adminNote)
 * paid / processing — legacy values, treated like `review`
 */
export type OrderStatus =
  | 'pending'
  | 'review'
  | 'paid'
  | 'processing'
  | 'delivered'
  | 'rejected';

export const REVIEW_STATUSES: OrderStatus[] = ['review', 'paid', 'processing'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Awaiting payment',
  review: 'Awaiting review',
  paid: 'Awaiting review',
  processing: 'Awaiting review',
  delivered: 'Delivered',
  rejected: 'Rejected',
};

export type DbOrderItem = {
  productId: string;
  title: string;
  quantity: number;
  price: number;
};

export type DbOrder = {
  id: string;
  email: string;
  createdAt: string;
  total: number;
  method: string;
  status: OrderStatus;
  reference?: string | null;
  txHash?: string | null;
  cryptoAsset?: string | null;
  /** Shown to the customer only when the order is rejected. */
  adminNote?: string | null;
  deliveredAt?: string | null;
  items: DbOrderItem[];
};

/** Admin-only view: includes delivery details and Telegram chat for notifications. */
export type AdminOrder = DbOrder & {
  deliveryDetails?: string | null;
  telegramChatId?: number | null;
  reviewedAt?: string | null;
};
