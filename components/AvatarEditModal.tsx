import React, { useState, useEffect } from 'react';
import type { Avatar } from '../types';

interface AvatarEditModalProps {
  avatar: Avatar;
  onSave: (updatedAvatar: Avatar) => void;
  onClose: () => void;
}

export const AvatarEditModal: React.FC<AvatarEditModalProps> = ({ avatar, onSave, onClose }) => {
  const [name, setName] = useState(avatar.name);
  const [chest, setChest] = useState(avatar.chest?.toString() || '');
  const [waist, setWaist] = useState(avatar.waist?.toString() || '');

  useEffect(() => {
    setName(avatar.name);
    setChest(avatar.chest?.toString() || '');
    setWaist(avatar.waist?.toString() || '');
  }, [avatar]);

  const handleSave = () => {
    if (!name.trim()) return;

    const updatedAvatar: Avatar = {
      ...avatar,
      name: name.trim(),
      chest: chest ? parseFloat(chest) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
    };
    onSave(updatedAvatar);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-panel rounded-lg p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4 text-text-primary">Edit Avatar</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="avatar-name" className="block text-sm font-medium text-text-secondary mb-1">Avatar Name</label>
            <input
              id="avatar-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="avatar-chest" className="block text-sm font-medium text-text-secondary mb-1">Chest Size (in.)</label>
              <input
                id="avatar-chest"
                type="number"
                value={chest}
                placeholder="e.g., 40"
                onChange={(e) => setChest(e.target.value)}
                className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label htmlFor="avatar-waist" className="block text-sm font-medium text-text-secondary mb-1">Waist Size (in.)</label>
              <input
                id="avatar-waist"
                type="number"
                value={waist}
                placeholder="e.g., 32"
                onChange={(e) => setWaist(e.target.value)}
                className="block w-full bg-bg-secondary border-border-color rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>
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