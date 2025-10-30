import React, { useState, useEffect } from 'react';
import type { ClothingItem, SizeSystem, AlphaSize, NumericSize, UKShoeSize } from '../types';
import { ClothingCategory, ALPHA_SIZES, NUMERIC_SIZES, UK_SHOE_SIZES } from '../types';

interface ClothingEditModalProps {
  item: ClothingItem;
  onSave: (updatedItem: ClothingItem) => void;
  onClose: () => void;
}

export const ClothingEditModal: React.FC<ClothingEditModalProps> = ({ item, onSave, onClose }) => {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [tags, setTags] = useState(item.customTags?.join(', ') || '');
  
  const [sizeSystem, setSizeSystem] = useState<SizeSystem | 'none'>(item.sizeSystem || 'alpha');
  const [alphaSize, setAlphaSize] = useState<AlphaSize | ''>(item.alphaSize || '');
  const [numericSize, setNumericSize] = useState<NumericSize | ''>(item.numericSize || '');
  const [shoeSize, setShoeSize] = useState<UKShoeSize | ''>(item.shoeSize || '');

  useEffect(() => {
    setName(item.name);
    setDescription(item.description || '');
    setTags(item.customTags?.join(', ') || '');
    setSizeSystem(item.sizeSystem || (item.category === ClothingCategory.FOOTWEAR ? 'uk_shoe' : 'alpha'));
    setAlphaSize(item.alphaSize || '');
    setNumericSize(item.numericSize || '');
    setShoeSize(item.shoeSize || '');
  }, [item]);

  const handleSave = () => {
    if (!name.trim()) return;

    const updatedItem: ClothingItem = {
      ...item,
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      customTags: tags.split(',').map(t => t.trim()).filter(Boolean),
      sizeSystem: item.category === ClothingCategory.FOOTWEAR ? 'uk_shoe' : (sizeSystem as SizeSystem),
      alphaSize: alphaSize || undefined,
      numericSize: numericSize || undefined,
      shoeSize: shoeSize || undefined,
    };
    onSave(updatedItem);
  };
  
    const renderSizeSelector = () => {
    if (item.category === ClothingCategory.TOP || item.category === ClothingCategory.BOTTOM) {
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
    if (item.category === ClothingCategory.FOOTWEAR) {
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
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-panel rounded-lg p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4 text-text-primary">Edit {item.category}</h3>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label htmlFor="clothing-name" className="block text-sm font-medium text-text-secondary mb-1">Name</label>
            <input
              id="clothing-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          
           <div>
               <label htmlFor="item-description" className="block text-sm font-medium text-text-secondary mb-1">Description</label>
               <textarea
                   id="item-description"
                   rows={3}
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                   placeholder="e.g., 'Blue denim jacket with fleece collar'"
               />
           </div>
           
           <div>
               <label htmlFor="item-tags" className="block text-sm font-medium text-text-secondary mb-1">Custom Tags (comma-separated)</label>
               <input
                   id="item-tags"
                   type="text"
                   value={tags}
                   onChange={(e) => setTags(e.target.value)}
                   className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-text-primary"
                   placeholder="e.g., summer, casual, vacation"
               />
           </div>
           {renderSizeSelector()}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-bg-secondary hover:bg-border-color text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-400">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
