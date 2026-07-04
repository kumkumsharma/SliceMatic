export interface MenuItem {
  id: number;
  category: 'base' | 'pizza' | 'topping';
  name: string;
  price: number;
  is_active: boolean;
  created_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id?: string;
  base_name: string;
  pizza_name: string;
  topping_name: string;
  quantity: number;
  base_price: number;
  pizza_price: number;
  topping_price: number;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  subtotal: number;
  discount: number;
  gst: number;
  final_total: number;
  payment_mode: 'Cash' | 'UPI' | 'Card';
  created_at: string;
  order_items?: OrderItem[];
}
