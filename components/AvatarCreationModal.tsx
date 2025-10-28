import React, { useState, useEffect, useRef } from 'react';
import type { Avatar } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { Loader } from './Loader';
import { SaveIcon, SparklesIcon } from './Icons';

interface AvatarCreationModalProps {
  file: File;
  onClose: () => void;
  onComplete: (newAvatar: Avatar) => void;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const AvatarCreationModal: React.FC<AvatarCreationModalProps> = ({ file, onClose, onComplete }) => {
  const [name, setName] = useState('');
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    setName(file.name.split('.').slice(0, -1).join('.') || 'New Avatar');
    fileToDataUrl(file).then(setSourceImageDataUrl).catch(err => {
        console.error("Error reading file:", err);
        setError("Could not read the selected file.");
    });
    setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, 100);

    return () => { isComponentMounted.current = false; };
  }, [file]);

  const handleSave = async (generate: boolean) => {
    if (!name.trim() || !sourceImageDataUrl) {
      setError('Please provide a name.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setProcessingText(generate ? 'Generating Avatar...' : 'Saving...');

    try {
      let finalImageDataUrl = sourceImageDataUrl;
      if (generate) {
        finalImageDataUrl = await geminiService.createFullBodyAvatar(sourceImageDataUrl);
      }
      
      const newAvatar: Avatar = {
        id: `avatar-${Date.now()}`,
        name: name.trim(),
        imageDataUrl: finalImageDataUrl,
      };

      await storageService.addAvatar(newAvatar);
      
      if(isComponentMounted.current){
        onComplete(newAvatar);
      }

    } catch (e: any) {
        if(isComponentMounted.current) {
            setError(e.message || 'An unexpected error occurred.');
        }
    } finally {
        if(isComponentMounted.current) {
            setIsProcessing(false);
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-brand-surface rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <h3 className="text-2xl font-bold mb-4 text-brand-text-primary">Create New Avatar</h3>
        
        {isProcessing && (
            <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                <Loader text={processingText} />
            </div>
        )}

        <div className="space-y-4">
            <div className="aspect-w-3 aspect-h-4 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                {sourceImageDataUrl ? (
                    <img src={sourceImageDataUrl} alt="Avatar preview" className="max-h-[40vh] object-contain"/>
                ) : (
                    <Loader text="Loading preview..."/>
                )}
            </div>
            
            {error && <div className="text-red-700 text-center bg-red-100 p-2 rounded-lg text-sm">{error}</div>}

            <div>
                <label htmlFor="avatar-name-modal" className="block text-sm font-medium text-brand-text-secondary mb-1">Avatar Name</label>
                <input
                    ref={inputRef}
                    id="avatar-name-modal"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full bg-gray-100 border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-brand-text-primary"
                    disabled={isProcessing}
                />
            </div>
            
            <p className="text-sm text-brand-text-secondary text-center p-2 bg-gray-50 rounded-lg">Is this a good, full-body photo? Use it directly. Otherwise, generate a standardized avatar for best results.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button onClick={() => handleSave(false)} disabled={isProcessing || !name.trim()} className="w-full bg-gray-200 hover:bg-gray-300 text-brand-text-primary font-bold py-3 px-4 rounded-xl inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <SaveIcon className="h-5 w-5"/>
                    Use Directly
                </button>
                <button onClick={() => handleSave(true)} disabled={isProcessing || !name.trim()} className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-0.5">
                    <SparklesIcon className="h-5 w-5"/>
                    Generate & Save
                </button>
            </div>
        </div>

        <div className="mt-4 text-center">
             <button onClick={onClose} className="text-brand-text-secondary hover:text-brand-text-primary text-sm font-semibold" disabled={isProcessing}>
                Cancel
             </button>
        </div>
      </div>
    </div>
  );
};