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
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
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
        chest: chest ? parseFloat(chest) : undefined,
        waist: waist ? parseFloat(waist) : undefined,
      };

      await storageService.addAvatar(newAvatar);
      
      if(isComponentMounted.current){
        onComplete(newAvatar);
      }

    } catch (e) {
        if(isComponentMounted.current) {
            // FIX: The caught error `e` is of type `unknown`. We must check if it's an instance of `Error` before accessing `e.message` to avoid runtime errors.
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unexpected error occurred.');
            }
        }
    } finally {
        if(isComponentMounted.current) {
            setIsProcessing(false);
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-panel rounded-lg p-6 w-full max-w-md shadow-2xl relative">
        <h3 className="text-2xl font-bold mb-4 text-text-primary">Create New Avatar</h3>
        
        {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <Loader text={processingText} />
            </div>
        )}

        <div className="space-y-4">
            <div className="aspect-w-3 aspect-h-4 bg-bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                {sourceImageDataUrl ? (
                    <img src={sourceImageDataUrl} alt="Avatar preview" className="max-h-[40vh] object-contain"/>
                ) : (
                    <Loader text="Loading preview..."/>
                )}
            </div>
            
            {error && <div className="text-red-700 text-center bg-red-100 p-2 rounded-md text-sm">{error}</div>}

            <div className="space-y-3">
                <div>
                    <label htmlFor="avatar-name-modal" className="block text-sm font-medium text-text-secondary mb-1">Avatar Name</label>
                    <input
                        ref={inputRef}
                        id="avatar-name-modal"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                        disabled={isProcessing}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="avatar-chest-modal" className="block text-sm font-medium text-text-secondary mb-1">Chest Size (in.)</label>
                        <input
                            id="avatar-chest-modal"
                            type="number"
                            value={chest}
                            placeholder="e.g., 40"
                            onChange={(e) => setChest(e.target.value)}
                            className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                            disabled={isProcessing}
                        />
                    </div>
                     <div>
                        <label htmlFor="avatar-waist-modal" className="block text-sm font-medium text-text-secondary mb-1">Waist Size (in.)</label>
                        <input
                            id="avatar-waist-modal"
                            type="number"
                            value={waist}
                            placeholder="e.g., 32"
                            onChange={(e) => setWaist(e.target.value)}
                            className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                            disabled={isProcessing}
                        />
                    </div>
                </div>
            </div>
            
            <p className="text-sm text-text-secondary text-center p-2 bg-bg-secondary rounded-md">Is this a good, full-body photo? Use it directly. Otherwise, generate a standardized avatar for best results.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button onClick={() => handleSave(false)} disabled={isProcessing || !name.trim()} className="w-full bg-bg-secondary hover:bg-border-color text-text-primary font-bold py-3 px-4 rounded-md inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <SaveIcon className="h-5 w-5"/>
                    Use Directly
                </button>
                <button onClick={() => handleSave(true)} disabled={isProcessing || !name.trim()} className="w-full bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-3 px-4 rounded-md inline-flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-0.5">
                    <SparklesIcon className="h-5 w-5"/>
                    Generate & Save
                </button>
            </div>
        </div>

        <div className="mt-4 text-center">
             <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm font-semibold" disabled={isProcessing}>
                Cancel
             </button>
        </div>
      </div>
    </div>
  );
};