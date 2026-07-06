import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Pizza, ShieldAlert, Sparkles, LogOut, ShoppingCart } from 'lucide-react';
import { useAuth } from '../services/authContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = !!user;

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Failed to sign out:', err);
      // Fallback
      navigate('/');
    }
  };


  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-orange-500 hover:text-orange-400 transition-colors">
              <Pizza className="h-8 w-8 animate-pulse" />
              <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                Slice<span className="text-orange-500">Matic</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-orange-500/10 text-orange-500'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Order Pizza</span>
            </Link>

            {isAdmin ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin/dashboard')
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>

                <Link
                  to="/ai-insights"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/ai-insights')
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>AI Business Coach</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/login')
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
