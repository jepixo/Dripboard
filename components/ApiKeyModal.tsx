
import React, { useState } from 'react';
import { DripboardLogo } from './Icons';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
  onClose?: () => void; // Optional for the initial setup screen
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onClose }) => {
  const [key, setKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (key.trim()) {
      setIsSaving(true);
      // We can't "validate" the key here without making a call,
      // so we just save it and let the user find out.
      onSave(key.trim());
      // The parent will handle closing, but we can reset state.
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-secondary flex justify-center items-center z-50 p-4">
      <div className="bg-panel rounded-lg p-6 w-full max-w-sm shadow-2xl text-center border border-border-color">
        {onClose && (
            <div className="text-center mb-4">
                <DripboardLogo className="h-12 w-12 text-brand-primary mx-auto" />
            </div>
        )}
        <h3 className="text-xl font-bold mb-2 text-text-primary">Enter Your Gemini API Key</h3>
        <p className="text-sm text-text-secondary mb-4">
          Your API key is stored locally in your browser and is never sent to our servers.
          <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-brand-primary font-semibold underline ml-1">
            Get a key here.
          </a>
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Enter your API key"
          className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-text-primary"
          disabled={isSaving}
        />
        <div className={`mt-6 flex ${onClose ? 'justify-end' : 'justify-center'} gap-3`}>
          {onClose && (
            <button onClick={onClose} className="bg-bg-secondary hover:bg-border-color text-text-primary font-bold py-2 px-4 rounded-md transition-colors" disabled={isSaving}>
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!key.trim() || isSaving}
            className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
};
