import React from 'react';
import type { StoredItem } from '../types';

interface ItemCardProps {
  item: StoredItem;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  return (
    <div className="bg-brand-surface rounded-2xl overflow-hidden group relative shadow-md hover:shadow-xl transition-all duration-300">
      <img src={item.imageDataUrl} alt={item.name} className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-center">
        <p className="text-xs text-white font-semibold truncate transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0">
          {item.name}
        </p>
      </div>
    </div>
  );
};