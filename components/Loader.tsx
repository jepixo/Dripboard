import React from 'react';

interface LoaderProps {
  text?: string;
}

export function Loader({ text }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-text-secondary font-semibold">{text || 'Loading...'}</p>
    </div>
  );
}