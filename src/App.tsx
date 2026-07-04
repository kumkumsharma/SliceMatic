import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OrderPage from './pages/OrderPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AIInsights from './pages/AIInsights';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Navigation bar stickied to top of viewport */}
        <Navbar />
        
        {/* Responsive router window */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<OrderPage />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Management Interfaces */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ai-insights" 
              element={
                <ProtectedRoute>
                  <AIInsights />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
