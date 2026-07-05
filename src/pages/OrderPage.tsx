import React, { useState, useEffect } from 'react';
import { calculateBill } from '../utils/calculations';
import { validateOrder } from '../utils/validation';
import { MenuItem } from '../types';
import { Pizza, CheckCircle, Flame, Plus, Minus, CreditCard, Sparkles, Database, RefreshCw, AlertTriangle, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

export default function OrderPage() {
  const [menu, setMenu] = useState<{ bases: MenuItem[]; pizzas: MenuItem[]; toppings: MenuItem[] }>({
    bases: [],
    pizzas: [],
    toppings: []
  });

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    baseId: '',
    pizzaId: '',
    toppingId: '',
    quantity: 1,
    paymentMode: 'UPI'
  });

  const [bill, setBill] = useState({ subtotal: '0.00', discount: '0.00', gst: '0.00', finalTotal: '0.00' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Live database connection states
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [dbVerified, setDbVerified] = useState<boolean | null>(null);
  const [dbDetails, setDbDetails] = useState<string>('');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setMenuLoading(true);
    setMenuError(null);
    setDbVerified(null);
    try {
      console.log('[CLIENT] Loading menu directly from Supabase...');
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const { data: supaData, error: supaErr } = await supabase
        .from('menu')
        .select('*');

      if (supaErr) {
        throw new Error(`Direct Supabase Query Failed: ${supaErr.message}`);
      }

      if (!supaData || supaData.length === 0) {
        throw new Error('Direct Supabase Query returned 0 menu items. Make sure your menu table is seeded.');
      }

      const data: MenuItem[] = supaData.map((item: any) => ({
        id: Number(item.id),
        category: item.category,
        name: item.name,
        price: Number(item.price),
        is_active: !!item.is_active,
        created_at: item.created_at
      }));

      setMenu({
        bases: data.filter(i => i.category === 'base' && i.is_active),
        pizzas: data.filter(i => i.category === 'pizza' && i.is_active),
        toppings: data.filter(i => i.category === 'topping' && i.is_active)
      });
      setDbVerified(true);
      setDbDetails(`Successfully fetched ${data.length} active menu items dynamically from Supabase.`);
    } catch (err: any) {
      console.error('[CLIENT] Failed to load menu:', err);
      setMenuError(err.message || 'An unexpected database error occurred');
      setDbVerified(false);
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    const base = menu.bases.find(b => b.id.toString() === formData.baseId)?.price || 0;
    const pizza = menu.pizzas.find(p => p.id.toString() === formData.pizzaId)?.price || 0;
    const topping = menu.toppings.find(t => t.id.toString() === formData.toppingId)?.price || 0;
    
    const computed = calculateBill(base, pizza, topping, formData.quantity);
    setBill(computed);
  }, [formData, menu]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valErrors = validateOrder(formData);
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    try {
      const baseItem = menu.bases.find(b => b.id.toString() === formData.baseId)!;
      const pizzaItem = menu.pizzas.find(p => p.id.toString() === formData.pizzaId)!;
      const toppingItem = menu.toppings.find(t => t.id.toString() === formData.toppingId)!;

      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      // Direct Supabase insert: 
      // 1. Insert into orders
      const ordersInsertPayload = {
        customer_name: formData.customerName,
        phone: formData.phone,
        subtotal: parseFloat(bill.subtotal),
        discount: parseFloat(bill.discount),
        gst: parseFloat(bill.gst),
        final_total: parseFloat(bill.finalTotal),
        payment_mode: formData.paymentMode
      };

      console.log('[CLIENT DIRECT SUPABASE] Inserting into orders table:', ordersInsertPayload);
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([ordersInsertPayload])
        .select()
        .single();

      if (orderError || !orderData) {
        throw new Error(`Direct orders insert failed: ${orderError?.message || 'No data returned'} (Code: ${orderError?.code})`);
      }

      console.log('[CLIENT DIRECT SUPABASE] Successfully inserted order. Inserting items...', orderData);

      // 2. Insert into order_items
      const itemsInsertPayload = [
        {
          order_id: orderData.id,
          base_name: baseItem.name,
          pizza_name: pizzaItem.name,
          topping_name: toppingItem.name,
          quantity: formData.quantity,
          base_price: baseItem.price,
          pizza_price: pizzaItem.price,
          topping_price: toppingItem.price
        }
      ];

      console.log('[CLIENT DIRECT SUPABASE] Inserting into order_items table:', itemsInsertPayload);
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsInsertPayload);

      if (itemsError) {
        console.error('[CLIENT DIRECT SUPABASE] order_items failed. Rolling back order:', orderData.id);
        await supabase.from('orders').delete().eq('id', orderData.id);
        throw new Error(`Direct order_items insert failed: ${itemsError.message} (Code: ${itemsError.code})`);
      }

      console.log('[CLIENT] Order successfully placed directly via Supabase. Response:', orderData);

      setSuccessMsg(`Order placed successfully! Order total is ₹${bill.finalTotal}.`);
      // Reset form
      setFormData({
        customerName: '',
        phone: '',
        baseId: '',
        pizzaId: '',
        toppingId: '',
        quantity: 1,
        paymentMode: 'UPI'
      });
      setErrors({});
    } catch (err: any) {
      console.error('[CLIENT] Caught order placement exception:', err);
      alert('Error placing order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedBase = menu.bases.find(b => b.id.toString() === formData.baseId);
  const selectedPizza = menu.pizzas.find(p => p.id.toString() === formData.pizzaId);
  const selectedTopping = menu.toppings.find(t => t.id.toString() === formData.toppingId);

  return (
    <div className="min-h-screen bg-amber-50/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header section */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center space-x-2 bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 shadow-sm"
          >
            <Flame className="h-4 w-4 animate-bounce" />
            <span>SliceMatic POS System</span>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-sans">
            Craft Your Perfect Pizza
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            Experience premium hand-stretched crusts, slow-cooked visual sauces, and fresh gourmet toppings loaded with taste.
          </p>
        </div>

        {/* Connection Diagnostics Card */}
        <div className="bg-white rounded-2xl p-5 mb-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3.5 rounded-xl flex-shrink-0 ${
              menuLoading 
                ? 'bg-amber-50 text-amber-500 animate-pulse' 
                : dbVerified 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-red-50 text-red-500'
            }`}>
              {menuLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : dbVerified ? (
                <Database className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">Supabase Live Connection Diagnostic</h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  dbVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {dbVerified ? 'Connected' : 'Offline / Error'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                {menuLoading ? (
                  <span>Checking database credentials and fetching active recipes...</span>
                ) : dbVerified ? (
                  <span>
                    Verified! Loaded dynamically from the <code className="font-mono bg-slate-100 text-orange-600 px-1 py-0.5 rounded text-[11px]">menu</code> table in Supabase. Absolutely zero mock fallbacks.
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold">
                    Error loading database: {menuError || 'Connection failed.'} Make sure your Supabase keys are configured in secrets or your .env file.
                  </span>
                )}
              </p>
              {dbDetails && dbVerified && (
                <div className="mt-2 text-[11px] font-mono bg-emerald-50/50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100/50 flex items-center gap-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {dbDetails}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              onClick={fetchMenu}
              disabled={menuLoading}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-95 disabled:opacity-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${menuLoading ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
            {dbVerified && (
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide flex items-center gap-1">
                <Wifi className="h-3.5 w-3.5" />
                Live Sync
              </span>
            )}
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main order form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-xl shadow-orange-100/50 p-6 sm:p-8 border border-orange-50/60">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
                <Pizza className="text-orange-500 h-5 w-5" />
                Customer & Recipe Selection
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Personal Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Customer Name</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        errors.customerName ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-orange-100 focus:border-orange-500'
                      } text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                      placeholder="e.g. Rajan Sharma"
                      value={formData.customerName}
                      onChange={e => handleFieldChange('customerName', e.target.value)}
                    />
                    {errors.customerName && <p className="text-xs text-red-500 font-medium mt-1">{errors.customerName}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Phone Number (Indian)</label>
                    <input
                      type="tel"
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        errors.phone ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-orange-100 focus:border-orange-500'
                      } text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                      placeholder="10 digit number"
                      value={formData.phone}
                      onChange={e => handleFieldChange('phone', e.target.value)}
                    />
                    {errors.phone && <p className="text-xs text-red-500 font-medium mt-1">{errors.phone}</p>}
                  </div>
                </div>

                {/* Crust / Base Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                    <span>1. Select Crust Base</span>
                    {selectedBase && <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded">₹{selectedBase.price}</span>}
                  </label>
                  <select
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.baseId ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-orange-100 focus:border-orange-500'
                    } text-slate-900 font-medium bg-slate-50 focus:outline-none focus:ring-4 transition-all`}
                    value={formData.baseId}
                    onChange={e => handleFieldChange('baseId', e.target.value)}
                  >
                    <option value="">-- Choose Crust Base --</option>
                    {menu.bases.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} (+₹{b.price})
                      </option>
                    ))}
                  </select>
                  {errors.baseId && <p className="text-xs text-red-500 font-medium mt-1">{errors.baseId}</p>}
                </div>

                {/* Pizza Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                    <span>2. Choose Specialty Pizza Sauce & Style</span>
                    {selectedPizza && <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded">₹{selectedPizza.price}</span>}
                  </label>
                  <select
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.pizzaId ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-orange-100 focus:border-orange-500'
                    } text-slate-900 font-medium bg-slate-50 focus:outline-none focus:ring-4 transition-all`}
                    value={formData.pizzaId}
                    onChange={e => handleFieldChange('pizzaId', e.target.value)}
                  >
                    <option value="">-- Choose Pizza Recipe --</option>
                    {menu.pizzas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                  {errors.pizzaId && <p className="text-xs text-red-500 font-medium mt-1">{errors.pizzaId}</p>}
                </div>

                {/* Toppings Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                    <span>3. Choose Premium Topping</span>
                    {selectedTopping && <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded">₹{selectedTopping.price}</span>}
                  </label>
                  <select
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.toppingId ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-orange-100 focus:border-orange-500'
                    } text-slate-900 font-medium bg-slate-50 focus:outline-none focus:ring-4 transition-all`}
                    value={formData.toppingId}
                    onChange={e => handleFieldChange('toppingId', e.target.value)}
                  >
                    <option value="">-- Choose Gourmet Topping --</option>
                    {menu.toppings.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (+₹{t.price})
                      </option>
                    ))}
                  </select>
                  {errors.toppingId && <p className="text-xs text-red-500 font-medium mt-1">{errors.toppingId}</p>}
                </div>

                {/* Quantity and Payment Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  
                  {/* Quantity controls */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Quantity</label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleFieldChange('quantity', Math.max(1, formData.quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-xl font-bold font-mono text-slate-800 w-12 text-center bg-slate-50 py-1.5 rounded-xl border border-slate-200">
                        {formData.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFieldChange('quantity', Math.min(10, formData.quantity + 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {formData.quantity >= 5 && (
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        Bulk 10% auto-discount applied!
                      </p>
                    )}
                  </div>

                  {/* Payment option */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Payment Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'UPI', 'Card'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleFieldChange('paymentMode', mode)}
                          className={`py-2 px-3 rounded-xl border font-semibold text-sm transition-all cursor-pointer ${
                            formData.paymentMode === mode
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Trigger placement button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2 disabled:bg-slate-400 disabled:shadow-none cursor-pointer mt-4"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <span>Place Order (₹{bill.finalTotal})</span>
                  )}
                </button>

              </form>
            </div>
          </div>

          {/* Right Sidebar: Receipt Overlay & Interactive Builder */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Visual Assembly Canvas */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-3 text-slate-700 pointer-events-none">
                <Pizza className="h-32 w-32 rotate-12 opacity-5" />
              </div>

              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></div>
                Visual Recipe Assembly
              </h3>

              <div className="flex flex-col items-center py-6 justify-center space-y-4">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  
                  {/* Overlay Layers */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-4 border-dashed border-orange-900/60 flex items-center justify-center bg-orange-950/20 shadow-inner"
                  />

                  {/* 1. Crust Layer */}
                  {formData.baseId ? (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute w-36 h-36 rounded-full bg-amber-800/85 border-4 border-amber-900 flex items-center justify-center shadow-lg"
                    >
                      {/* Crust texture */}
                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-amber-950/40 opacity-30"></div>
                    </motion.div>
                  ) : (
                    <p className="text-slate-500 text-xs text-center z-10 px-4">Choose a crust base to begin assembling...</p>
                  )}

                  {/* 2. Pizza Base/Sauce Layer */}
                  {formData.pizzaId && (
                    <motion.div 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute w-32 h-32 rounded-full bg-red-600/90 border-2 border-amber-950 flex items-center justify-center z-10 shadow-md"
                    >
                      {/* Sauce highlights */}
                      <div className="absolute inset-2 rounded-full border border-orange-400/40 opacity-40"></div>
                    </motion.div>
                  )}

                  {/* 3. Topping Layer */}
                  {formData.toppingId && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute w-28 h-28 flex flex-wrap justify-center items-center gap-2 z-20"
                    >
                      {/* Topping markers */}
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-600 shadow-sm flex items-center justify-center animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>
                          <span className="w-1.5 h-1.5 bg-yellow-800 rounded-full"></span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div className="text-center mt-3 space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Active Recipe Build</p>
                  <p className="text-sm font-bold text-slate-100">
                    {selectedPizza ? selectedPizza.name : 'Choose Sauce'} on {selectedBase ? selectedBase.name : 'Choose Crust'}
                  </p>
                  {selectedTopping && (
                    <p className="text-xs text-orange-400 font-semibold">
                      Loaded with {selectedTopping.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dash Border Bill Ticket */}
            <div className="bg-[#fffdf9] border-2 border-dashed border-orange-400 rounded-2xl p-6 shadow-lg text-slate-800 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 bg-orange-100 border border-orange-300 text-orange-800 font-mono text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                Live Receipt Check
              </div>

              <div className="border-b border-orange-100 pb-4 mb-4 mt-2">
                <div className="flex justify-between text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">
                  <span>SliceMatic POS</span>
                  <span>Invoice Preview</span>
                </div>
                <div className="flex justify-between items-center text-slate-900">
                  <span className="font-extrabold text-lg text-orange-600">SliceMatic Ticket</span>
                  <span className="text-xs font-semibold font-mono text-slate-500">QTY: {formData.quantity}</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-3 text-sm border-b border-orange-100 pb-4 mb-4">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Pizza Crust ({selectedBase?.name || 'Pending'}):</span>
                  <span className="text-slate-900 font-semibold font-mono">₹{selectedBase ? selectedBase.price : 0}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Sauce & Style ({selectedPizza?.name || 'Pending'}):</span>
                  <span className="text-slate-900 font-semibold font-mono font-mono">₹{selectedPizza ? selectedPizza.price : 0}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Premium Toppings ({selectedTopping?.name || 'Pending'}):</span>
                  <span className="text-slate-900 font-semibold font-mono font-mono">₹{selectedTopping ? selectedTopping.price : 0}</span>
                </div>
                
                <div className="flex justify-between font-semibold text-slate-900 border-t border-dashed border-orange-100 pt-3">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{bill.subtotal}</span>
                </div>

                {parseFloat(bill.discount) > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Discount (10% bulk):</span>
                    <span className="font-mono">-₹{bill.discount}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>GST (18% applied on taxable):</span>
                  <span className="text-slate-900 font-semibold font-mono">₹{bill.gst}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-bold block">Final Total</span>
                  <span className="text-2xl font-extrabold text-orange-600 tracking-tight font-mono">₹{bill.finalTotal}</span>
                </div>
                <div className="text-right bg-orange-50 border border-orange-100 rounded-xl px-3 py-1 text-xs text-orange-800 font-semibold flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Mode: {formData.paymentMode}</span>
                </div>
              </div>
            </div>

            {/* Success Animation Notification */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start space-x-3 shadow-md"
                >
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Order Logged!</h4>
                    <p className="text-xs font-medium text-emerald-700 mt-0.5">{successMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </div>
    </div>
  );
}
