import React, { useMemo } from 'react';
import type { StoredItem } from '../types';
import { EditIcon } from './Icons';

interface ItemCardProps {
  item: StoredItem;
  isSelected?: boolean;
  objectFit?: 'contain' | 'cover';
  onEdit?: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, isSelected = false, objectFit = 'cover', onEdit }) => {
  const stableRotation = useMemo(() => {
    // A simple hash function to get a number from the string ID
    const hash = item.id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    // Generate a stable, small rotation between -2.5 and 2.5 degrees
    const rotation = (hash % 50) / 10 - 2.5; 
    return `rotate(${rotation}deg)`;
  }, [item.id]);

  return (
    <div className="text-center group/card">
        <div 
            className={`bg-white p-2 rounded-sm shadow-lg relative border border-black/10 transition-all duration-200 ease-in-out group-hover/card:scale-105 group-hover/card:shadow-xl group-hover/card:z-10 ${isSelected ? 'ring-2 ring-offset-2 ring-brand-primary' : ''}`}
            style={{ transform: stableRotation }}
        >
            <div className="aspect-square bg-bg-secondary overflow-hidden rounded-sm flex items-center justify-center">
                <img 
                    src={item.imageDataUrl} 
                    alt={item.name} 
                    className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'} transition-transform duration-300 group-hover/card:scale-110`}
                />
            </div>
            {onEdit && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="absolute top-0 right-0 bg-white/80 backdrop-blur-sm p-1.5 rounded-bl-lg rounded-tr-sm opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 hover:bg-white z-20"
                    aria-label={`Edit ${item.name}`}
                    title={`Edit ${item.name}`}
                >
                    <EditIcon className="h-4 w-4 text-text-secondary"/>
                </button>
            )}
        </div>
        <p className="text-sm text-text-secondary font-medium truncate mt-3 px-1">
            {item.name}
        </p>
    </div>
  );
};
