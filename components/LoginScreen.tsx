import React from 'react';
import type { User } from '../types';
import { DripboardLogo, GoogleIcon } from './Icons';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-sm text-center">
        <DripboardLogo className="h-20 w-20 text-brand-primary mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-text-primary mb-2">Dripboard</h1>
        <p className="text-text-secondary text-lg mb-8">Your AI-powered virtual closet.</p>

        <div className="space-y-4">
          <button
            onClick={() => onLogin({ name: 'Gmail User' })} // Simulating a Google login
            className="w-full bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-3 px-4 rounded-lg inline-flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <GoogleIcon className="h-6 w-6" />
            Sign In with Google
          </button>
          <button
            onClick={() => onLogin({ name: 'Guest' })}
            className="w-full bg-panel hover:bg-bg-secondary text-text-primary font-bold py-3 px-4 rounded-lg transition-colors border border-border-color shadow-md hover:shadow-lg"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
