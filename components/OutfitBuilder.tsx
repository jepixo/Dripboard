import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Avatar, ClothingItem, Outfit } from '../types';
import { ClothingCategory } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { Loader } from './Loader';
import { NameInputModal } from './NameInputModal';
import { AvatarCreationModal } from './AvatarCreationModal';
import { SaveIcon, SparklesIcon, PlusIcon, ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

interface OutfitBuilderProps {
  avatars: Avatar[];
  clothing: ClothingItem[];
  outfits: Outfit[];
  onDataChange: () => void;
  storageError: string | null;
}

const OUTFIT_LAYERS: { name: string; categories: ClothingCategory[] }[] = [
  { name: 'Headwear', categories: [ClothingCategory.HEAD] },
  { name: 'Tops', categories: [ClothingCategory.UPPER_BODY_BASE, ClothingCategory.UPPER_BODY_OVER] },
  { name: 'Bottoms', categories: [ClothingCategory.LOWER_BODY] },
  { name: 'Footwear', categories: [ClothingCategory.FEET] },
  { name: 'Accessories', categories: [
    ClothingCategory.ACCESSORY_FACE,
    ClothingCategory.ACCESSORY_HAND,
    ClothingCategory.ACCESSORY_HIP,
  ]},
];

interface ClothingNamingState {
    file: File;
    layer: (typeof OUTFIT_LAYERS)[0];
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function OutfitBuilder({ avatars, clothing, outfits, onDataChange, storageError }: OutfitBuilderProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(avatars.length > 0 ? avatars[0] : null);
  const [currentOutfit, setCurrentOutfit] = useState<Partial<Record<ClothingCategory, ClothingItem>>>({});
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNamingOutfit, setIsNamingOutfit] = useState(false);
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [outfitError, setOutfitError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeLayer, setActiveLayer] = useState<(typeof OUTFIT_LAYERS)[0] | null>(null);
  const [lastGeneratedOutfit, setLastGeneratedOutfit] = useState<Partial<Record<ClothingCategory, ClothingItem>> | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // State for adding new clothing items
  const [clothingNamingState, setClothingNamingState] = useState<ClothingNamingState | null>(null);
  const [isProcessingClothing, setIsProcessingClothing] = useState(false);
  const [clothingProcessingError, setClothingProcessingError] = useState<string | null>(null);

  // New state for UI control
  const [isAvatarSectionOpen, setIsAvatarSectionOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<'avatar' | 'clothing'>('avatar');
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsAvatarDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);


  const handleItemSelect = (item: ClothingItem, layer: (typeof OUTFIT_LAYERS)[0]) => {
    setCurrentOutfit(prev => {
      const newOutfit = { ...prev };
      layer.categories.forEach(cat => {
        if(newOutfit[cat]) delete newOutfit[cat];
      });

      const currentItemInCategory = prev[item.category];
      
      if (currentItemInCategory?.id !== item.id) {
         newOutfit[item.category] = item;
      }
      
      return newOutfit;
    });
  };

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setAvatarFile(event.target.files[0]);
    }
    event.target.value = '';
  };

  const handleClothingFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && activeLayer) {
      setClothingNamingState({ file: event.target.files[0], layer: activeLayer });
    }
    event.target.value = '';
  };

  const handleCreateClothing = async (name: string, description: string, process: boolean) => {
      if (!clothingNamingState) return;
      const { file, layer } = clothingNamingState;

      setIsProcessingClothing(true);
      setClothingProcessingError(null);
      try {
          const sourceImageDataUrl = await fileToDataUrl(file);
          const category = layer.categories[0];
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
          setClothingNamingState(null);
          handleItemSelect(newClothingItem, layer);
      } catch (e: any) {
          setClothingProcessingError(e.message || 'Failed to process item.');
      } finally {
          setIsProcessingClothing(false);
      }
  };


  const getOutfitSignature = (avatar: Avatar, outfit: Partial<Record<ClothingCategory, ClothingItem>>) => {
      const itemIds = Object.values(outfit).filter((item): item is ClothingItem => !!item).map(item => item.id).sort().join(',');
      return `${avatar.id}:${itemIds}`;
  };

  const handleGenerateOutfit = async () => {
    if (!selectedAvatar) {
      setOutfitError("Please select an avatar first.");
      return;
    }
    if (Object.keys(currentOutfit).length === 0) {
      setOutfitError("Please select at least one clothing item.");
      return;
    }
    setOutfitError(null);
    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const currentSignature = getOutfitSignature(selectedAvatar, currentOutfit);
      const existingOutfit = outfits.find(o => {
          const avatarForOutfit = avatars.find(a => a.id === o.avatarId);
          if (!avatarForOutfit) return false;
          return getOutfitSignature(avatarForOutfit, o.items) === currentSignature;
      });

      if (existingOutfit) {
        setGeneratedImage(existingOutfit.generatedImageUrl);
        setLastGeneratedOutfit(currentOutfit);
      } else {
        const imageUrl = await geminiService.generateOutfitImage(selectedAvatar, currentOutfit);
        setGeneratedImage(imageUrl);
        setLastGeneratedOutfit(currentOutfit);
      }
    } catch (e: any)      {
      setOutfitError(e.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveOutfit = () => {
    if (!generatedImage || !selectedAvatar) return;
    setIsNamingOutfit(true);
  };

  const confirmSaveOutfit = async (name: string) => {
    if (!generatedImage || !selectedAvatar || !name) return;
    
    setIsSavingOutfit(true);
    try {
        const newOutfit: Outfit = {
            id: `outfit-${Date.now()}`,
            name,
            avatarId: selectedAvatar.id,
            items: currentOutfit,
            generatedImageUrl: generatedImage,
            createdAt: new Date().toISOString(),
        };
        await storageService.addOutfit(newOutfit);
        onDataChange();
        setCurrentOutfit({});
        setGeneratedImage(null);
        setLastGeneratedOutfit(null);
    } catch (error) {
        console.error("Failed to save outfit", error);
        setOutfitError("There was a problem saving your outfit.");
    } finally {
        setIsSavingOutfit(false);
        setIsNamingOutfit(false);
    }
  };

  const isOutfitUnchanged = useMemo(() => {
    if (!lastGeneratedOutfit) return false;
    const currentKeys = Object.keys(currentOutfit).sort();
    const lastKeys = Object.keys(lastGeneratedOutfit).sort();
    if (currentKeys.length !== lastKeys.length) return false;
    if (currentKeys.join(',') !== lastKeys.join(',')) return false;
    return currentKeys.every(key => currentOutfit[key as ClothingCategory]?.id === lastGeneratedOutfit[key as ClothingCategory]?.id);
  }, [currentOutfit, lastGeneratedOutfit]);
  
  const renderOutfitBuilderPreview = () => {
    if (isLoading) {
      return <Loader text="Generating your look..." />;
    }
    if (generatedImage) {
      return <img src={generatedImage} alt="Generated outfit" className="w-full h-full object-cover" />;
    }
    if (selectedAvatar) {
      return <img src={selectedAvatar.imageDataUrl} alt={selectedAvatar.name} className="w-full h-full object-cover" />;
    }
    return <div className="text-center text-brand-text-secondary p-8">Please select an avatar to begin styling.</div>;
  };

  const renderDesktopClothingContent = () => {
    if(activeLayer) {
        const itemsForLayer = clothing.filter(item => activeLayer.categories.includes(item.category));
        const selectedItem = Object.values(currentOutfit).find((item: ClothingItem | undefined): item is ClothingItem => !!item && activeLayer.categories.includes(item.category));
        return (
            <>
                {clothingProcessingError && <div className="mb-4 text-red-700 text-center bg-red-100 p-3 rounded-lg">{clothingProcessingError}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <div
                        onClick={() => clothingInputRef.current?.click()}
                        className="cursor-pointer aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-brand-text-secondary hover:bg-gray-100 hover:border-brand-primary hover:text-brand-primary transition-all duration-300"
                    >
                        <input type="file" accept="image/*" className="hidden" ref={clothingInputRef} onChange={handleClothingFileChange} />
                        <PlusIcon className="h-8 w-8"/>
                        <span className="mt-2 text-sm font-semibold text-center">Add New</span>
                    </div>

                    {itemsForLayer.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item, activeLayer)}
                        className={`cursor-pointer rounded-2xl overflow-hidden ring-4 ring-offset-2 transition-all duration-200 ${selectedItem?.id === item.id ? 'ring-brand-primary scale-105 shadow-lg' : 'ring-transparent hover:ring-gray-300'}`}
                      >
                        <img src={item.imageDataUrl} alt={item.name} className="w-full h-full object-cover aspect-square" />
                      </div>
                    ))}
                </div>
            </>
        )
    }

    return (
        <div className="space-y-4">
            {OUTFIT_LAYERS.map(layer => {
                const selectedItem = Object.values(currentOutfit).find((item: ClothingItem | undefined): item is ClothingItem => !!item && layer.categories.includes(item.category));
                return (
                    <div key={layer.name}>
                        <h3 className="text-sm font-semibold text-brand-text-secondary mb-2">{layer.name}</h3>
                        <button 
                            onClick={() => setActiveLayer(layer)} 
                            className="w-full h-28 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-brand-primary transition-all duration-300 overflow-hidden group p-2"
                            aria-label={`Select ${layer.name}`}
                        >
                            {selectedItem ? (
                                <img src={selectedItem.imageDataUrl} alt={selectedItem.name} className="w-full h-full object-contain transition-transform group-hover:scale-105"/>
                            ) : (
                                <PlusIcon className="h-8 w-8 text-gray-400 group-hover:text-brand-primary"/>
                            )}
                        </button>
                    </div>
                )
            })}
        </div>
    );
  }

  const renderMobileClothingContent = () => {
    if(activeLayer) {
        const itemsForLayer = clothing.filter(item => activeLayer.categories.includes(item.category));
        const selectedItem = Object.values(currentOutfit).find((item: ClothingItem | undefined): item is ClothingItem => !!item && activeLayer.categories.includes(item.category));
        return (
          <div className="flex gap-3 overflow-x-auto pb-3 -mb-3 h-full items-center">
             <button onClick={() => setActiveLayer(null)} className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gray-100 flex flex-col items-center justify-center text-brand-text-secondary hover:bg-gray-200">
                <ChevronLeftIcon className="h-8 w-8"/>
                <span className="text-sm font-semibold">Back</span>
             </button>
             <div onClick={() => clothingInputRef.current?.click()} className="cursor-pointer flex-shrink-0 w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-brand-text-secondary hover:bg-gray-100 hover:border-brand-primary">
                <PlusIcon className="h-8 w-8"/>
                <span className="text-sm font-semibold">Add New</span>
             </div>
             <input type="file" accept="image/*" className="hidden" ref={clothingInputRef} onChange={handleClothingFileChange} />
             {itemsForLayer.map(item => (
                <div key={item.id} onClick={() => handleItemSelect(item, activeLayer)} className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-offset-2 transition-all ${selectedItem?.id === item.id ? 'ring-brand-primary' : 'ring-transparent'}`}>
                    <img src={item.imageDataUrl} alt={item.name} className="w-full h-full object-cover"/>
                </div>
             ))}
          </div>
        );
    }

    return (
        <div className="flex gap-3 overflow-x-auto pb-3 -mb-3 h-full items-center">
            {OUTFIT_LAYERS.map(layer => {
                const selectedItem = Object.values(currentOutfit).find((item: ClothingItem | undefined): item is ClothingItem => !!item && layer.categories.includes(item.category));
                return (
                    <button key={layer.name} onClick={() => setActiveLayer(layer)} className="flex-shrink-0 w-32 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-brand-text-secondary hover:bg-gray-100 hover:border-brand-primary overflow-hidden p-1">
                       {selectedItem ? (
                           <img src={selectedItem.imageDataUrl} alt={selectedItem.name} className="w-full h-full object-contain"/>
                       ) : (
                        <>
                           <PlusIcon className="h-6 w-6 mb-1"/>
                           <span className="text-sm font-semibold">{layer.name}</span>
                        </>
                       )}
                    </button>
                )
            })}
        </div>
    );
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-6 h-full">
      {/* Preview Panel (Canvas) */}
      <div className="flex-1 flex flex-col justify-start md:justify-center items-center gap-4 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="hidden md:block text-center">
            <h1 className="text-3xl font-bold text-brand-text-primary">Dripolar</h1>
            <p className="text-brand-text-secondary">Outfit Builder</p>
        </div>
        
        {/* Polaroid Container */}
        <div className="w-full max-w-md flex items-center justify-center">
            <div className="bg-brand-surface p-4 pb-16 shadow-xl transform -rotate-2 transition-transform duration-300 ease-in-out hover:rotate-1 hover:scale-105 rounded-md w-full">
                <div className="w-full bg-gray-100 aspect-square flex items-center justify-center overflow-hidden rounded-sm">
                    {renderOutfitBuilderPreview()}
                </div>
            </div>
        </div>
        
        <div className="w-full max-w-md">
            {storageError && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-3 rounded-lg shadow-sm mb-4" role="alert">
                  <p className="font-bold">Storage Error</p>
                  <p>{storageError}</p>
              </div>
            )}
            
            {outfitError && <div className="text-red-700 text-center bg-red-100 p-3 rounded-lg mb-4">{outfitError}</div>}

            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleGenerateOutfit} disabled={isLoading || !selectedAvatar || Object.keys(currentOutfit).length === 0 || isOutfitUnchanged} className="flex-1 bg-brand-primary hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-0.5">
                    <SparklesIcon className="h-6 w-6"/>
                    <span className="text-lg">{isLoading ? 'Generating...' : 'Generate Outfit'}</span>
                </button>
                {generatedImage && (
                    <button onClick={handleSaveOutfit} className="flex-1 bg-brand-secondary hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <SaveIcon className="h-6 w-6"/>
                        <span className="text-lg">Save Outfit</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Controls Panel (Right on Desktop, Bottom on Mobile) */}
      <div className="w-full md:w-80 bg-brand-surface md:shadow-lg flex flex-col md:px-6 md:py-8 rounded-t-2xl shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] p-4 pt-2">
        {/* --- Desktop Controls --- */}
        <div className="hidden md:flex flex-col gap-4 flex-1 min-h-0">
            {/* Collapsible Avatar Section */}
            <div>
                <button onClick={() => setIsAvatarSectionOpen(!isAvatarSectionOpen)} className="w-full flex justify-between items-center text-left py-2 group">
                    <h2 className="text-xl font-bold text-brand-text-primary">Avatar</h2>
                    {isAvatarSectionOpen
                        ? <ChevronUpIcon className="h-6 w-6 text-brand-text-secondary group-hover:text-brand-text-primary"/>
                        : <ChevronDownIcon className="h-6 w-6 text-brand-text-secondary group-hover:text-brand-text-primary"/>}
                </button>
                {isAvatarSectionOpen && (
                    <div className="mt-4 space-y-4">
                       <div className="relative" ref={dropdownRef}>
                          <button
                              onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                              className="w-full bg-brand-surface border border-gray-300 rounded-lg shadow-sm py-3 px-4 flex justify-between items-center text-left focus:outline-none focus:ring-2 focus:ring-brand-primary"
                              disabled={isLoading}
                              aria-haspopup="listbox"
                              aria-expanded={isAvatarDropdownOpen}
                          >
                              <span className="text-brand-text-primary truncate">
                                  {selectedAvatar ? selectedAvatar.name : 'Choose an Avatar'}
                              </span>
                              <ChevronDownIcon className="h-5 w-5 text-brand-text-secondary" />
                          </button>
                          {isAvatarDropdownOpen && (
                              <div className="absolute z-10 top-full mt-2 w-full bg-brand-surface rounded-lg shadow-lg border border-gray-200">
                                  <ul className="py-1 max-h-60 overflow-y-auto" role="listbox">
                                      {avatars.map(avatar => (
                                          <li key={avatar.id} role="option" aria-selected={selectedAvatar?.id === avatar.id}>
                                              <button
                                                  onClick={() => {
                                                      setSelectedAvatar(avatar);
                                                      setIsAvatarDropdownOpen(false);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-brand-text-primary hover:bg-gray-100"
                                              >
                                                  {avatar.name}
                                              </button>
                                          </li>
                                      ))}
                                      <li>
                                          <button
                                              onClick={() => {
                                                  avatarInputRef.current?.click();
                                                  setIsAvatarDropdownOpen(false);
                                              }}
                                              className="w-full text-left px-4 py-2 text-brand-primary font-semibold hover:bg-gray-100 border-t border-gray-200"
                                          >
                                              + Create New
                                          </button>
                                      </li>
                                  </ul>
                              </div>
                          )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarFileSelect} />
                        {selectedAvatar && (
                            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                                <img src={selectedAvatar.imageDataUrl} alt={selectedAvatar.name} className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <hr className="border-gray-200" />
            
            {/* Clothing Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center flex-shrink-0">
                    {activeLayer && (
                        <button onClick={() => setActiveLayer(null)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100">
                            <ChevronLeftIcon className="h-6 w-6 text-brand-text-secondary"/>
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-brand-text-primary">{activeLayer ? `Select ${activeLayer.name}` : 'Clothing'}</h2>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 -mr-3 mt-4">
                    {renderDesktopClothingContent()}
                </div>
            </div>
        </div>

        {/* --- Mobile Controls --- */}
        <div className="md:hidden">
            <div className="flex justify-center border-b border-gray-200 -mx-4 px-4">
                 <button onClick={() => setMobileTab('avatar')} className={`py-2 px-6 font-semibold transition-all ${mobileTab === 'avatar' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Avatar</button>
                 <button onClick={() => setMobileTab('clothing')} className={`py-2 px-6 font-semibold transition-all ${mobileTab === 'clothing' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Clothing</button>
            </div>
            <div className="mt-4 h-32">
                {mobileTab === 'avatar' && (
                     <div className="flex gap-3 overflow-x-auto pb-3 -mb-3 h-full items-center">
                         <div onClick={() => avatarInputRef.current?.click()} className="cursor-pointer flex-shrink-0 w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-brand-text-secondary hover:bg-gray-100 hover:border-brand-primary">
                             <PlusIcon className="h-8 w-8"/>
                             <span className="text-sm font-semibold">Add New</span>
                         </div>
                         <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarFileSelect} />
                         {avatars.map(avatar => (
                             <div key={avatar.id} onClick={() => setSelectedAvatar(avatar)} className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-offset-2 transition-all ${selectedAvatar?.id === avatar.id ? 'ring-brand-primary' : 'ring-transparent'}`}>
                                 <img src={avatar.imageDataUrl} alt={avatar.name} className="w-full h-full object-cover"/>
                             </div>
                         ))}
                     </div>
                )}
                 {mobileTab === 'clothing' && renderMobileClothingContent()}
            </div>
        </div>
      </div>
      
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
          initialValue={`My Outfit ${outfits.length + 1}`}
          onSave={(name, _) => confirmSaveOutfit(name)}
          onClose={() => setIsNamingOutfit(false)}
          isSaving={isSavingOutfit}
          saveLabel="Save Outfit"
        />
      )}
      {clothingNamingState && (
         <NameInputModal
            title={`Add New ${clothingNamingState.layer.name}`}
            initialValue={clothingNamingState.file.name.split('.').slice(0, -1).join('.') || ''}
            onSave={handleCreateClothing}
            onClose={() => setClothingNamingState(null)}
            showDescription={true}
            descriptionLabel="Describe the item to help the AI isolate it"
            isSaving={isProcessingClothing}
        />
      )}
    </div>
  );
}