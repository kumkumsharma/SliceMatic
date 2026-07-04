import { createClient } from '@supabase/supabase-js';
import { MenuItem, Order, OrderItem } from '../src/types';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    'WARNING: Supabase variables (VITE_SUPABASE_URL/SUPABASE_URL) are missing in process.env.'
  );
} else {
  console.log('Supabase client successfully initialized with URL:', supabaseUrl.substring(0, 25) + '...');
}

export const db = {
  getMenu: async (): Promise<MenuItem[]> => {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment/secrets.');
    }

    console.log('Querying menu table from Supabase...');
    const { data, error } = await supabase
      .from('menu')
      .select('*');

    if (error) {
      console.error('Supabase query error on menu:', error);
      throw new Error(`Failed to load menu from Supabase: ${error.message} (Code: ${error.code})`);
    }

    console.log(`Supabase query successful. Raw count: ${data ? data.length : 0} items returned.`);
    if (!data || data.length === 0) {
      console.warn('WARNING: Supabase returned 0 items from the menu table. This is almost always because Row-Level Security (RLS) is enabled but no SELECT policy is defined, or the table is not seeded.');
    }

    const filtered = (data || []).filter((item: any) => item.is_active);

    return filtered.map((item: any) => ({
      id: Number(item.id),
      category: item.category,
      name: item.name,
      price: Number(item.price),
      is_active: !!item.is_active,
      created_at: item.created_at
    }));
  },

  getOrders: async (): Promise<Order[]> => {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    // Query orders and join order_items
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load orders from Supabase: ${error.message}`);
    }

    return (data || []).map((order: any) => ({
      id: order.id,
      customer_name: order.customer_name,
      phone: order.phone,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      gst: Number(order.gst),
      final_total: Number(order.final_total),
      payment_mode: order.payment_mode,
      created_at: order.created_at,
      order_items: (order.order_items || []).map((item: any) => ({
        id: Number(item.id),
        order_id: item.order_id,
        base_name: item.base_name,
        pizza_name: item.pizza_name,
        topping_name: item.topping_name,
        quantity: Number(item.quantity),
        base_price: Number(item.base_price),
        pizza_price: Number(item.pizza_price),
        topping_price: Number(item.topping_price)
      }))
    }));
  },

  addOrder: async (
    orderData: Omit<Order, 'id' | 'created_at'>,
    items: OrderItem[]
  ): Promise<Order> => {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    // 1. Prepare and log orders payload
    const orderToInsert = {
      customer_name: orderData.customer_name,
      phone: orderData.phone,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      gst: orderData.gst,
      final_total: orderData.final_total,
      payment_mode: orderData.payment_mode
    };

    console.log('[SUPABASE INSERT PRE-FLIGHT] Sending to "orders" table:', JSON.stringify(orderToInsert, null, 2));

    // Insert order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select()
      .single();

    console.log('[SUPABASE INSERT POST-FLIGHT] "orders" response:', {
      success: !orderError,
      data: order,
      error: orderError ? {
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint,
        code: orderError.code
      } : null
    });

    if (orderError || !order) {
      const errMsg = orderError 
        ? `Supabase orders insert failed: ${orderError.message} (Code: ${orderError.code}, Details: ${orderError.details || 'none'})`
        : 'Database error: No order data was returned from insert.';
      throw new Error(errMsg);
    }

    // 2. Prepare and log order_items payload
    const itemsToInsert = items.map(item => ({
      order_id: order.id,
      base_name: item.base_name,
      pizza_name: item.pizza_name,
      topping_name: item.topping_name,
      quantity: item.quantity,
      base_price: item.base_price,
      pizza_price: item.pizza_price,
      topping_price: item.topping_price
    }));

    console.log('[SUPABASE INSERT PRE-FLIGHT] Sending to "order_items" table:', JSON.stringify(itemsToInsert, null, 2));

    const { data: itemsResult, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    console.log('[SUPABASE INSERT POST-FLIGHT] "order_items" response:', {
      success: !itemsError,
      data: itemsResult,
      error: itemsError ? {
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        code: itemsError.code
      } : null
    });

    if (itemsError) {
      console.log('[ROLLBACK] Deleting parent order record due to order_items failure, Order ID:', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      
      const errMsg = `Supabase order_items insert failed: ${itemsError.message} (Code: ${itemsError.code}, Details: ${itemsError.details || 'none'})`;
      throw new Error(errMsg);
    }

    return {
      id: order.id,
      customer_name: order.customer_name,
      phone: order.phone,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      gst: Number(order.gst),
      final_total: Number(order.final_total),
      payment_mode: order.payment_mode,
      created_at: order.created_at,
      order_items: items
    };
  },

  seedDemoDataIfEmpty: async () => {
    // Silent check: if connected to Supabase and orders are empty, we could populate demo orders,
    // but we will keep this silent to avoid interfering with user's clean tables unless empty.
    try {
      if (!supabase) return;
      
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (!error && count === 0) {
        console.log('Supabase orders table is empty. Waiting for live customer checkouts!');
      }
    } catch (err) {
      console.warn('Could not run demo check:', err);
    }
  }
};
