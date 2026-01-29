import { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { isDevelopment } from '../lib/env';

export function LandingPage() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstInput = formContainerRef.current?.querySelector<HTMLInputElement>('input');
    firstInput?.focus();
  }, [showRegister]);

  if (isDevelopment) {
    return <Navigate to="/markets" replace />;
  }

  if (user) {
    return <Navigate to="/markets" replace />;
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 sm:mb-3">One Eye Open</h1>
      <p className="text-center text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Prediction markets for the trip
      </p>
      <div ref={formContainerRef}>
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
    </div>
  );
}
