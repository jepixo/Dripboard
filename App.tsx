import React, { useState, useEffect } from 'react';
import { Wardrobe } from './components/Wardrobe';
import { OutfitBuilder } from './components/OutfitBuilder';
import { Looks } from './components/Looks';
import { LoginScreen } from './components/LoginScreen';
import { storageService } from './services/storageService';
import type { User, Avatar, ClothingItem, Outfit } from './types';
import { DripolarLogo, WardrobeIcon, OutfitIcon, LooksIcon } from './components/Icons';

export default function App() {
  const [user, setUser] = useState<User | null>(() => storageService.getUser());
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [clothing, setClothing] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [view, setView] = useState<'wardrobe' | 'builder' | 'looks'>('builder');
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    if (!storageService.isStorageAvailable()) {
      setStorageError("Persistent storage (IndexedDB) is unavailable. Your avatars and clothing will not be saved. This can happen in private browsing mode or if your browser's data storage settings are too restrictive.");
      return;
    }

    const loadData = async () => {
      try {
        const [avatarsData, clothingData, outfitsData] = await Promise.all([
          storageService.getAvatars(),
          storageService.getClothing(),
          storageService.getOutfits(),
        ]);
        setAvatars(avatarsData);
        setClothing(clothingData);
        setOutfits(outfitsData);
      } catch (error) {
        console.error("Failed to load data from storage:", error);
        setStorageError("Could not load your saved data. Your browser's storage might be corrupted or inaccessible.");
      }
    };
    
    loadData();
  }, []);

  const refreshData = async () => {
    try {
      const [avatarsData, clothingData, outfitsData] = await Promise.all([
        storageService.getAvatars(),
        storageService.getClothing(),
        storageService.getOutfits(),
      ]);
      setAvatars(avatarsData);
      setClothing(clothingData);
      setOutfits(outfitsData);
    } catch (error) {
      console.error("Failed to refresh data:", error);
      setStorageError("There was an issue refreshing your data.");
    }
  };
  
  const handleLogin = (newUser: User) => {
    storageService.saveUser(newUser);
    setUser(newUser);
  };
  
  const handleLogout = () => {
    storageService.removeUser();
    setUser(null);
  };
  
  const geometricBgStyle = {
      backgroundImage: 'radial-gradient(#DDE1E6 0.5px, transparent 0.5px)',
      backgroundSize: '15px 15px',
  };
  
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen bg-brand-bg text-brand-text-primary flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-24 bg-brand-surface p-2 flex md:flex-col items-center justify-around md:justify-start md:py-8 gap-6 border-b-2 md:border-b-0 md:border-r-2 border-gray-100">
        <div className="hidden md:block mb-4">
          <DripolarLogo className="h-12 w-12 text-brand-primary" />
        </div>
        <button
          onClick={() => setView('builder')}
          className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 ${view === 'builder' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-text-secondary hover:bg-gray-100'}`}
          aria-label="Outfit Builder"
          title="Outfit Builder"
        >
          <OutfitIcon className="h-7 w-7" />
        </button>
        <button
          onClick={() => setView('wardrobe')}
          className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 ${view === 'wardrobe' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-text-secondary hover:bg-gray-100'}`}
          aria-label="Wardrobe"
          title="Wardrobe"
        >
          <WardrobeIcon className="h-7 w-7" />
        </button>
        <button
          onClick={() => setView('looks')}
          className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 ${view === 'looks' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-text-secondary hover:bg-gray-100'}`}
          aria-label="My Looks"
          title="My Looks"
        >
          <LooksIcon className="h-7 w-7" />
        </button>
      </nav>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden flex flex-col ${view === 'builder' ? '' : 'p-4 sm:p-6 lg:p-8'}`} style={geometricBgStyle}>
        {view !== 'builder' && (
          <header className="mb-8 flex justify-between items-center flex-shrink-0">
            <div>
              <h1 className="text-4xl font-bold text-brand-text-primary flex items-center gap-3">
                <DripolarLogo className="h-10 w-10 text-brand-primary md:hidden" />
                Dripolar
              </h1>
              <p className="text-brand-text-secondary text-lg">Welcome, {user.name}</p>
            </div>
            {user.name !== 'Guest' && (
              <button 
                onClick={handleLogout}
                className="font-semibold text-brand-text-secondary hover:text-brand-primary transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Sign Out
              </button>
            )}
          </header>
        )}
        
        {storageError && view !== 'builder' && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg shadow-md flex-shrink-0" role="alert">
                <p className="font-bold">Storage Error</p>
                <p>{storageError}</p>
            </div>
        )}
        <div className={`flex-1 min-h-0 ${view !== 'builder' ? 'overflow-y-auto' : ''}`}>
            <div className={view === 'wardrobe' ? 'block' : 'hidden'}>
              <Wardrobe 
                avatars={avatars} 
                clothing={clothing} 
                onDataChange={refreshData} 
              />
            </div>
            <div className={view === 'builder' ? 'block h-full' : 'hidden'}>
              <OutfitBuilder 
                avatars={avatars}
                clothing={clothing}
                outfits={outfits}
                onDataChange={refreshData}
                storageError={storageError}
              />
            </div>
            <div className={view === 'looks' ? 'block' : 'hidden'}>
              <Looks 
                outfits={outfits}
                avatars={avatars}
                clothing={clothing}
              />
            </div>
        </div>
      </main>
    </div>
  );
}