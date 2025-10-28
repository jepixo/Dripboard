import React from 'react';
import type { Outfit, Avatar, ClothingItem } from '../types';
import { ItemCard } from './ItemCard';

interface LooksProps {
  outfits: Outfit[];
  avatars: Avatar[];
  clothing: ClothingItem[];
}

export function Looks({ outfits, avatars, clothing }: LooksProps) {

  if (outfits.length === 0) {
    return (
      <div className="text-center py-16 bg-brand-surface rounded-2xl shadow-lg">
        <h2 className="text-3xl font-bold mb-2 text-brand-text-primary">No Looks Saved Yet</h2>
        <p className="text-brand-text-secondary text-lg">Go to the Outfit Builder to create and save your first look!</p>
      </div>
    );
  }

  const findAvatar = (avatarId: string) => avatars.find(a => a.id === avatarId);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-brand-text-primary">My Looks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {outfits.map(outfit => {
          const avatar = findAvatar(outfit.avatarId);
          const outfitItems = Object.values(outfit.items).filter(Boolean) as ClothingItem[];

          return (
            <div key={outfit.id} className="bg-brand-surface rounded-2xl p-4 flex flex-col space-y-4 shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-brand-text-primary truncate">{outfit.name}</h3>
              
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <img src={outfit.generatedImageUrl} alt={`Generated look for ${outfit.name}`} className="w-full h-full object-cover" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-brand-text-secondary mb-2 uppercase tracking-wider">Components Used:</h4>
                <div className="flex flex-wrap gap-2">
                  {avatar && (
                    <div className="w-16 h-16">
                        <ItemCard item={avatar} />
                    </div>
                  )}
                  {outfitItems.map(item => (
                    <div key={item.id} className="w-16 h-16">
                        <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}