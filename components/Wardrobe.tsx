import React, { useState, useRef, useMemo } from 'react';
import type { Avatar, ClothingItem, SizeSystem, AlphaSize, NumericSize, UKShoeSize } from '../types';
import { ClothingCategory, CLOTHING_CATEGORIES } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { ItemCard } from './ItemCard';
import { NameInputModal } from './NameInputModal';
import { AvatarCreationModal } from './AvatarCreationModal';
import { ImageCropperModal } from './ImageCropperModal';
import { AvatarEditModal } from './AvatarEditModal';
import { ClothingEditModal } from './ClothingEditModal';
import { PlusIcon, UploadIcon, XIcon, ChevronDownIcon, EditIcon } from './Icons';

interface WardrobeProps {
  avatars: Avatar[];
  clothing: ClothingItem[];
  onDataChange: () => void;
  onClose: () => void;
}

interface ClothingUploadState {
  step: 'cropping' | 'naming';
  file?: File;
  category: ClothingCategory;
  imageDataUrl?: string; // For naming step
  originalName: string;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

type AllFilters = {
    colors: string[],
    fabrics: string[],
    patterns: string[],
    styles: string[],
    customTags: string[]
};

// Moved FilterPanel outside of Wardrobe to prevent re-creation on every render, fixing the search input focus bug.
const FilterPanel = ({ searchTerm, setSearchTerm, activeFilters, allFilters, handleFilterToggle, clearFilters }: {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeFilters: Record<keyof AllFilters, string[]>;
    allFilters: AllFilters;
    handleFilterToggle: (category: keyof AllFilters, value: string) => void;
    clearFilters: () => void;
}) => {
    const filterCategories: {label: string, key: keyof AllFilters}[] = [
        { label: 'Colors', key: 'colors' }, { label: 'Fabrics', key: 'fabrics' },
        { label: 'Styles', key: 'styles' }, { label: 'Patterns', key: 'patterns' },
        { label: 'Your Tags', key: 'customTags' },
    ];
    const hasActiveFilters = Object.values(activeFilters).some((f: string[]) => f.length > 0) || searchTerm;

    return (
      <div className="p-4 bg-panel border border-border-color rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input 
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm font-semibold text-text-secondary hover:text-brand-primary whitespace-nowrap">Clear All</button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filterCategories.map(({label, key}) => (
                allFilters[key].length > 0 && (
                    <details key={key} className="group">
                        <summary className="font-semibold text-text-primary cursor-pointer list-none flex justify-between items-center">
                            {label}
                            <ChevronDownIcon className="h-5 w-5 text-text-secondary group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {allFilters[key].map(value => (
                                <button key={value} onClick={() => handleFilterToggle(key, value)}
                                    className={`px-2 py-1 text-xs font-semibold rounded-full border transition-colors ${activeFilters[key].includes(value) ? 'bg-brand-primary text-white border-brand-primary' : 'bg-bg-secondary text-text-primary border-border-color hover:border-brand-secondary'}`}>
                                    {value}
                                </button>
                            ))}
                        </div>
                    </details>
                )
            ))}
        </div>
      </div>
    );
};


