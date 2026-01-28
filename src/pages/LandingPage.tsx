import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { isDevelopment } from '../lib/env';

export function LandingPage() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  if (isDevelopment) {
    return <Navigate to="/markets" replace />;
  }

  if (user) {
    return <Navigate to="/markets" replace />;
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">One Eye Open</h1>
      {showRegister ? (
        <RegisterForm
          onSuccess={() => navigate('/markets')}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      ) : (
        <LoginForm
          onSuccess={() => navigate('/markets')}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
    </div>
  );
}
