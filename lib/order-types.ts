export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered';

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
  items: DbOrderItem[];
};
