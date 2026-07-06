import React, { useState } from 'react';
import { 
  Sparkles, 
  Brain, 
  RefreshCw, 
  BarChart2, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  DollarSign, 
  ShoppingBag, 
  Award, 
  Percent, 
  CreditCard,
  Target,
  TrendingUp as TrendIcon,
  HelpCircle,
  Users,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

async function callOpenRouter(systemPrompt: string, prompt: string): Promise<string> {
  const apiKey = (import.meta as any).env.VITE_OPENROUTER_API_KEY || 
                 (import.meta as any).env.OPENROUTER_API_KEY || 
                 (window as any).OPENROUTER_API_KEY || 
                 (window as any).VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured. Please define OPENROUTER_API_KEY in your secrets or environment.');
  }

  // Uses openai/gpt-4o-mini as standard GPT-4o mini on OpenRouter (satisfies openai/gpt-4.1-mini)
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai.studio/build',
      'X-Title': 'SliceMatic POS'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('Invalid response structure received from OpenRouter.');
  }

  return data.choices[0].message.content;
}

interface ReportData {
  healthScore: number;
  businessRating: string;
  scoreExplanation: string[];
  executiveSummary: string;
  strengths: { title: string; description: string }[];
  weaknesses: { title: string; description: string }[];
  recommendations: { title: string; description: string }[];
}

interface CalculatedStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  mostPopularPizza: string;
  leastPopularPizza: string;
  toppingAttachmentRate: number;
  toppingOrderRate: number;
  revenueConcentration: number;
  paymentModeDistribution: Record<string, number>;
}

interface WhatIfReport {
  businessImpact: string;
  customerImpact: string;
  risks: string[];
  benefits: string[];
  recommendation: string;
  confidenceLevel: string;
}

