import React from 'react';
import type { User } from '../types';
import { DripolarLogo, GoogleIcon } from './Icons';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    
  const geometricBgStyle = {
      backgroundImage: 'radial-gradient(#DDE1E6 0.5px, transparent 0.5px)',
      backgroundSize: '15px 15px',
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-brand-bg p-4" style={geometricBgStyle}>
      <div className="w-full max-w-sm text-center">
        <DripolarLogo className="h-24 w-24 text-brand-primary mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-brand-text-primary mb-2">Welcome to Dripolar</h1>
        <p className="text-brand-text-secondary text-lg mb-8">Your AI-powered virtual closet.</p>

        <div className="space-y-4">
          <button
            onClick={() => onLogin({ name: 'Gmail User' })} // Simulating a Google login
            className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl inline-flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <GoogleIcon className="h-6 w-6" />
            Sign In with Google
          </button>
          <button
            onClick={() => onLogin({ name: 'Guest' })}
            className="w-full bg-brand-surface hover:bg-gray-100 text-brand-text-primary font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
