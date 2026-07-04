import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { Search, Calendar, Landmark, ReceiptText, Percent, ShoppingBag, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    o.phone.includes(search)
  );

  // Business calculations for stats cards
  const totalRevenue = orders.reduce((sum, o) => sum + o.final_total, 0);
  const totalDiscounts = orders.reduce((sum, o) => sum + o.discount, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Dashboard section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans flex items-center gap-2">
              SliceMatic Dashboard
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Live Connection
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Real-time order logging, POS operations monitoring, and live audit trailing.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 border border-slate-200 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Refresh Feed
            </button>
            <a
              href="/ai-insights"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-orange-500/15 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" /> AI Insights Report
            </a>
          </div>
        </div>

        {/* Analytical Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          {/* Card 1: Total Revenue */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-orange-50 text-orange-500 rounded-xl">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Sales</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> Incl. Taxes
              </span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-blue-50 text-blue-50 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Volume</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{totalOrders}</span>
              <span className="text-xs text-slate-500 font-medium block mt-0.5">Placed in Sandbox</span>
            </div>
          </div>

          {/* Card 3: Average Order Value */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-500 rounded-xl">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Average Ticket</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">₹{averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className="text-xs text-indigo-600 font-semibold block mt-0.5">Revenue / Count</span>
            </div>
          </div>

          {/* Card 4: Total Discounts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-xl">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Promo Given</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">₹{totalDiscounts.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className="text-xs text-emerald-600 font-semibold block mt-0.5">Bulk 10% Discounts</span>
            </div>
          </div>

        </div>

        {/* Search Bar */}
        <div className="mb-6 relative rounded-2xl shadow-sm max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-slate-900 font-medium rounded-2xl placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all text-sm"
            placeholder="Search customer names or phone numbers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Orders Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base">Historical Order Log Table</h3>
            <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full font-mono">
              Count: {filteredOrders.length} of {orders.length}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-500 font-medium text-sm">Loading database entries...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">🍕</div>
              <h4 className="font-bold text-slate-700 text-base">No Orders Logged Yet</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                Place test tickets from the order page to populate the local or cloud database!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Customer Profile</th>
                    <th className="py-3.5 px-6">Gourmet Combination / Recipe Details</th>
                    <th className="py-3.5 px-6 text-right">Subtotal</th>
                    <th className="py-3.5 px-6 text-right">Discount</th>
                    <th className="py-3.5 px-6 text-right">GST (18%)</th>
                    <th className="py-3.5 px-6 text-right">Total Price</th>
                    <th className="py-3.5 px-6 text-center">Mode</th>
                    <th className="py-3.5 px-6 text-right">Log Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-all">
                      
                      {/* Customer Profile */}
                      <td className="py-4 px-6">
                        <div className="text-slate-900 font-bold">{order.customer_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{order.phone}</div>
                      </td>

                      {/* Recipe details */}
                      <td className="py-4 px-6 max-w-xs">
                        {order.order_items && order.order_items.length > 0 ? (
                          order.order_items.map((item, idx) => (
                            <div key={idx} className="text-xs leading-relaxed text-slate-600">
                              <span className="font-semibold text-slate-800">{item.pizza_name}</span> 
                              <span className="text-slate-400"> on </span>
                              <span className="font-semibold text-slate-800">{item.base_name}</span>
                              {item.topping_name && (
                                <>
                                  <span className="text-slate-400"> + </span>
                                  <span className="text-orange-600 font-semibold">{item.topping_name}</span>
                                </>
                              )}
                              <span className="bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded ml-2 font-mono">
                                x{item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No recipe item recorded</span>
                        )}
                      </td>

                      {/* Prices */}
                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        ₹{parseFloat(order.subtotal.toString()).toFixed(2)}
                      </td>
                      
                      <td className="py-4 px-6 text-right font-mono text-emerald-600 font-semibold">
                        {parseFloat(order.discount.toString()) > 0 ? `-₹${parseFloat(order.discount.toString()).toFixed(2)}` : '₹0.00'}
                      </td>

                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        ₹{parseFloat(order.gst.toString()).toFixed(2)}
                      </td>

                      <td className="py-4 px-6 text-right font-mono text-orange-600 font-bold">
                        ₹{parseFloat(order.final_total.toString()).toFixed(2)}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                          order.payment_mode === 'UPI' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : order.payment_mode === 'Card'
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {order.payment_mode}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-6 text-right text-xs text-slate-400">
                        <div className="flex items-center justify-end gap-1 font-mono">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
