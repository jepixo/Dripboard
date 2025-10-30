
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Avatar, ClothingItem, Outfit, SizeSystem, AlphaSize, NumericSize, UKShoeSize } from '../types';
import { ClothingCategory, CLOTHING_CATEGORIES } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { Loader } from './Loader';
import { NameInputModal } from './NameInputModal';
import { AvatarCreationModal } from './AvatarCreationModal';
import { ImageCropperModal } from './ImageCropperModal';
import { PlusIcon, DropdownIndicatorIcon, HeadwearIcon, EyewearIcon, TopIcon, BottomIcon, FootwearIcon, AccessoriesIcon, ArrowPathIcon, ChevronLeftIcon, ChevronDownIcon } from './Icons';
import { ItemCard } from './ItemCard';

interface ClothingUploadState {
  step: 'cropping' | 'naming';
  file?: File;
  category: ClothingCategory;
  imageDataUrl?: string;
  originalName: string;
}

interface OutfitBuilderProps {
  avatars: Avatar[];
  clothing: ClothingItem[];
  outfits: Outfit[];
  onDataChange: () => void;
  storageError: string | null;
}

const ClothingSlot = ({ category, icon, onClick, selectedItems = [] }: { category: ClothingCategory, icon: React.ReactNode, onClick: () => void, selectedItems?: ClothingItem[] }) => (
    <div className="flex flex-col items-center gap-1">
      <button 
        onClick={onClick} 
        aria-label={`Select ${category}`}
        className="w-full aspect-[4/3] bg-transparent rounded-lg border-2 border-dashed border-border-color flex items-center justify-center p-1 overflow-hidden transition-all hover:border-brand-primary hover:bg-bg-secondary/50 relative group"
      >
        {selectedItems.length > 0 ? (
          <>
            <img src={selectedItems[selectedItems.length-1].imageDataUrl} alt={selectedItems[selectedItems.length-1].name} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold text-center p-1">Change</span>
            </div>
             {selectedItems.length > 1 && (
                <div className="absolute top-1 left-1 bg-brand-primary text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm">
                    {selectedItems.length}
                </div>
            )}
          </>
        ) : (
          <>
            <PlusIcon className="h-6 w-6 text-text-secondary/70" />
            <div className="absolute top-1 right-1 h-5 w-5 text-text-primary">{icon}</div>
          </>
        )}
      </button>
      <span className="text-xs font-semibold text-text-secondary">{category}</span>
    </div>
);

const ItemPicker = ({ category, items, onItemSelect, onBack, onFileSelected, selectedIds }: { category: ClothingCategory, items: ClothingItem[], onItemSelect: (item: ClothingItem) => void, onBack: () => void, onFileSelected: (file: File) => void, selectedIds: string[] }) => {
  const itemsForCategory = items.filter(item => item.category === category);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full h-full bg-panel flex flex-col">
        <header className="flex-shrink-0 p-4 border-b border-border-color flex items-center gap-4">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-bg-secondary">
                <ChevronLeftIcon className="h-6 w-6 text-text-secondary" />
            </button>
            <h3 className="text-xl font-bold">{category}</h3>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && e.target.files[0] && onFileSelected(e.target.files[0])}/>
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-bg-secondary rounded-lg flex flex-col items-center justify-center text-text-secondary transition-all duration-300 hover:bg-border-color hover:text-brand-primary cursor-pointer border-2 border-dashed border-border-color hover:border-brand-primary">
                    <PlusIcon className="h-8 w-8"/>
                    <span className="mt-2 text-sm font-semibold">Add New</span>
                </button>

                {itemsForCategory.map(item => (
                    <button key={item.id} onClick={() => onItemSelect(item)} className="block w-full text-left">
                       <ItemCard item={item} isSelected={selectedIds.includes(item.id)} />
                    </button>
                ))}
            </div>
            {itemsForCategory.length === 0 && (
                 <div className="col-span-3 text-center pt-10 text-text-secondary">
                    <p>No items found for {category}.</p>
                    <p className="text-sm mt-1">Click "Add New" to upload one.</p>
                </div>
            )}
        </div>
    </div>
  )
}


