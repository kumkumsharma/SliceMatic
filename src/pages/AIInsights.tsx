import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, HelpCircle, Brain, RefreshCw, BarChart2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AIInsights() {
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Aggregating sandbox order logs...',
    'Analyzing recipe combos & ingredient demand...',
    'Assessing peak transactional totals...',
    'Consulting Gemini AI consulting model...'
  ];

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    setInsights('');
    setCurrentStep(0);

    // Simulate progressive analytics compilation steps
    const stepIntervals = [
      setTimeout(() => setCurrentStep(1), 1000),
      setTimeout(() => setCurrentStep(2), 2200),
      setTimeout(() => setCurrentStep(3), 3500)
    ];

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      
      stepIntervals.forEach(clearTimeout);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI insights. Make sure GEMINI_API_KEY is configured.');
      }

      setInsights(data.insights);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Banner header card */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8 border border-orange-400">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-white pointer-events-none">
            <Brain className="h-44 w-44" />
          </div>

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>SliceMatic Intelligence Suite</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              AI Business Consultant Report
            </h1>
            <p className="text-sm sm:text-base text-orange-50 max-w-2xl font-medium leading-relaxed">
              Unlock professional restaurant analytics instantly. Gemini analyzes your live recipe configurations, order histories, and bulk discount effectiveness to provide actionable insights.
            </p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-500 mt-1">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Dynamic Operations Evaluation</h3>
              <p className="text-slate-400 text-xs mt-0.5">Generates real consultation audits from our Google Gemini API.</p>
            </div>
          </div>

          <button
            onClick={generateInsights}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5" />
                <span>{insights ? 'Re-Generate Audit' : 'Generate Business Audit'}</span>
              </>
            )}
          </button>
        </div>

        {/* Insights Screen Content */}
        <AnimatePresence mode="wait">
          
          {/* 1. Loading state with step simulation */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm"
            >
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              
              <h3 className="font-extrabold text-slate-800 text-lg">Brewing Restaurant Insights</h3>
              <p className="text-slate-400 text-xs mt-1">Google Gemini is compiling dynamic business recommendations...</p>

              {/* Progress Steps UI */}
              <div className="mt-8 max-w-sm mx-auto space-y-3.5">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center space-x-3 text-left">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      currentStep > idx 
                        ? 'bg-emerald-500 text-white' 
                        : currentStep === idx 
                        ? 'bg-orange-500 text-white animate-pulse' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {currentStep > idx ? '✓' : idx + 1}
                    </div>
                    <span className={`text-xs font-semibold ${
                      currentStep === idx ? 'text-slate-800' : 'text-slate-400'
                    }`}>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 2. Error state */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-slate-800 shadow-sm"
            >
              <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-red-900 text-base">Analytical Stream Interrupted</h3>
              <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{error}</p>
              <button
                onClick={generateInsights}
                className="mt-4 inline-flex items-center space-x-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry Generation</span>
              </button>
            </motion.div>
          )}

          {/* 3. Placeholder state */}
          {!insights && !loading && !error && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm"
            >
              <div className="text-5xl mb-4">📈</div>
              <h3 className="font-extrabold text-slate-800 text-lg">No Audit Report Generated</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-md mx-auto">
                Press the button above to request a fully contextualized business consulting report compiled in real time by Gemini based on transactions.
              </p>
            </motion.div>
          )}

          {/* 4. Markdown Report Render */}
          {insights && !loading && !error && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-10 relative overflow-hidden"
            >
              {/* Report Watermark stamp */}
              <div className="absolute top-4 right-4 flex items-center space-x-1 bg-orange-50 border border-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-600" />
                <span>Gemini Ver. 3.5</span>
              </div>

              {/* Styled Markdown body */}
              <div className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-extrabold prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-orange-600 prose-strong:font-bold">
                <Markdown>{insights}</Markdown>
              </div>

              <div className="border-t border-slate-100 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400">
                <span>Compiled using live server database metrics.</span>
                <span className="mt-2 sm:mt-0">SliceMatic Intelligence © 2026</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
