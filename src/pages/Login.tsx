import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('admin@slicematic.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!data.user) {
        throw new Error('Authentication failed: no user returned.');
      }

      console.log('[CLIENT] Supabase Login successful. User:', data.user);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-amber-50/40 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Animated Brand Header */}
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20"
          >
            <ShieldAlert className="h-6 w-6 text-white" />
          </motion.div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Portal Access
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Secure sign-in for SliceMatic POS operations and analytics
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl shadow-orange-100/50 rounded-2xl border border-orange-50/60 sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
              
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:bg-white transition-all text-sm"
                    placeholder="admin@slicematic.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:bg-white transition-all text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Callout */}
              {error && (
                <div className="rounded-xl bg-red-50 p-3.5 border border-red-100 text-xs font-semibold text-red-600 flex items-start space-x-2 animate-shake">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Sign In Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Access Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Quick Demo Assist */}
            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <span className="text-xs text-slate-400 font-medium">Demo Access Credentials:</span>
              <div className="mt-1.5 flex justify-center gap-2 text-[11px] bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-100 font-mono">
                <span>admin@slicematic.com</span>
                <span className="text-slate-300">|</span>
                <span>password123</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
