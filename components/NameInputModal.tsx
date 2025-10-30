import React, { useState, useEffect, useRef } from 'react';
import { ClothingCategory, type SizeSystem, type AlphaSize, ALPHA_SIZES, type NumericSize, NUMERIC_SIZES, type UKShoeSize, UK_SHOE_SIZES } from '../types';

interface NameInputModalProps {
  title: string;
  initialValue: string;
  onSave: (details: {
    name: string;
    description: string;
    tags: string[];
    process: boolean;
    sizeSystem?: SizeSystem;
    alphaSize?: AlphaSize;
    numericSize?: NumericSize;
    shoeSize?: UKShoeSize;
  }) => Promise<void> | void;
  onClose: () => void;
  showDescription?: boolean;
  descriptionLabel?: string;
  showTags?: boolean;
  tagLabel?: string;
  isSaving?: boolean;
  saveLabel?: string;
  category?: ClothingCategory; // New prop
}

export const NameInputModal: React.FC<NameInputModalProps> = ({ 
    title, 
    initialValue, 
    onSave, 
    onClose, 
    showDescription = false,
    descriptionLabel = "Description (optional)",
    showTags = false,
    tagLabel = "Custom Tags (comma-separated)",
    isSaving = false,
    saveLabel,
    category,
}) => {
  const [name, setName] = useState(initialValue);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // State for size selection
  const [sizeSystem, setSizeSystem] = useState<SizeSystem | 'none'>('alpha');
  const [alphaSize, setAlphaSize] = useState<AlphaSize | ''>('');
  const [numericSize, setNumericSize] = useState<NumericSize | ''>('');
  const [shoeSize, setShoeSize] = useState<UKShoeSize | ''>('');


  useEffect(() => {
    setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, 50);
  }, []);

  const handleSave = async (process: boolean) => {
    if (name.trim() && !isSaving) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      await onSave({
          name: name.trim(),
          description: description.trim(),
          tags: tagArray,
          process,
          sizeSystem: category === ClothingCategory.FOOTWEAR ? 'uk_shoe' : (sizeSystem as SizeSystem),
          alphaSize: alphaSize || undefined,
          numericSize: numericSize || undefined,
          shoeSize: shoeSize || undefined,
      });
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isSaving) {
      onClose();
    }
  };
  
  const renderSizeSelector = () => {
    if (category === ClothingCategory.TOP || category === ClothingCategory.BOTTOM) {
        return (
            <div className="mt-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Size</label>
                <div className="flex rounded-md shadow-sm">
                    <button onClick={() => setSizeSystem('alpha')} className={`px-4 py-2 text-sm font-semibold rounded-l-md w-1/2 ${sizeSystem === 'alpha' ? 'bg-brand-primary text-white' : 'bg-bg-secondary text-text-primary hover:bg-border-color'}`}>Alphabetical</button>
                    <button onClick={() => setSizeSystem('numeric')} className={`px-4 py-2 text-sm font-semibold rounded-r-md w-1/2 ${sizeSystem === 'numeric' ? 'bg-brand-primary text-white' : 'bg-bg-secondary text-text-primary hover:bg-border-color'}`}>Numerical (in.)</button>
                </div>
                {sizeSystem === 'alpha' && (
                    <select value={alphaSize} onChange={e => setAlphaSize(e.target.value as AlphaSize)} className="mt-2 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                        <option value="">Select size...</option>
                        {ALPHA_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                )}
                {sizeSystem === 'numeric' && (
                     <select value={numericSize} onChange={e => setNumericSize(parseInt(e.target.value) as NumericSize)} className="mt-2 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                        <option value="">Select size...</option>
                        {NUMERIC_SIZES.map(s => <option key={s} value={s}>{s}"</option>)}
                    </select>
                )}
            </div>
        );
    }
    if (category === ClothingCategory.FOOTWEAR) {
        return (
             <div className="mt-4">
                <label htmlFor="shoe-size" className="block text-sm font-medium text-text-secondary mb-1">UK Shoe Size</label>
                 <select id="shoe-size" value={shoeSize} onChange={e => setShoeSize(parseFloat(e.target.value) as UKShoeSize)} className="mt-1 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="">Select size...</option>
                    {UK_SHOE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-panel rounded-lg p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4 text-text-primary">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave(true)}
          className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
          disabled={isSaving}
        />
        {renderSizeSelector()}
        {showDescription && (
           <div className="mt-4">
               <label htmlFor="item-description" className="block text-sm font-medium text-text-secondary mb-1">{descriptionLabel}</label>
               <textarea
                   id="item-description"
                   rows={3}
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                   placeholder="e.g., 'Blue denim jacket with fleece collar'"
                   disabled={isSaving}
               />
           </div>
        )}
         {showTags && (
           <div className="mt-4">
               <label htmlFor="item-tags" className="block text-sm font-medium text-text-secondary mb-1">{tagLabel}</label>
               <input
                   id="item-tags"
                   type="text"
                   value={tags}
                   onChange={(e) => setTags(e.target.value)}
                   className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                   placeholder="e.g., summer, casual, vacation"
                   disabled={isSaving}
               />
           </div>
        )}
        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
          {saveLabel ? (
            <button onClick={() => handleSave(true)} disabled={!name.trim() || isSaving} className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : saveLabel}
            </button>
          ) : (
            <>
              <button onClick={() => handleSave(true)} disabled={!name.trim() || isSaving} className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isSaving ? 'Processing...' : 'Process & Save'}
              </button>
              <button onClick={() => handleSave(false)} disabled={!name.trim() || isSaving} className="bg-bg-secondary hover:bg-border-color text-text-primary font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                Use Directly
              </button>
            </>
          )}
          <button onClick={onClose} className="w-full sm:w-auto bg-transparent hover:bg-bg-secondary text-text-secondary font-bold py-2 px-4 rounded-md transition-colors sm:mr-auto" disabled={isSaving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