export default function AIInsights() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [stats, setStats] = useState<CalculatedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // What-if Simulator States
  const [whatIfQuery, setWhatIfQuery] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState('');
  const [whatIfReport, setWhatIfReport] = useState<WhatIfReport | null>(null);

  const handleWhatIfSubmit = async (customQuery?: string) => {
    const queryToUse = customQuery || whatIfQuery;
    if (!queryToUse.trim()) return;

    setWhatIfLoading(true);
    setWhatIfError('');
    setWhatIfReport(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured.');
      }

      // Fetch live data context from Supabase
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*, order_items(*)');

      if (ordersErr) {
        throw new Error(`Failed to fetch orders: ${ordersErr.message}`);
      }

      const { data: menuData, error: menuErr } = await supabase
        .from('menu')
        .select('*');

      if (menuErr) {
        throw new Error(`Failed to fetch menu items: ${menuErr.message}`);
      }

      const orders = ordersData || [];
      const menu = menuData || [];

      // Calculate context statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.final_total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

      const pizzaCounts: Record<string, number> = {};
      const pizzaRevenues: Record<string, number> = {};
      let totalPizzasQty = 0;
      let totalToppingsQty = 0;
      let ordersWithToppings = 0;
      const paymentCounts: Record<string, number> = {};

      orders.forEach((order: any) => {
        if (order.payment_mode) {
          paymentCounts[order.payment_mode] = (paymentCounts[order.payment_mode] || 0) + 1;
        }
        let orderHasTopping = false;
        order.order_items?.forEach((item: any) => {
          if (item.pizza_name) {
            pizzaCounts[item.pizza_name] = (pizzaCounts[item.pizza_name] || 0) + (item.quantity || 1);
            pizzaRevenues[item.pizza_name] = (pizzaRevenues[item.pizza_name] || 0) + (Number(item.price || 0) * (item.quantity || 1));
            totalPizzasQty += (item.quantity || 1);
          }
          if (item.topping_name) {
            totalToppingsQty += (item.quantity || 1);
            orderHasTopping = true;
          }
        });
        if (orderHasTopping) {
          ordersWithToppings++;
        }
      });

      let mostPopularPizza = 'N/A';
      let maxCount = -1;
      Object.entries(pizzaCounts).forEach(([name, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostPopularPizza = name;
        }
      });

      const activePizzas = menu.filter((item: any) => item.category === 'pizza' && item.is_active);
      let leastPopularPizza = 'N/A';
      let minCount = Infinity;
      if (activePizzas.length > 0) {
        activePizzas.forEach((p: any) => {
          const count = pizzaCounts[p.name] || 0;
          if (count < minCount) {
            minCount = count;
            leastPopularPizza = p.name;
          }
        });
      }

      const toppingAttachmentRate = totalPizzasQty > 0 ? (totalToppingsQty / totalPizzasQty) * 100 : 0;
      const toppingOrderRate = totalOrders > 0 ? (ordersWithToppings / totalOrders) * 100 : 0;

      const topPizzaRevenue = pizzaRevenues[mostPopularPizza] || 0;
      const totalPizzaRevenue = Object.values(pizzaRevenues).reduce((sum, val) => sum + val, 0);
      const revenueConcentration = totalPizzaRevenue > 0 ? (topPizzaRevenue / totalPizzaRevenue) * 100 : 0;

      const paymentModeDistribution: Record<string, number> = {};
      if (totalOrders > 0) {
        Object.entries(paymentCounts).forEach(([mode, count]) => {
          paymentModeDistribution[mode] = (count / totalOrders) * 100;
        });
      }

      // Collect menu summaries
      const menuSummary = menu.map((m: any) => ({
        name: m.name,
        category: m.category,
        price: m.price,
        is_active: m.is_active
      }));

      // Connect with OpenRouter LLM
      const systemPrompt = `You are an expert restaurant business growth consultant. 
Your job is to analyze 'what-if' tactical and strategic proposal questions from Rajan, the restaurant owner.
Do NOT give generic business advice. You MUST heavily customize and ground your predictions in the provided active menu items, pricing structure, total revenue, average order value, popular pizzas, and payment methods. Provide precise projections where possible.`;

      const statsContext = {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        mostPopularPizza,
        leastPopularPizza,
        toppingAttachmentRate,
        toppingOrderRate,
        revenueConcentration,
        paymentModeDistribution,
        menuItems: menuSummary
      };

      const prompt = `
Rajan's proposed tactical change: "${queryToUse}"

Here are the real-time restaurant statistics and configurations for context:
${JSON.stringify(statsContext)}

Analyze this proposed change. Give a structured JSON response adhering strictly to the schema requested.

Your JSON response must follow this schema exactly:
{
  "businessImpact": "Detailed evaluation of how this specific simulation affects pricing structures, order volumes, and financial performance.",
  "customerImpact": "Analysis of consumer behavior change, demand friction, and transaction rate shifts.",
  "risks": ["Exactly 3 clear business or operational risks of this change as strings"],
  "benefits": ["Exactly 3 clear business or operational advantages of this change as strings"],
  "recommendation": "Direct, professional consultant advice on how and whether Rajan should execute this proposal.",
  "confidenceLevel": "One of: 'High', 'Medium', 'Low'."
}
`;

      const rawResponseText = await callOpenRouter(systemPrompt, prompt);

      if (!rawResponseText) {
        throw new Error('Empty response from AI simulator.');
      }

      const parsed = JSON.parse(rawResponseText.trim()) as WhatIfReport;
      setWhatIfReport(parsed);

    } catch (err: any) {
      setWhatIfError(err.message || 'An error occurred during scenario simulation.');
    } finally {
      setWhatIfLoading(false);
    }
  };

  const steps = [
    'Aggregating live transactions & recipe histories...',
    'Computing topping attachment & revenue concentration...',
    'Evaluating payment distribution metrics...',
    'Consulting AI Business Coach models...'
  ];

  const generateCoachInsights = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setStats(null);
    setCurrentStep(0);

    // Progressive loading simulation
    const stepIntervals = [
      setTimeout(() => setCurrentStep(1), 1000),
      setTimeout(() => setCurrentStep(2), 2200),
      setTimeout(() => setCurrentStep(3), 3500)
    ];

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured.');
      }

      // 1. Fetch live transactions & menu items
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*, order_items(*)');

      if (ordersErr) {
        throw new Error(`Failed to fetch orders: ${ordersErr.message}`);
      }

      const { data: menuData, error: menuErr } = await supabase
        .from('menu')
        .select('*');

      if (menuErr) {
        throw new Error(`Failed to fetch menu items: ${menuErr.message}`);
      }

      const orders = ordersData || [];
      const menu = menuData || [];

      // 2. Perform rigorous statistical calculations
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.final_total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

      // Classify menu items
      const activePizzas = menu.filter((item: any) => item.category === 'pizza' && item.is_active);
      
      const pizzaCounts: Record<string, number> = {};
      const pizzaRevenues: Record<string, number> = {};
      let totalPizzasQty = 0;
      let totalToppingsQty = 0;
      let ordersWithToppings = 0;
      const paymentCounts: Record<string, number> = {};

      orders.forEach((order: any) => {
        // Track payment modes
        if (order.payment_mode) {
          paymentCounts[order.payment_mode] = (paymentCounts[order.payment_mode] || 0) + 1;
        }

        let orderHasTopping = false;

        order.order_items?.forEach((item: any) => {
          if (item.pizza_name) {
            pizzaCounts[item.pizza_name] = (pizzaCounts[item.pizza_name] || 0) + (item.quantity || 1);
            pizzaRevenues[item.pizza_name] = (pizzaRevenues[item.pizza_name] || 0) + (Number(item.price || 0) * (item.quantity || 1));
            totalPizzasQty += (item.quantity || 1);
          }
          if (item.topping_name) {
            totalToppingsQty += (item.quantity || 1);
            orderHasTopping = true;
          }
        });

        if (orderHasTopping) {
          ordersWithToppings++;
        }
      });

      // Find Most Popular Pizza
      let mostPopularPizza = 'N/A';
      let maxCount = -1;
      Object.entries(pizzaCounts).forEach(([name, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostPopularPizza = name;
        }
      });

      // Find Least Popular Pizza (of active ones)
      let leastPopularPizza = 'N/A';
      let minCount = Infinity;
      if (activePizzas.length > 0) {
        activePizzas.forEach((p: any) => {
          const count = pizzaCounts[p.name] || 0;
          if (count < minCount) {
            minCount = count;
            leastPopularPizza = p.name;
          }
        });
      } else if (Object.keys(pizzaCounts).length > 0) {
        Object.entries(pizzaCounts).forEach(([name, count]) => {
          if (count < minCount) {
            minCount = count;
            leastPopularPizza = name;
          }
        });
      }

      // Calculate topping attachment metrics
      const toppingAttachmentRate = totalPizzasQty > 0 ? (totalToppingsQty / totalPizzasQty) * 100 : 0;
      const toppingOrderRate = totalOrders > 0 ? (ordersWithToppings / totalOrders) * 100 : 0;

      // Calculate revenue concentration
      const topPizzaRevenue = pizzaRevenues[mostPopularPizza] || 0;
      const totalPizzaRevenue = Object.values(pizzaRevenues).reduce((sum, val) => sum + val, 0);
      const revenueConcentration = totalPizzaRevenue > 0 ? (topPizzaRevenue / totalPizzaRevenue) * 100 : 0;

      // Calculate payment mode distribution percentages
      const paymentModeDistribution: Record<string, number> = {};
      if (totalOrders > 0) {
        Object.entries(paymentCounts).forEach(([mode, count]) => {
          paymentModeDistribution[mode] = (count / totalOrders) * 100;
        });
      }

      const calculatedStats: CalculatedStats = {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        mostPopularPizza,
        leastPopularPizza,
        toppingAttachmentRate,
        toppingOrderRate,
        revenueConcentration,
        paymentModeDistribution
      };

      setStats(calculatedStats);

      // 3. Connect with OpenRouter LLM
      const systemPrompt = `You are an experienced restaurant business consultant.
Analyze the restaurant statistics.
Return:
1. Business Health Score (0-100)
2. Business Rating
3. Executive Summary
4. Top 3 Strengths
5. Top 3 Weaknesses
6. Three specific business recommendations for today.

Keep recommendations practical and data-driven. Do not hardcode any recommendation; customize it exactly based on the specific strengths and weaknesses discovered in these real statistics.`;

      const prompt = `
Please analyze the following restaurant metrics for SliceMatic Pizza:
- Total Sales Revenue: ₹${totalRevenue.toFixed(2)}
- Total Orders Placed: ${totalOrders}
- Average Order Value (AOV): ₹${averageOrderValue.toFixed(2)}
- Most Popular Recipe Product: "${mostPopularPizza}"
- Least Popular Recipe Product: "${leastPopularPizza}"
- Topping Attachment Rate: ${toppingAttachmentRate.toFixed(1)}% of all pizzas
- Toppings Order Rate: ${toppingOrderRate.toFixed(1)}% of total orders contain toppings
- Most Popular Product Revenue Concentration: ${revenueConcentration.toFixed(1)}% of overall pizza sales
- Operational Payment Modes: ${JSON.stringify(paymentModeDistribution)}

Return the analysis in JSON format adhering strictly to the response schema requested.

Your JSON response must follow this schema exactly:
{
  "healthScore": 85,
  "businessRating": "Good",
  "scoreExplanation": [
    "Exactly 4 high-impact bullet points explaining why the business got this score. Include data facts."
  ],
  "executiveSummary": "A concise 2-sentence executive summary of operational recommendations.",
  "strengths": [
    {
      "title": "Actionable name of strength 1",
      "description": "Detailed metric-backed reason."
    },
    {
      "title": "Actionable name of strength 2",
      "description": "Detailed metric-backed reason."
    },
    {
      "title": "Actionable name of strength 3",
      "description": "Detailed metric-backed reason."
    }
  ],
  "weaknesses": [
    {
      "title": "Actionable name of weakness 1",
      "description": "Detailed metric-backed reason."
    },
    {
      "title": "Actionable name of weakness 2",
      "description": "Detailed metric-backed reason."
    },
    {
      "title": "Actionable name of weakness 3",
      "description": "Detailed metric-backed reason."
    }
  ],
  "recommendations": [
    {
      "title": "Clear, practical action title 1",
      "description": "Direct implementation blueprint based on statistical numbers."
    },
    {
      "title": "Clear, practical action title 2",
      "description": "Direct implementation blueprint based on statistical numbers."
    },
    {
      "title": "Clear, practical action title 3",
      "description": "Direct implementation blueprint based on statistical numbers."
    }
  ]
}
`;

      const rawResponseText = await callOpenRouter(systemPrompt, prompt);

      stepIntervals.forEach(clearTimeout);

      if (!rawResponseText) {
        throw new Error('Empty response from AI engine.');
      }

      const parsedData = JSON.parse(rawResponseText.trim()) as ReportData;
      setReport(parsedData);

    } catch (err: any) {
      stepIntervals.forEach(clearTimeout);
      setError(err.message || 'An unexpected error occurred during coaching generation.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', circle: 'stroke-emerald-500', indicator: '🟢' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', circle: 'stroke-amber-500', indicator: '🟡' };
    return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', circle: 'stroke-red-500', indicator: '🔴' };
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Banner Header Card */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden mb-8 border border-orange-400">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-white pointer-events-none">
            <Brain className="h-56 w-56" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 animate-pulse text-yellow-300" />
              <span>Premium Business Intelligence Suite</span>
            </div>
            
            <h1 id="coach-title" className="text-3xl sm:text-5xl font-extrabold tracking-tight font-sans">
              AI Business Coach
            </h1>
            <p className="text-sm sm:text-lg text-orange-50 max-w-3xl font-medium leading-relaxed">
              Meet your expert virtual restaurant consultant. Powered by OpenRouter LLM, the AI Business Coach aggregates real-time transactional data, calculates diagnostic KPIs, and generates personalized, data-backed operational game plans.
            </p>

            <div className="pt-4">
              <button
                onClick={generateCoachInsights}
                disabled={loading}
                className="inline-flex items-center space-x-2.5 px-8 py-4 bg-white hover:bg-orange-50 text-orange-600 font-extrabold text-sm rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:bg-orange-100 disabled:text-orange-400 disabled:shadow-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    <span>Running Operations Diagnostic...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-4.5 w-4.5" />
                    <span>{report ? 'Re-Run Coach Consultation' : 'Initialize Business Coach'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Coach Screen Content */}
        <AnimatePresence mode="wait">
          
          {/* Loading state with step simulation */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-10 sm:p-14 text-center shadow-sm"
            >
              <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              
              <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Consulting AI Business Coach</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
                Rajan's digital assistant is loading transactional metrics and invoking AI Business Coach models to evaluate restaurant viability...
              </p>

              {/* Progress Steps UI */}
              <div className="mt-10 max-w-md mx-auto space-y-4">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center space-x-3.5 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      currentStep > idx 
                        ? 'bg-emerald-500 text-white' 
                        : currentStep === idx 
                        ? 'bg-orange-500 text-white animate-pulse' 
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {currentStep > idx ? '✓' : idx + 1}
                    </div>
                    <span className={`text-xs sm:text-sm font-semibold ${
                      currentStep === idx ? 'text-slate-800' : 'text-slate-400'
                    }`}>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-slate-800 shadow-sm max-w-2xl mx-auto"
            >
              <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-bold text-red-900 text-lg">Diagnostics Stream Interrupted</h3>
              <p className="text-sm text-red-700 mt-2 leading-relaxed">{error}</p>
              <button
                onClick={generateCoachInsights}
                className="mt-5 inline-flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>
            </motion.div>
          )}

          {/* Placeholder state */}
          {!report && !loading && !error && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-12 sm:p-20 text-center shadow-sm max-w-3xl mx-auto"
            >
              <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
                💼
              </div>
              <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Active Business Coach Awaiting Initialization</h3>
              <p className="text-slate-500 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                Click the button above to dynamically load your sales database, calculate performance metrics, and build a full coaching plan using the live OpenRouter LLM.
              </p>
            </motion.div>
          )}

          {/* Master Dashboard Renders */}
          {report && stats && !loading && !error && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Executive Grid: Score + Stats Bento */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. Large Health Score Card */}
                <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-slate-50/50 pointer-events-none">
                    <Target className="h-44 w-44 opacity-5 rotate-12" />
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Business Health Score</h3>
                    
                    <div className="flex items-center space-x-6">
                      {/* Score circle visualization */}
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="absolute w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="48" className="stroke-slate-100" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="56" 
                            cy="56" 
                            r="48" 
                            className={`${getRatingColor(report.healthScore).circle} transition-all duration-1000`} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray="301.6" 
                            strokeDashoffset={301.6 - (301.6 * report.healthScore) / 100}
                          />
                        </svg>
                        <span className="text-3xl font-extrabold text-slate-800">{report.healthScore}</span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-slate-800">
                            {report.businessRating}
                          </span>
                          <span className="text-xl">
                            {getRatingColor(report.healthScore).indicator}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold mt-1">Overall Operations Quality</p>
                      </div>
                    </div>
                  </div>

                  {/* Why explanation section directly underneath */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <HelpCircle className="h-4 w-4 text-orange-500" /> Why this score?
                    </h4>
                    <ul className="space-y-2.5">
                      {report.scoreExplanation?.map((point, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start space-x-2">
                          <span className="text-orange-500 font-bold text-sm leading-none">•</span>
                          <span className="font-medium leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Calculated Statistics Bento Dashboard */}
                <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Calculated Metrics Grounding</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    
                    {/* Stat Card */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Sales</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Orders</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">{stats.totalOrders}</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Average Ticket</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">₹{stats.averageOrderValue.toFixed(0)}</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Top Product</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 truncate" title={stats.mostPopularPizza}>{stats.mostPopularPizza}</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Slowest Product</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 truncate" title={stats.leastPopularPizza}>{stats.leastPopularPizza}</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Topping Attachment</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">{stats.toppingAttachmentRate.toFixed(0)}%</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Revenue Concentration</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 truncate">
                        {stats.revenueConcentration.toFixed(0)}% <span className="text-[10px] text-slate-400 font-normal">({stats.mostPopularPizza})</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2 sm:col-span-2">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Payment Mode Share</p>
                      <div className="flex flex-wrap gap-2.5 mt-2">
                        {Object.entries(stats.paymentModeDistribution).map(([mode, pct]) => (
                          <span key={mode} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 text-[10px] font-bold border border-orange-100">
                            {mode}: {pct.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Executive Summary Block */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Executive Summary</h3>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                  "{report.executiveSummary}"
                </p>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 3. Strengths Card */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center space-x-2.5 mb-6">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Operational Strengths</h3>
                  </div>

                  <div className="space-y-4">
                    {report.strengths?.map((strength, idx) => (
                      <div key={idx} className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-4 flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-extrabold text-emerald-900">{strength.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{strength.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Weaknesses Card */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center space-x-2.5 mb-6">
                    <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Operational Vulnerabilities</h3>
                  </div>

                  <div className="space-y-4">
                    {report.weaknesses?.map((weakness, idx) => (
                      <div key={idx} className="bg-rose-50/40 border border-rose-100/50 rounded-xl p-4 flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-extrabold text-rose-900">{weakness.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{weakness.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* 5. Recommendations Panel */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center space-x-2.5 mb-6">
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Specific Business Recommendations for Today</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {report.recommendations?.map((recommendation, idx) => (
                    <div key={idx} className="border border-amber-200 bg-amber-50/25 rounded-2xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                            Strategy 0{idx + 1}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{recommendation.title}</h4>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                          {recommendation.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* What-if Simulator Section */}
        <div className="mt-12 border-t border-slate-200 pt-10">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight font-sans">
                    What-if Simulator
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">
                    Simulate tactical business changes. The AI Business Intelligence Engine analyzes your menu, orders, and payment shares to predict custom business and customer impacts.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Form & Examples */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={whatIfQuery}
                    onChange={(e) => setWhatIfQuery(e.target.value)}
                    placeholder="Ask a scenario... e.g. What if I increase Cheese Burst price by ₹20?"
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl transition-all font-medium text-sm outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleWhatIfSubmit();
                      }
                    }}
                  />
                  <div className="absolute right-2 top-2">
                    <button
                      onClick={() => handleWhatIfSubmit()}
                      disabled={whatIfLoading || !whatIfQuery.trim()}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      {whatIfLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 fill-current text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Presets Chips */}
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Example Scenarios</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What if I increase Cheese Burst price by ₹20?",
                    "What if I give 10% discount after 8 PM?",
                    "What if I introduce Buy 2 Get 1?",
                    "What if I remove Farmhouse Pizza?"
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setWhatIfQuery(example);
                        handleWhatIfSubmit(example);
                      }}
                      disabled={whatIfLoading}
                      className="px-3.5 py-1.5 bg-indigo-50/50 hover:bg-indigo-50 active:scale-95 text-indigo-700 hover:text-indigo-800 text-xs font-semibold rounded-full border border-indigo-100/60 transition-all cursor-pointer text-left disabled:opacity-50"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error handling for Simulator */}
            {whatIfError && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-900 text-sm">Simulation Interrupted</h4>
                  <p className="text-xs text-red-700 mt-1">{whatIfError}</p>
                </div>
              </div>
            )}

            {/* Simulated Report results display */}
            <AnimatePresence mode="wait">
              {whatIfLoading && (
                <motion.div
                  key="sim-loader"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-8 bg-slate-50/50 border border-slate-100 rounded-2xl p-8 text-center"
                >
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h4 className="font-bold text-slate-700 text-sm">Simulating Scenario Impact...</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Computing menu price changes, analyzing transaction elasticity, and preparing expert projections based on live data context...
                  </p>
                </motion.div>
              )}

              {whatIfReport && !whatIfLoading && (
                <motion.div
                  key="sim-report"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 border-t border-slate-100 pt-8 space-y-6"
                >
                  {/* Results Header block */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4">
                    <div>
                      <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">Active Simulation</p>
                      <h4 className="text-base font-extrabold text-slate-800 mt-1">"{whatIfQuery}"</h4>
                    </div>

                    <div className="flex items-center space-x-2.5 self-start sm:self-auto bg-white border border-indigo-100 px-4 py-2 rounded-xl shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confidence Level:</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                        whatIfReport.confidenceLevel?.toLowerCase() === 'high'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : whatIfReport.confidenceLevel?.toLowerCase() === 'medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {whatIfReport.confidenceLevel || 'Medium'}
                      </span>
                    </div>
                  </div>

                  {/* Impact Grid: Business vs. Customer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business Impact Card */}
                    <div className="bg-blue-50/20 border border-blue-100/60 rounded-2xl p-5">
                      <div className="flex items-center space-x-2.5 mb-3.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <DollarSign className="h-4.5 w-4.5" />
                        </div>
                        <h5 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Business Impact</h5>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                        {whatIfReport.businessImpact}
                      </p>
                    </div>

                    {/* Customer Impact Card */}
                    <div className="bg-amber-50/20 border border-amber-100/60 rounded-2xl p-5">
                      <div className="flex items-center space-x-2.5 mb-3.5">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                          <Users className="h-4.5 w-4.5" />
                        </div>
                        <h5 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Customer Impact</h5>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                        {whatIfReport.customerImpact}
                      </p>
                    </div>
                  </div>

                  {/* Benefits & Risks Split lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Benefits List */}
                    <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Expected Benefits
                      </h5>
                      <ul className="space-y-3">
                        {whatIfReport.benefits?.map((benefit, idx) => (
                          <li key={idx} className="flex items-start space-x-2.5">
                            <span className="text-emerald-500 font-extrabold text-sm leading-none mt-0.5">•</span>
                            <span className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risks List */}
                    <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-rose-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> Potential Risks
                      </h5>
                      <ul className="space-y-3">
                        {whatIfReport.risks?.map((risk, idx) => (
                          <li key={idx} className="flex items-start space-x-2.5">
                            <span className="text-rose-400 font-extrabold text-sm leading-none mt-0.5">•</span>
                            <span className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendation block */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-200 rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-amber-500 fill-amber-100" />
                      <h5 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                        Consultant's Playbook Recommendation
                      </h5>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                      "{whatIfReport.recommendation}"
                    </p>
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
