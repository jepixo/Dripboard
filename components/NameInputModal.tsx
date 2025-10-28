import React, { useState, useEffect, useRef } from 'react';

interface NameInputModalProps {
  title: string;
  initialValue: string;
  onSave: (name: string, description: string, process: boolean) => Promise<void> | void;
  onClose: () => void;
  showDescription?: boolean;
  descriptionLabel?: string;
  isSaving?: boolean;
  saveLabel?: string;
}

export const NameInputModal: React.FC<NameInputModalProps> = ({ 
    title, 
    initialValue, 
    onSave, 
    onClose, 
    showDescription = false,
    descriptionLabel = "Description (optional)",
    isSaving = false,
    saveLabel,
}) => {
  const [name, setName] = useState(initialValue);
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, 50);
  }, []);

  const handleSave = async (process: boolean) => {
    if (name.trim() && !isSaving) {
      await onSave(name.trim(), description.trim(), process);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-brand-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 text-brand-text-primary">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave(true)}
          className="block w-full bg-gray-100 border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-brand-text-primary"
          disabled={isSaving}
        />
        {showDescription && (
           <div className="mt-4">
               <label htmlFor="item-description" className="block text-sm font-medium text-brand-text-secondary mb-1">{descriptionLabel}</label>
               <textarea
                   id="item-description"
                   rows={3}
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   className="block w-full bg-gray-100 border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-brand-text-primary"
                   placeholder="e.g., 'Blue denim jacket with fleece collar'"
                   disabled={isSaving}
               />
           </div>
        )}
        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
          {saveLabel ? (
            <button onClick={() => handleSave(true)} disabled={!name.trim() || isSaving} className="w-full sm:w-auto bg-brand-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : saveLabel}
            </button>
          ) : (
            <>
              <button onClick={() => handleSave(true)} disabled={!name.trim() || isSaving} className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isSaving ? 'Processing...' : 'Process & Save'}
              </button>
              <button onClick={() => handleSave(false)} disabled={!name.trim() || isSaving} className="bg-gray-200 hover:bg-gray-300 text-brand-text-primary font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                Use Directly
              </button>
            </>
          )}
          <button onClick={onClose} className="w-full sm:w-auto bg-transparent hover:bg-gray-100 text-brand-text-secondary font-bold py-2 px-4 rounded-lg transition-colors sm:mr-auto" disabled={isSaving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};