export function OutfitBuilder({ avatars, clothing, outfits, onDataChange, storageError }: OutfitBuilderProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [currentOutfit, setCurrentOutfit] = useState<Partial<Record<ClothingCategory, ClothingItem[]>>>({});
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNamingOutfit, setIsNamingOutfit] = useState(false);
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [outfitError, setOutfitError] = useState<string | null>(null);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [selectedGenerationModel, setSelectedGenerationModel] = useState<'gemini-2.5-flash-image' | 'gemini-2.0-flash-preview-image-generation'>('gemini-2.5-flash-image');
  const [outfitForSaving, setOutfitForSaving] = useState<Partial<Record<ClothingCategory, ClothingItem[]>> | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  
  const [clothingUploadState, setClothingUploadState] = useState<ClothingUploadState | null>(null);
  const [isProcessingClothing, setIsProcessingClothing] = useState(false);

  useEffect(() => {
    if (avatars.length > 0 && !selectedAvatar) {
        setSelectedAvatar(avatars[0]);
    }
    if (avatars.length === 0) {
      setSelectedAvatar(null);
    }
  }, [avatars, selectedAvatar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedInsideDesktop = desktopDropdownRef.current && desktopDropdownRef.current.contains(target);
        const clickedInsideMobile = mobileDropdownRef.current && mobileDropdownRef.current.contains(target);

        if (!clickedInsideDesktop && !clickedInsideMobile) {
            setIsAvatarDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemSelect = (item: ClothingItem) => {
    setCurrentOutfit(prev => {
      const newOutfit = { ...prev };
      const categoryItems = newOutfit[item.category] || [];
      const itemIndex = categoryItems.findIndex(i => i.id === item.id);
      
      if (itemIndex > -1) {
        // Item exists, remove it
        newOutfit[item.category] = categoryItems.filter(i => i.id !== item.id);
      } else {
        // Item doesn't exist, add it
        newOutfit[item.category] = [...categoryItems, item];
      }
      return newOutfit;
    });
  };

  const handleClothingFileSelected = (file: File) => {
    if (activeCategory) {
        setClothingUploadState({
            step: 'cropping',
            file,
            category: activeCategory,
            originalName: file.name.split('.').slice(0, -1).join('.') || ''
        });
    }
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

    setIsProcessingClothing(true);
    setOutfitError(null);

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
            setOutfitError(e.message);
        } else {
            setOutfitError("An unexpected error occurred while processing the clothing item.");
        }
        setClothingUploadState(null);
    } finally {
        setIsProcessingClothing(false);
    }
  };


  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setAvatarFile(event.target.files[0]);
    }
    event.target.value = '';
  };

  const getOutfitSignature = (avatar: Avatar, outfit: Partial<Record<ClothingCategory, ClothingItem[]>>) => {
      const itemIds = Object.values(outfit).flat().filter((item): item is ClothingItem => !!item).map(item => item.id).sort().join(',');
      return `${avatar.id}:${itemIds}`;
  };
  
  const isOutfitEmpty = useMemo(() => {
    // FIX: Add explicit type `ClothingItem[] | undefined` to `items` to resolve type inference issue.
    return Object.values(currentOutfit).every((items: ClothingItem[] | undefined) => items === undefined || items.length === 0);
  }, [currentOutfit]);

  const handleGenerateOutfit = async () => {
    if (!selectedAvatar) {
      setOutfitError("Please select an avatar first.");
      return;
    }
    if (isOutfitEmpty) {
      setOutfitError("Please select at least one clothing item.");
      return;
    }
    setOutfitError(null);
    setIsLoading(true);
    setGeneratedImage(null);
    setOutfitForSaving(null);

    try {
      const outfitToGenerate = JSON.parse(JSON.stringify(currentOutfit));
      const imageUrl = await geminiService.generateOutfitImage(selectedAvatar, outfitToGenerate, additionalPrompt, selectedGenerationModel);
      setGeneratedImage(imageUrl);
      setOutfitForSaving(outfitToGenerate);
    } catch (e) {
      // FIX: The caught error `e` is of type `unknown`. We must check if it's an instance of `Error` before accessing `e.message` to avoid runtime errors.
      if (e instanceof Error) {
        setOutfitError(e.message);
      } else {
        setOutfitError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSaveOutfit = async (name: string) => {
    if (!generatedImage || !selectedAvatar || !name || !outfitForSaving) return;
    
    setIsSavingOutfit(true);
    try {
        const newOutfit: Outfit = {
            id: `outfit-${Date.now()}`,
            name,
            avatarId: selectedAvatar.id,
            items: outfitForSaving,
            generatedImageUrl: generatedImage,
            createdAt: new Date().toISOString(),
        };
        await storageService.addOutfit(newOutfit);
        onDataChange();
        setCurrentOutfit({});
        setGeneratedImage(null);
        setOutfitForSaving(null);
    } catch (error) {
        console.error("Failed to save outfit", error);
        setOutfitError("There was a problem saving your outfit.");
    } finally {
        setIsSavingOutfit(false);
        setIsNamingOutfit(false);
    }
  };
  
  const renderPolaroid = () => (
     <div className="w-full max-w-sm md:max-w-md lg:max-w-lg relative lg:group lg:cursor-pointer">
        <div className="absolute bg-white/60 w-[98%] h-[98%] top-[1%] left-[1%] rounded-sm shadow-lg transform -rotate-6 lg:-rotate-3 lg:transition-transform lg:duration-300 lg:ease-in-out lg:group-hover:rotate-0" />
        <div className="absolute bg-white/80 w-[98%] h-[98%] top-[1%] left-[1%] rounded-sm shadow-xl transform rotate-2 lg:transition-transform lg:duration-300 lg:ease-in-out lg:group-hover:rotate-0" />
        <div className="bg-white p-3 pb-12 lg:p-4 shadow-2xl rounded-sm w-full relative z-10 lg:transition-transform lg:duration-300 lg:ease-in-out lg:group-hover:scale-105">
            <div className="w-full bg-bg-secondary aspect-square flex items-center justify-center overflow-hidden rounded-sm">
                {isLoading && <Loader text="Generating your look..." />}
                {!isLoading && generatedImage && <img src={generatedImage} alt="Generated outfit" className="max-w-full max-h-full object-contain" />}
                {!isLoading && !generatedImage && selectedAvatar && <img src={selectedAvatar.imageDataUrl} alt={selectedAvatar.name} className="max-w-full max-h-full object-contain" />}
                {!isLoading && !generatedImage && !selectedAvatar && (
                  <div className="text-center text-text-secondary p-8">
                      <p className="font-semibold">No Avatar Selected</p>
                      <p className="text-sm">Please create or select an avatar to begin.</p>
                  </div>
                )}
            </div>
        </div>
    </div>
  )

  const renderMainControls = () => (
    <div className="w-full h-full bg-panel lg:border-l border-border-color flex flex-col p-4 md:p-6">
        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            {/* Avatar Section */}
            <div className="flex-shrink-0">
              {avatars.length > 0 ? (
                <div className="relative pb-8">
                    <div className="flex justify-between items-end pb-4 border-b border-border-color">
                        <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-bold">Avatar</h2>
                            <div className="relative" ref={desktopDropdownRef}>
                                <button
                                    onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                                    className="text-text-primary disabled:text-text-secondary/50"
                                    disabled={isLoading}
                                >
                                    <DropdownIndicatorIcon className="h-5" />
                                </button>
                                {isAvatarDropdownOpen && (
                                    <div className="absolute z-30 top-full left-0 mt-2 w-48 bg-panel rounded-md shadow-lg border border-border-color">
                                        <ul className="py-1 max-h-60 overflow-y-auto" role="listbox">
                                            {avatars.map(avatar => (
                                                <li key={avatar.id}><button onClick={() => { setSelectedAvatar(avatar); setIsAvatarDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary">{avatar.name}</button></li>
                                            ))}
                                            <li><button onClick={() => { avatarInputRef.current?.click(); setIsAvatarDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-brand-primary font-semibold hover:bg-bg-secondary border-t border-border-color">+ Create New</button></li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-24 z-10 overflow-visible">
                        <div className="bg-white p-2 shadow-lg rounded-sm transform -rotate-2">
                            <div 
                            className="w-full bg-bg-secondary aspect-square"
                            role="img"
                            aria-label={selectedAvatar ? selectedAvatar.name : "No avatar selected"}
                            style={selectedAvatar ? {
                                backgroundImage: `url(${selectedAvatar.imageDataUrl})`,
                                backgroundSize: 'contain',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                            } : {}}
                            />
                        </div>
                    </div>

                </div>
                ) : (
                    <div className="text-center p-4 py-8 border-b border-border-color bg-bg-secondary rounded-lg">
                        <h2 className="text-2xl font-bold mb-2">Create an Avatar</h2>
                        <p className="text-text-secondary mb-4 text-sm">You need an avatar to start building outfits.</p>
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            className="w-full bg-brand-primary text-text-on-dark font-bold py-3 rounded-lg hover:bg-brand-secondary transition-colors"
                        >
                            + Add Your First Avatar
                        </button>
                    </div>
                )}
                <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarFileSelect} />
            </div>
            
            {/* Clothing Section */}
            <div className={`flex flex-col min-h-0 transition-opacity mt-6 ${!selectedAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="text-xl font-bold flex-shrink-0">Clothing</h2>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <ClothingSlot category={ClothingCategory.HEADWEAR} icon={<HeadwearIcon />} onClick={() => setActiveCategory(ClothingCategory.HEADWEAR)} selectedItems={currentOutfit[ClothingCategory.HEADWEAR]} />
                    <ClothingSlot category={ClothingCategory.EYEWEAR} icon={<EyewearIcon />} onClick={() => setActiveCategory(ClothingCategory.EYEWEAR)} selectedItems={currentOutfit[ClothingCategory.EYEWEAR]} />
                    <ClothingSlot category={ClothingCategory.TOP} icon={<TopIcon />} onClick={() => setActiveCategory(ClothingCategory.TOP)} selectedItems={currentOutfit[ClothingCategory.TOP]} />
                    <ClothingSlot category={ClothingCategory.BOTTOM} icon={<BottomIcon />} onClick={() => setActiveCategory(ClothingCategory.BOTTOM)} selectedItems={currentOutfit[ClothingCategory.BOTTOM]} />
                    <ClothingSlot category={ClothingCategory.FOOTWEAR} icon={<FootwearIcon />} onClick={() => setActiveCategory(ClothingCategory.FOOTWEAR)} selectedItems={currentOutfit[ClothingCategory.FOOTWEAR]} />
                    <ClothingSlot category={ClothingCategory.ACCESSORIES} icon={<AccessoriesIcon />} onClick={() => setActiveCategory(ClothingCategory.ACCESSORIES)} selectedItems={currentOutfit[ClothingCategory.ACCESSORIES]} />
                </div>
            </div>
        </div>
        
        {/* Sticky Bottom Controls */}
        <div className="flex-shrink-0 flex flex-col gap-4 pt-4 mt-4 border-t border-border-color">
            <div className={`${!selectedAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                <label htmlFor="generation-model" className="block text-sm font-medium text-text-secondary">
                    Generation Model
                </label>
                <select
                    id="generation-model"
                    value={selectedGenerationModel}
                    onChange={(e) => setSelectedGenerationModel(e.target.value as 'gemini-2.5-flash-image' | 'gemini-2.0-flash-preview-image-generation')}
                    className="mt-1 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    disabled={isLoading}
                >
                    <option value="gemini-2.5-flash-image">2.5-flash-image</option>
                    <option value="gemini-2.0-flash-preview-image-generation">gemini-2.0-flash-preview-image-generation</option>
                </select>
            </div>
            <div className={`${!selectedAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                <label htmlFor="additional-prompt" className="block text-sm font-medium text-text-secondary">
                    Additional Instructions <span className="text-text-secondary/80">(Optional)</span>
                </label>
                <textarea
                    id="additional-prompt"
                    rows={3}
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    placeholder="e.g., 'tuck the shirt in', 'wear the jacket open'"
                    className="mt-1 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    disabled={isLoading}
                />
            </div>

            <div className="flex flex-col gap-2">
                {generatedImage ? (
                    <>
                        <button onClick={() => setIsNamingOutfit(true)} className="w-full bg-brand-primary text-text-on-dark font-bold py-3 rounded-lg hover:bg-brand-secondary transition-colors">
                            Save Look
                        </button>
                        <button onClick={handleGenerateOutfit} disabled={isLoading} className="w-full text-sm flex items-center justify-center gap-2 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50">
                             <ArrowPathIcon className="h-4 w-4" />
                            Generate Again
                        </button>
                    </>
                ) : (
                    <button onClick={handleGenerateOutfit} disabled={isLoading || !selectedAvatar || isOutfitEmpty} className="w-full bg-brand-primary text-text-on-dark font-bold py-3 rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                )}
                <button onClick={() => { setCurrentOutfit({}); setGeneratedImage(null); setOutfitForSaving(null); }} disabled={isLoading} className="w-full text-sm flex items-center justify-center gap-2 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50">
                    <ArrowPathIcon className="h-4 w-4" />
                    Clear Outfit
                </button>
            </div>
        </div>
    </div>
  );
  
  const renderItemDrawer = () => {
    if (!activeCategory) return null;
    const itemsForCategory = clothing.filter(item => item.category === activeCategory);
    
    return (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setActiveCategory(null)}>
            <div className="absolute bottom-0 left-0 right-0 bg-panel rounded-t-2xl p-4 flex flex-col max-h-[40%]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 flex-shrink-0">{activeCategory}</h3>
                {itemsForCategory.length > 0 ? (
                    <div className="flex-1 overflow-x-auto">
                        <div className="flex gap-3 h-full items-center pb-2">
                            {itemsForCategory.map(item => (
                                <button key={item.id} onClick={() => handleItemSelect(item)} className="h-28 w-28 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer ring-4 ring-offset-2 ring-transparent focus:ring-brand-primary outline-none">
                                    <img src={item.imageDataUrl} alt={item.name} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-secondary">
                      <p>No items in this category. Add some from the Wardrobe!</p>
                    </div>
                )}
            </div>
        </div>
    );
  };
  
  return (
    <div className="w-full h-full bg-bg-secondary lg:bg-transparent overflow-hidden">
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
            isSaving={isProcessingClothing}
            />
        )}

      {/* --- DESKTOP VIEW --- */}
      <div className="hidden lg:flex w-full h-full flex-row">
          <div className="flex-1 bg-bg-secondary min-h-0 relative">
            <h1 className="text-5xl font-bold text-text-primary tracking-normal absolute top-8 left-8 z-20">Dripboard</h1>
            <div className="w-full h-full flex items-center justify-center p-8">
              {renderPolaroid()}
            </div>
             {outfitError && <div className="absolute bottom-8 left-8 right-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-20 text-center">{outfitError}</div>}
          </div>
          <div className="w-80 xl:w-96 flex-shrink-0 h-full">
            {activeCategory ? (
                <ItemPicker 
                    category={activeCategory}
                    items={clothing}
                    onItemSelect={handleItemSelect}
                    onBack={() => setActiveCategory(null)}
                    onFileSelected={handleClothingFileSelected}
                    selectedIds={currentOutfit[activeCategory]?.map(item => item.id) || []}
                />
            ) : (
                renderMainControls()
            )}
          </div>
      </div>
      
      {/* --- MOBILE VIEW --- */}
       <div className="lg:hidden w-full h-full flex flex-col p-4 overflow-y-auto">
            <div className="flex-1 flex items-center justify-center relative my-6">
                {renderPolaroid()}
            </div>
             <div className="flex-shrink-0 pt-6">
                
                {/* Avatar Section */}
                {avatars.length > 0 ? (
                    <div className="relative text-center mb-8">
                        <div className="relative" ref={mobileDropdownRef}>
                            <button
                                onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                                className="inline-flex items-center justify-center gap-2 text-text-primary"
                                disabled={isLoading}
                                aria-haspopup="true"
                                aria-expanded={isAvatarDropdownOpen}
                            >
                                <span className="text-xs">●</span>
                                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isAvatarDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isAvatarDropdownOpen && (
                                <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-panel rounded-md shadow-lg border border-border-color">
                                    <ul className="py-1 max-h-60 overflow-y-auto" role="listbox">
                                        {avatars.map(avatar => (
                                            <li key={avatar.id}><button onClick={() => { setSelectedAvatar(avatar); setIsAvatarDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary">{avatar.name}</button></li>
                                        ))}
                                        <li><button onClick={() => { avatarInputRef.current?.click(); setIsAvatarDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-brand-primary font-semibold hover:bg-bg-secondary border-t border-border-color">+ Create New</button></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        <h2 className="text-5xl font-black mt-1">Avatar</h2>
                        {selectedAvatar && <p className="text-text-secondary mt-1">{selectedAvatar.name}</p>}
                    </div>
                ) : (
                    <div className="w-full text-center mb-8">
                        <h2 className="text-3xl font-bold mb-2">Avatar</h2>
                        <p className="text-text-secondary text-sm mb-4">Create an avatar to start.</p>
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            className="w-full bg-brand-primary text-text-on-dark font-bold py-3 rounded-lg hover:bg-brand-secondary transition-colors"
                        >
                            + Add Avatar
                        </button>
                    </div>
                )}
                <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarFileSelect} />

                {/* Clothing Section */}
                <div>
                    <h2 className="text-xl font-bold text-center mb-4">Clothing</h2>
                    <div className={`grid grid-cols-3 gap-3 transition-opacity ${!selectedAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                        <ClothingSlot category={ClothingCategory.HEADWEAR} icon={<HeadwearIcon />} onClick={() => setActiveCategory(ClothingCategory.HEADWEAR)} selectedItems={currentOutfit[ClothingCategory.HEADWEAR]} />
                        <ClothingSlot category={ClothingCategory.EYEWEAR} icon={<EyewearIcon />} onClick={() => setActiveCategory(ClothingCategory.EYEWEAR)} selectedItems={currentOutfit[ClothingCategory.EYEWEAR]} />
                        <ClothingSlot category={ClothingCategory.TOP} icon={<TopIcon />} onClick={() => setActiveCategory(ClothingCategory.TOP)} selectedItems={currentOutfit[ClothingCategory.TOP]} />
                        <ClothingSlot category={ClothingCategory.BOTTOM} icon={<BottomIcon />} onClick={() => setActiveCategory(ClothingCategory.BOTTOM)} selectedItems={currentOutfit[ClothingCategory.BOTTOM]} />
                        <ClothingSlot category={ClothingCategory.FOOTWEAR} icon={<FootwearIcon />} onClick={() => setActiveCategory(ClothingCategory.FOOTWEAR)} selectedItems={currentOutfit[ClothingCategory.FOOTWEAR]} />
                        <ClothingSlot category={ClothingCategory.ACCESSORIES} icon={<AccessoriesIcon />} onClick={() => setActiveCategory(ClothingCategory.ACCESSORIES)} selectedItems={currentOutfit[ClothingCategory.ACCESSORIES]} />
                    </div>
                </div>
                
                <div className={`mt-6 transition-opacity ${!selectedAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="mb-4">
                        <label htmlFor="generation-model-mobile" className="block text-sm font-medium text-text-secondary">
                            Generation Model
                        </label>
                        <select
                            id="generation-model-mobile"
                            value={selectedGenerationModel}
                            onChange={(e) => setSelectedGenerationModel(e.target.value as 'gemini-2.5-flash-image' | 'gemini-2.0-flash-preview-image-generation')}
                            className="mt-1 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            disabled={isLoading}
                        >
                            <option value="gemini-2.5-flash-image">2.5-flash-image</option>
                            <option value="gemini-2.0-flash-preview-image-generation">gemini-2.0-flash-preview-image-generation</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="additional-prompt-mobile" className="block text-sm font-medium text-text-secondary">
                            Additional Instructions <span className="text-text-secondary/80">(Optional)</span>
                        </label>
                        <textarea
                            id="additional-prompt-mobile"
                            rows={2}
                            value={additionalPrompt}
                            onChange={(e) => setAdditionalPrompt(e.target.value)}
                            placeholder="e.g., 'tuck the shirt in'"
                            className="mt-1 block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            disabled={isLoading}
                        />
                    </div>
                </div>
                {outfitError && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center text-sm">{outfitError}</div>}
                <div className="mt-6 flex flex-col gap-2">
                    {generatedImage ? (
                        <>
                            <button onClick={() => setIsNamingOutfit(true)} className="w-full bg-brand-primary text-text-on-dark font-bold py-3 rounded-lg hover:bg-brand-secondary transition-colors">
                                Save Look
                            </button>
                            <button onClick={handleGenerateOutfit} disabled={isLoading} className="w-full text-sm flex items-center justify-center gap-2 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50">
                                <ArrowPathIcon className="h-4 w-4" />
                                Generate Again
                            </button>
                        </>
                    ) : (
                        <button onClick={handleGenerateOutfit} disabled={isLoading || !selectedAvatar || isOutfitEmpty} className="w-full bg-brand-primary text-text-on-dark font-bold py-3 rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    )}
                    <button onClick={() => { setCurrentOutfit({}); setGeneratedImage(null); setOutfitForSaving(null); }} disabled={isLoading} className="w-full text-sm flex items-center justify-center gap-2 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50">
                        <ArrowPathIcon className="h-4 w-4" />
                        Clear Outfit
                    </button>
                </div>
            </div>
       </div>

      {renderItemDrawer()}
      {avatarFile && (
        <AvatarCreationModal
            file={avatarFile}
            onClose={() => setAvatarFile(null)}
            onComplete={(newAvatar) => {
                onDataChange();
                setSelectedAvatar(newAvatar);
                setGeneratedImage(null);
                setAvatarFile(null);
            }}
        />
      )}
      {isNamingOutfit && (
        <NameInputModal
          title="Name Your Outfit"
          initialValue={`My Look ${outfits.length + 1}`}
          onSave={(details) => confirmSaveOutfit(details.name)}
          onClose={() => setIsNamingOutfit(false)}
          isSaving={isSavingOutfit}
          saveLabel="Save Outfit"
        />
      )}
    </div>
  );
}
