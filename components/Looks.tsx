import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Outfit, Avatar, ClothingItem } from '../types';
import { ItemCard } from './ItemCard';
import { ImageCropperModal } from './ImageCropperModal';
import { storageService } from '../services/storageService';
import { XIcon, SparklesIcon, EditIcon, PlusIcon } from './Icons';

// Sub-component for editing/creating a look
const LookEditorModal = ({ lookToEdit, avatars, clothing, onSave, onClose, onDelete }: {
    lookToEdit?: Outfit;
    avatars: Avatar[];
    clothing: ClothingItem[];
    onSave: (outfit: Outfit) => void;
    onClose: () => void;
    onDelete: (outfitId: string) => void;
}) => {
    const isCreating = !lookToEdit;
    const [name, setName] = useState(lookToEdit?.name || '');
    const [imageUrl, setImageUrl] = useState(lookToEdit?.imageUrl || '');
    const [selectedAvatarId, setSelectedAvatarId] = useState(lookToEdit?.avatarId || '');
    
    const initialItemIds = useMemo(() => {
        if (!lookToEdit?.items) return [];
        return Object.values(lookToEdit.items).flat().filter(Boolean).map(item => (item as ClothingItem).id);
    }, [lookToEdit]);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>(initialItemIds);
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (!name || !imageUrl) return;

        const clothingItems = clothing.filter(c => selectedItemIds.includes(c.id));
        const itemsByCategory = clothingItems.reduce((acc, item) => {
            (acc[item.category] = acc[item.category] || []).push(item);
            return acc;
        }, {} as Record<string, ClothingItem[]>);

        const newLook: Outfit = {
            id: lookToEdit?.id || `outfit-${Date.now()}`,
            name,
            imageUrl,
            createdAt: lookToEdit?.createdAt || new Date().toISOString(),
            type: 'custom',
            avatarId: selectedAvatarId || undefined,
            items: itemsByCategory,
        };
        onSave(newLook);
    };

    const handleDelete = () => {
        if (lookToEdit && window.confirm(`Are you sure you want to delete "${lookToEdit.name}"?`)) {
            onDelete(lookToEdit.id);
        }
    };

    const toggleClothingSelection = (itemId: string) => {
        setSelectedItemIds(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    if (isCreating && !imageFile && !imageUrl) {
        return (
            <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-panel rounded-lg p-6 w-full max-w-sm text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4">Create Custom Look</h3>
                    <p className="text-text-secondary mb-6">Upload a photo of an outfit to get started.</p>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setImageFile(e.target.files[0])}/>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-3 px-4 rounded-lg transition-colors">
                        Upload Image
                    </button>
                     <button onClick={onClose} className="mt-3 text-text-secondary hover:text-text-primary text-sm font-semibold">
                        Cancel
                     </button>
                </div>
            </div>
        );
    }

    if (imageFile) {
        return <ImageCropperModal
            file={imageFile}
            onCrop={(croppedDataUrl) => {
                setImageUrl(croppedDataUrl);
                setImageFile(null);
            }}
            onClose={() => setImageFile(null)}
            aspectRatio={1}
        />
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-panel rounded-lg w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border-color flex-shrink-0">
                    <h2 className="text-xl font-bold">{isCreating ? 'Create Custom Look' : 'Edit Look'}</h2>
                </header>

                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    {/* Left: Image Preview */}
                    <div className="w-full md:w-1/2 p-4 flex flex-col items-center gap-4 border-b md:border-b-0 md:border-r border-border-color">
                         <div className="w-full aspect-square bg-bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                            {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-contain" /> : <span className="text-text-secondary">No image</span>}
                         </div>
                         <button onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-brand-primary hover:underline">
                            Change Image
                         </button>
                         <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setImageFile(e.target.files[0])}/>
                    </div>

                    {/* Right: Details & Components */}
                    <div className="w-full md:w-1/2 p-4 flex flex-col gap-4 overflow-y-auto">
                         <div>
                            <label htmlFor="look-name" className="block text-sm font-medium text-text-secondary mb-1">Look Name</label>
                            <input id="look-name" type="text" value={name} onChange={e => setName(e.target.value)}
                                className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                placeholder="e.g., Summer Casual"
                            />
                        </div>

                        <div>
                            <h4 className="font-semibold text-text-primary mb-2">Avatar</h4>
                            <div className="grid grid-cols-4 gap-3">
                                {avatars.map(avatar => (
                                    <button key={avatar.id} onClick={() => setSelectedAvatarId(avatar.id === selectedAvatarId ? '' : avatar.id)}>
                                        <ItemCard item={avatar} isSelected={avatar.id === selectedAvatarId} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-text-primary mb-2">Clothing Items</h4>
                            <div className="grid grid-cols-4 gap-3">
                                 {clothing.map(c => (
                                    <button key={c.id} onClick={() => toggleClothingSelection(c.id)}>
                                        <ItemCard item={c} isSelected={selectedItemIds.includes(c.id)} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-border-color flex-shrink-0 flex justify-between items-center">
                    <div>
                        {!isCreating && (
                            <button onClick={handleDelete} className="text-red-600 hover:text-red-800 font-semibold text-sm">Delete Look</button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="bg-bg-secondary hover:bg-border-color text-text-primary font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
                        <button onClick={handleSave} className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50" disabled={!name || !imageUrl}>Save</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};


interface LooksProps {
  outfits: Outfit[];
  avatars: Avatar[];
  clothing: ClothingItem[];
  onClose: () => void;
  onDataChange: () => void; // Add this prop
}

export function Looks({ outfits, avatars, clothing, onClose, onDataChange }: LooksProps) {
  const [editingLook, setEditingLook] = useState<Outfit | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const findAvatar = (avatarId?: string) => avatars.find(a => a.id === avatarId);

  const handleSaveLook = async (look: Outfit) => {
    try {
        if (outfits.some(o => o.id === look.id)) {
            await storageService.updateOutfit(look);
        } else {
            await storageService.addOutfit(look);
        }
        onDataChange();
        setEditingLook(null);
        setIsCreating(false);
    } catch(error) {
        console.error("Failed to save look:", error);
        alert("Could not save the look. Please try again.");
    }
  };
  
  const handleDeleteLook = async (lookId: string) => {
    try {
        await storageService.deleteOutfit(lookId);
        onDataChange();
        setEditingLook(null);
    } catch(error) {
        console.error("Failed to delete look:", error);
        alert("Could not delete the look. Please try again.");
    }
  };

  return (
    <div className="absolute inset-0 bg-bg-secondary z-20 flex flex-col">
        {(isCreating || editingLook) && (
            <LookEditorModal
                lookToEdit={editingLook ?? undefined}
                avatars={avatars}
                clothing={clothing}
                onSave={handleSaveLook}
                onDelete={handleDeleteLook}
                onClose={() => { setEditingLook(null); setIsCreating(false); }}
            />
        )}
        <header className="p-4 sm:p-6 lg:p-8 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-text-primary">My Looks</h2>
            <div className="flex items-center gap-4">
                 <button onClick={() => setIsCreating(true)} className="bg-brand-primary hover:bg-brand-secondary text-text-on-dark font-bold py-2 px-5 rounded-full inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <PlusIcon className="h-5 w-5"/>
                    Add Custom Look
                </button>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-border-color">
                    <XIcon className="h-6 w-6 text-text-secondary"/>
                </button>
            </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 flex-1 overflow-y-auto pb-8">
            {outfits.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center py-16 bg-panel rounded-lg shadow-sm p-8">
                        <h2 className="text-3xl font-bold mb-2 text-text-primary">No Looks Saved Yet</h2>
                        <p className="text-text-secondary text-lg">Create an AI-generated look or add your own custom one!</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {outfits.map(outfit => {
                    const avatar = findAvatar(outfit.avatarId);
                    const outfitItems = Object.values(outfit.items || {}).flat().filter(Boolean) as ClothingItem[];

                    return (
                        <div key={outfit.id} className="bg-panel rounded-lg p-4 flex flex-col space-y-4 border border-border-color shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-text-primary truncate pr-2">{outfit.name}</h3>
                                {/* FIX: The `title` prop is not a valid SVG attribute in React's SVG types. The correct way to add a title for accessibility and tooltips is to include a <title> element as a child of the SVG. */}
                                {outfit.type === 'generated' && <SparklesIcon className="h-5 w-5 text-yellow-500 flex-shrink-0"><title>AI Generated</title></SparklesIcon>}
                            </div>
                        
                            <div className="aspect-square bg-bg-secondary rounded-md overflow-hidden relative">
                                <img src={outfit.imageUrl} alt={`Generated look for ${outfit.name}`} className="w-full h-full object-contain" />
                                <button onClick={() => setEditingLook(outfit)} className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white z-10" aria-label={`Edit ${outfit.name}`}>
                                    <EditIcon className="h-5 w-5 text-text-secondary"/>
                                </button>
                            </div>

                            {(avatar || outfitItems.length > 0) && (
                                <div>
                                    <h4 className="text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wider">Components:</h4>
                                    <div className="flex flex-wrap gap-4">
                                    {avatar && (
                                        <div className="w-20">
                                            <ItemCard item={avatar} />
                                        </div>
                                    )}
                                    {outfitItems.map(item => (
                                        <div key={item.id} className="w-20">
                                            <ItemCard item={item} />
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                    })}
                </div>
            )}
        </div>
    </div>
  );
}