export function Wardrobe({ avatars, clothing, onDataChange, onClose }: WardrobeProps) {
  const [tab, setTab] = useState<'clothing' | 'avatars'>('clothing');
  const [showAddClothingModal, setShowAddClothingModal] = useState(false);
  const [isProcessingItem, setIsProcessingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clothingUploadState, setClothingUploadState] = useState<ClothingUploadState | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ClothingCategory>('all');
  const [editingAvatar, setEditingAvatar] = useState<Avatar | null>(null);
  const [editingClothing, setEditingClothing] = useState<ClothingItem | null>(null);

  const allFilters = useMemo(() => {
    const filters: {
      colors: Set<string>, fabrics: Set<string>,
      patterns: Set<string>, styles: Set<string>,
      customTags: Set<string>,
    } = {
      colors: new Set<string>(), fabrics: new Set<string>(),
      patterns: new Set<string>(), styles: new Set<string>(),
      customTags: new Set<string>(),
    };
    clothing.forEach(item => {
      item.colors?.forEach(c => filters.colors.add(c));
      item.fabrics?.forEach(f => filters.fabrics.add(f));
      item.patterns?.forEach(p => filters.patterns.add(p));
      item.styles?.forEach(s => filters.styles.add(s));
      item.customTags?.forEach(t => filters.customTags.add(t));
    });
    return {
      colors: Array.from(filters.colors).sort(), fabrics: Array.from(filters.fabrics).sort(),
      patterns: Array.from(filters.patterns).sort(), styles: Array.from(filters.styles).sort(),
      customTags: Array.from(filters.customTags).sort(),
    };
  }, [clothing]);

  const [activeFilters, setActiveFilters] = useState<Record<keyof AllFilters, string[]>>({
    colors: [], fabrics: [], patterns: [], styles: [], customTags: [],
  });

  const handleFilterToggle = (category: keyof AllFilters, value: string) => {
    setActiveFilters(prev => {
        const currentCategoryFilters = prev[category];
        const newCategoryFilters = currentCategoryFilters.includes(value)
            ? currentCategoryFilters.filter(item => item !== value)
            : [...currentCategoryFilters, value];
        return { ...prev, [category]: newCategoryFilters };
    });
  };
  
  const clearFilters = () => {
    setActiveFilters({ colors: [], fabrics: [], patterns: [], styles: [], customTags: [] });
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const filteredClothing = useMemo(() => {
    const hasActiveTagFilters = Object.values(activeFilters).some((arr: string[]) => arr.length > 0);
    if (!searchTerm && !hasActiveTagFilters && categoryFilter === 'all') return clothing;

    return clothing.filter(item => {
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
      if (!categoryMatch) return false;
      
      const nameMatch = searchTerm ? item.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      if (!nameMatch) return false;

      // FIX: Add explicit type `(keyof AllFilters)[]` to resolve type inference issue.
      for (const category of Object.keys(activeFilters) as (keyof AllFilters)[]) {
        const selected = activeFilters[category];
        if (selected.length === 0) continue;
        // FIX: The previous type assertion for `item[category]` was too broad and included non-array types, causing an error on `.includes()`.
        // By removing the cast, `item[category]` is correctly typed as `string[]` since `category` must be a key of `AllFilters`.
        const itemTags = item[category] || [];
        const tagMatch = selected.some(filterTag => itemTags.includes(filterTag));
        if (!tagMatch) return false;
      }
      return true;
    });
  }, [clothing, searchTerm, activeFilters, categoryFilter]);

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
    }
    event.target.value = '';
  };
  
  const handleClothingFileSelect = (event: React.ChangeEvent<HTMLInputElement>, category: ClothingCategory) => {
    const file = event.target.files?.[0];
    if (file) {
      setClothingUploadState({
        step: 'cropping',
        file,
        category,
        originalName: file.name.split('.').slice(0, -1).join('.') || '',
      });
      setShowAddClothingModal(false);
    }
    event.target.value = '';
  };

  const handleCreateClothing = async (
    details: {
      name: string;
      description: string;
      tags: string[];
      process: boolean;
      sizeSystem?: SizeSystem;
      alphaSize?: AlphaSize;
      numericSize?: NumericSize;
      shoeSize?: UKShoeSize;
    }
  ) => {
    if (!clothingUploadState || !clothingUploadState.imageDataUrl || !clothingUploadState.category) return;
    const { imageDataUrl, category } = clothingUploadState;
  
    setIsProcessingItem(true);
    setError(null);
  
    try {
      const { imageDataUrl: finalImageDataUrl, analysis } = await geminiService.processClothingItem(imageDataUrl, category, details.description, details.process);
      
      const newClothingItem: ClothingItem = {
        id: `clothing-${Date.now()}`,
        name: details.name,
        imageDataUrl: finalImageDataUrl,
        category,
        description: details.description || undefined,
        colors: analysis.colors,
        fabrics: analysis.fabrics,
        patterns: analysis.patterns,
        styles: analysis.styles,
        customTags: details.tags,
        sizeSystem: details.sizeSystem,
        alphaSize: details.alphaSize,
        numericSize: details.numericSize,
        shoeSize: details.shoeSize,
      };
      await storageService.addClothing(newClothingItem);
      onDataChange();
      setClothingUploadState(null);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unexpected error occurred while processing the clothing item.");
      }
      setClothingUploadState(null);
    } finally {
      setIsProcessingItem(false);
    }
  };
  
  const handleUpdateAvatar = async (updatedAvatar: Avatar) => {
    try {
        await storageService.addAvatar(updatedAvatar); // addAvatar uses 'put' which updates if key exists
        onDataChange();
        setEditingAvatar(null);
    } catch (error) {
        console.error("Failed to update avatar:", error);
        setError("Could not save avatar changes.");
    }
  };
  
    const handleUpdateClothing = async (updatedItem: ClothingItem) => {
    try {
      await storageService.addClothing(updatedItem); // This will update the item
      onDataChange();
      setEditingClothing(null);
    } catch (error) {
      console.error("Failed to update clothing item:", error);
      setError("Could not save clothing changes.");
    }
  };

  const clothingByCategory = filteredClothing.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<ClothingCategory, ClothingItem[]>);

  const AddClothingModal: React.FC = () => {
    const fileInputRefs = useRef<{[key in ClothingCategory]?: HTMLInputElement | null}>({});

    return (
      <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
        <div className="bg-panel rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <h3 className="text-2xl font-bold mb-6 text-text-primary">Add New Clothing Item</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {CLOTHING_CATEGORIES.map(category => (
                <div key={category}>
                    <input type="file" accept="image/*" className="hidden" ref={el => { fileInputRefs.current[category] = el; }} onChange={(e) => handleClothingFileSelect(e, category)} />
                    <button onClick={() => fileInputRefs.current[category]?.click()} className="w-full h-24 bg-bg-secondary border-2 border-dashed border-border-color rounded-lg flex flex-col items-center justify-center text-text-secondary hover:bg-border-color hover:border-brand-primary hover:text-brand-primary transition-all duration-200">
                        <UploadIcon className="h-6 w-6 mb-1"/>
                        <span className="font-semibold">{category}</span>
                    </button>
                </div>
            ))}
          </div>
          <button onClick={() => setShowAddClothingModal(false)} className="mt-6 w-full bg-brand-secondary hover:bg-brand-primary text-text-on-dark font-bold py-3 px-4 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    )
  };

  const categoryFilterOptions: ('all' | ClothingCategory)[] = ['all', ...CLOTHING_CATEGORIES];

  return (
    <div className="absolute inset-0 bg-bg-secondary z-20 flex flex-col">
       {clothingUploadState?.step === 'cropping' && clothingUploadState.file && (
            <ImageCropperModal
                file={clothingUploadState.file}
                onCrop={(croppedDataUrl) => {
                    setClothingUploadState(prev => prev ? { ...prev, step: 'naming', imageDataUrl: croppedDataUrl, file: undefined } : null);
                }}
                onClose={() => setClothingUploadState(null)}
                aspectRatio={1}
            />
        )}
       {clothingUploadState?.step === 'naming' && (
        <NameInputModal
          title={`Add New ${clothingUploadState.category}`}
          category={clothingUploadState.category}
          initialValue={clothingUploadState.originalName}
          onSave={handleCreateClothing}
          onClose={() => setClothingUploadState(null)}
          showDescription={true}
          descriptionLabel="Describe the item to help the AI isolate it"
          showTags={true}
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
      {editingAvatar && (
        <AvatarEditModal
            avatar={editingAvatar}
            onSave={handleUpdateAvatar}
            onClose={() => setEditingAvatar(null)}
        />
      )}
      {editingClothing && (
        <ClothingEditModal
            item={editingClothing}
            onSave={handleUpdateClothing}
            onClose={() => setEditingClothing(null)}
        />
      )}
      
      <header className="p-4 sm:p-6 lg:p-8 flex-shrink-0 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-text-primary">My Wardrobe</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-border-color">
          <XIcon className="h-6 w-6 text-text-secondary"/>
        </button>
      </header>
      
      <div className="px-4 sm:px-6 lg:px-8 flex-1 overflow-y-auto pb-8">
        {error && <div className="mb-4 text-red-700 text-center bg-red-100 p-3 rounded-lg shadow-sm">{error}</div>}
        <div className="border-b border-border-color">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setTab('clothing')} className={`${tab === 'clothing' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg`}>
              Clothing
            </button>
            <button onClick={() => setTab('avatars')} className={`${tab === 'avatars' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg`}>
              Avatars
            </button>
          </nav>
        </div>

        {tab === 'avatars' && (
          <section className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {avatars.map(avatar => (
                  <div key={avatar.id} className="relative group/avatar">
                    <ItemCard item={avatar} objectFit="contain" />
                     <div className="text-center text-xs text-text-secondary mt-2 truncate">
                        {(avatar.chest || avatar.waist) ? (
                            <>
                                {avatar.chest && `C: ${avatar.chest}"`}
                                {avatar.chest && avatar.waist && ' / '}
                                {avatar.waist && `W: ${avatar.waist}"`}
                            </>
                        ) : (
                             <span className="opacity-0 group-hover/avatar:opacity-100 transition-opacity">No measurements</span>
                        )}
                    </div>
                    <button 
                        onClick={() => setEditingAvatar(avatar)}
                        className="absolute top-0 right-0 bg-white/80 backdrop-blur-sm p-1.5 rounded-bl-lg rounded-tr-sm opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 hover:bg-white"
                        aria-label={`Edit ${avatar.name}`}
                        title={`Edit ${avatar.name}`}
                    >
                        <EditIcon className="h-4 w-4 text-text-secondary"/>
                    </button>
                  </div>
              ))}
               <label className="aspect-square bg-panel rounded-lg flex flex-col items-center justify-center text-text-secondary transition-all duration-300 hover:bg-border-color hover:text-brand-primary cursor-pointer border-2 border-dashed border-border-color hover:border-brand-primary">
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
          <section className="mt-6">
            <div className="flex justify-end mb-4">
                <button onClick={() => setShowAddClothingModal(true)} className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-5 rounded-full inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <PlusIcon className="h-5 w-5"/>
                    Add Clothing
                </button>
            </div>

            <div className="mb-4 border-b border-border-color">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {categoryFilterOptions.map(category => (
                        <button 
                            key={category}
                            onClick={() => setCategoryFilter(category)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${categoryFilter === category ? 'bg-brand-primary text-white' : 'bg-bg-primary text-text-primary hover:bg-bg-secondary'}`}
                        >
                           {category === 'all' ? 'All' : category}
                        </button>
                    ))}
                </div>
            </div>
            
            {clothing.length > 0 && <FilterPanel 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                activeFilters={activeFilters}
                allFilters={allFilters}
                handleFilterToggle={handleFilterToggle}
                clearFilters={clearFilters}
            />}

            <div className="space-y-8">
              {Object.values(ClothingCategory).map(category => (
                (clothingByCategory[category] && clothingByCategory[category].length > 0) && (
                  <div key={category}>
                    <h3 className="text-xl font-semibold mb-3 text-text-secondary">{category}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {clothingByCategory[category].map(item => <ItemCard key={item.id} item={item} objectFit="contain" onEdit={() => setEditingClothing(item)} />)}
                    </div>
                  </div>
                )
              ))}
               {filteredClothing.length === 0 && (
                 <div className="text-center py-16 bg-panel rounded-lg shadow-sm">
                    <p className="text-text-secondary text-lg">
                        {clothing.length === 0 ? "Your wardrobe is empty." : "No items match your filters."}
                    </p>
                    <p className="text-text-secondary">
                        {clothing.length === 0 ? "Click \"Add Clothing\" to get started!" : "Try clearing some filters to see more."}
                    </p>
                 </div>
               )}
            </div>
          </section>
        )}
      </div>
      {showAddClothingModal && <AddClothingModal/>}
    </div>
  );
}