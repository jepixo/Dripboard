import React from 'react';
import type { Outfit, Avatar, ClothingItem } from '../types';
import { ItemCard } from './ItemCard';
import { XIcon } from './Icons';

interface LooksProps {
  outfits: Outfit[];
  avatars: Avatar[];
  clothing: ClothingItem[];
  onClose: () => void;
}

export function Looks({ outfits, avatars, clothing, onClose }: LooksProps) {
  const findAvatar = (avatarId: string) => avatars.find(a => a.id === avatarId);

  return (
    <div className="absolute inset-0 bg-bg-secondary z-20 flex flex-col">
        <header className="p-4 sm:p-6 lg:p-8 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-text-primary">My Looks</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-border-color">
                <XIcon className="h-6 w-6 text-text-secondary"/>
            </button>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 flex-1 overflow-y-auto pb-8">
            {outfits.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center py-16 bg-panel rounded-lg shadow-sm p-8">
                        <h2 className="text-3xl font-bold mb-2 text-text-primary">No Looks Saved Yet</h2>
                        <p className="text-text-secondary text-lg">Go to the Dripboard to create and save your first look!</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {outfits.map(outfit => {
                    const avatar = findAvatar(outfit.avatarId);
                    const outfitItems = Object.values(outfit.items).flat().filter(Boolean) as ClothingItem[];

                    return (
                        <div key={outfit.id} className="bg-panel rounded-lg p-4 flex flex-col space-y-4 border border-border-color shadow-sm hover:shadow-xl transition-shadow duration-300">
                        <h3 className="text-xl font-bold text-text-primary truncate">{outfit.name}</h3>
                        
                        <div className="aspect-square bg-bg-secondary rounded-md overflow-hidden">
                            <img src={outfit.generatedImageUrl} alt={`Generated look for ${outfit.name}`} className="w-full h-full object-contain" />
                        </div>

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

                        </div>
                    );
                    })}
                </div>
            )}
        </div>
    </div>
  );
}