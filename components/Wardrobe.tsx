import React, { useState, useRef } from 'react';
import type { Avatar, ClothingItem } from '../types';
import { ClothingCategory, CLOTHING_CATEGORIES } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { ItemCard } from './ItemCard';
import { NameInputModal } from './NameInputModal';
import { AvatarCreationModal } from './AvatarCreationModal';
import { PlusIcon, UploadIcon } from './Icons';

interface WardrobeProps {
  avatars: Avatar[];
  clothing: ClothingItem[];
  onDataChange: () => void;
}

interface NamingState {
    file: File;
    category?: ClothingCategory;
    type: 'avatar' | 'clothing';
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function Wardrobe({ avatars, clothing, onDataChange }: WardrobeProps) {
  const [tab, setTab] = useState<'avatars' | 'clothing'>('clothing');
  const [showAddClothingModal, setShowAddClothingModal] = useState(false);
  const [isProcessingItem, setIsProcessingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [namingState, setNamingState] = useState<NamingState | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
    }
    event.target.value = '';
  };
  
  const handleClothingFileSelect = (event: React.ChangeEvent<HTMLInputElement>, category: ClothingCategory) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setNamingState({ file, category, type: 'clothing' });
        setShowAddClothingModal(false);
    }
     event.target.value = '';
  };

  const handleCreateClothing = async (name: string, description: string, process: boolean) => {
    if (!namingState || namingState.type !== 'clothing' || !namingState.category) return;
    const { file, category } = namingState;

    setIsProcessingItem(true);
    setError(null);

    try {
        const sourceImageDataUrl = await fileToDataUrl(file);
        let finalImageDataUrl = sourceImageDataUrl;

        if (process) {
          finalImageDataUrl = await geminiService.extractAndCleanClothingItem(sourceImageDataUrl, category, description);
        }
        
        const newClothingItem: ClothingItem = {
          id: `clothing-${Date.now()}`,
          name,
          imageDataUrl: finalImageDataUrl,
          category,
          description: description || undefined,
        };
        await storageService.addClothing(newClothingItem);
        onDataChange();
        setNamingState(null);
    } catch (e: any) {
        setError(e.message || "An unexpected error occurred while processing the clothing item.");
        setNamingState(null);
    } finally {
        setIsProcessingItem(false);
    }
  };

  const clothingByCategory = clothing.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<ClothingCategory, ClothingItem[]>);

  const AddClothingModal: React.FC = () => {
    const fileInputRefs = useRef<{[key in ClothingCategory]?: HTMLInputElement | null}>({});

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-brand-surface rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <h3 className="text-2xl font-bold mb-6 text-brand-text-primary">Add New Clothing Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CLOTHING_CATEGORIES.map(category => (
                <div key={category}>
                    <input type="file" accept="image/*" className="hidden" ref={el => { fileInputRefs.current[category] = el; }} onChange={(e) => handleClothingFileSelect(e, category)} />
                    <button onClick={() => fileInputRefs.current[category]?.click()} className="w-full h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-brand-text-secondary hover:bg-gray-100 hover:border-brand-primary hover:text-brand-primary transition-all duration-300">
                        <UploadIcon className="h-6 w-6 mb-1"/>
                        <span className="font-semibold">{category}</span>
                    </button>
                </div>
            ))}
          </div>
          <button onClick={() => setShowAddClothingModal(false)} className="mt-6 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    )
  };

  return (
    <div className="space-y-6">
       {namingState?.type === 'clothing' && (
        <NameInputModal
          title={`Add New ${namingState.category}`}
          initialValue={namingState.file.name.split('.').slice(0, -1).join('.') || ''}
          onSave={handleCreateClothing}
          onClose={() => setNamingState(null)}
          showDescription={true}
          descriptionLabel="Describe the item to help the AI isolate it"
          isSaving={isProcessingItem}
        />
      )}
      {avatarFile && (
        <AvatarCreationModal
            file={avatarFile}
            onClose={() => setAvatarFile(null)}
            onComplete={() => {
                onDataChange();
                setAvatarFile(null);
            }}
        />
      )}

      <h2 className="text-3xl font-bold text-brand-text-primary">My Wardrobe</h2>
      {error && <div className="mb-4 text-red-700 text-center bg-red-100 p-3 rounded-lg shadow-sm">{error}</div>}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setTab('clothing')} className={`${tab === 'clothing' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg`}>
            Clothing
          </button>
          <button onClick={() => setTab('avatars')} className={`${tab === 'avatars' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg`}>
            Avatars
          </button>
        </nav>
      </div>

      {tab === 'avatars' && (
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {avatars.map(avatar => <ItemCard key={avatar.id} item={avatar} />)}
             <label className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-brand-text-secondary transition-all duration-300 hover:bg-gray-100 hover:text-brand-primary cursor-pointer border-2 border-dashed border-gray-300 hover:border-brand-primary">
              <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarFileSelect} />
              <>
                <PlusIcon className="h-8 w-8"/>
                <span className="mt-2 text-sm font-semibold">Add Avatar</span>
              </>
            </label>
          </div>
        </section>
      )}

      {tab === 'clothing' && (
        <section>
          <div className="text-right mb-4">
            <button onClick={() => setShowAddClothingModal(true)} className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-full inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              <PlusIcon className="h-5 w-5"/>
              Add Clothing
            </button>
          </div>
          <div className="space-y-8">
            {CLOTHING_CATEGORIES.map(category => (
              (clothingByCategory[category] && clothingByCategory[category].length > 0) && (
                <div key={category}>
                  <h3 className="text-xl font-semibold mb-3 text-brand-text-secondary">{category}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {clothingByCategory[category].map(item => <ItemCard key={item.id} item={item} />)}
                  </div>
                </div>
              )
            ))}
          </div>
        </section>
      )}
      {showAddClothingModal && <AddClothingModal/>}
    </div>
  );
}