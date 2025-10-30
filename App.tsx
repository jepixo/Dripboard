
import React, { useState, useEffect, useRef } from 'react';
import { Wardrobe } from './components/Wardrobe';
import { OutfitBuilder } from './components/OutfitBuilder';
import { Looks } from './components/Looks';
import { LoginScreen } from './components/LoginScreen';
import { ApiKeyModal } from './components/ApiKeyModal';
import { storageService } from './services/storageService';
import type { User, Avatar, ClothingItem, Outfit } from './types';
import { DripboardLogo, AvatarBuilderIcon, WardrobeIcon, LooksIcon, MoreIcon, WardrobeMobileIcon } from './components/Icons';

// This app is not designed for the AI Studio environment, so the AIStudio interface is removed.

const MoreMenu: React.FC<{ onLogout: () => void, onChangeApiKey: () => void, className?: string, iconClassName?: string, menuPosition?: string }> = ({ onLogout, onChangeApiKey, className, iconClassName, menuPosition = 'top' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const positionClass = menuPosition === 'top' 
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' 
      : 'top-full right-0 mt-2';

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={className}
                aria-label="More options"
                title="More options"
            >
                <MoreIcon className={iconClassName} />
            </button>
            {isOpen && (
                <div
                    ref={menuRef}
                    className={`absolute w-48 bg-panel rounded-md shadow-lg border border-border-color z-50 ${positionClass}`}
                >
                    <ul className="py-1">
                        <li>
                            <button
                                onClick={() => { onChangeApiKey(); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary"
                            >
                                Change API Key
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => { onLogout(); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary"
                            >
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};


export default function App() {
  const [user, setUser] = useState<User | null>(() => storageService.getUser());
  const [apiKey, setApiKey] = useState<string | null>(() => storageService.getApiKey());
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [clothing, setClothing] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showLooks, setShowLooks] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  
  useEffect(() => {
    // If the user is logged in but there's no API key, prompt them to enter one.
    if (user && !apiKey) {
        setShowApiKeyModal(true);
    }
  }, [user, apiKey]);

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
    storageService.removeApiKey(); // Also clear the API key on logout
    setUser(null);
    setApiKey(null);
  };

  const handleChangeApiKey = () => {
    setShowApiKeyModal(true);
  };
  
  const handleSaveApiKey = (newKey: string) => {
    storageService.saveApiKey(newKey);
    setApiKey(newKey);
    setShowApiKeyModal(false);
  };
  
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleNavClick = (view: 'looks' | 'wardrobe') => {
    if (view === 'looks') {
      setShowLooks(!showLooks);
      setShowWardrobe(false);
    } else if (view === 'wardrobe') {
      setShowWardrobe(!showWardrobe);
      setShowLooks(false);
    }
  }
  
  const closeModals = () => {
      setShowLooks(false);
      setShowWardrobe(false);
  }

  const isBuilderActive = !showLooks && !showWardrobe;

  return (
    <div className="h-screen w-screen bg-bg-secondary text-text-primary flex flex-col lg:flex-row font-sans overflow-hidden">
      {/* Sidebar Navigation */}
       <nav className="hidden lg:flex flex-col w-24 bg-bg-primary border-r border-border-color py-6 px-2 items-center justify-between">
        {/* Top section with logo */}
        <button onClick={handleLogout} className="p-2" title="Go to login">
          <DripboardLogo className="h-10 w-10 text-brand-primary" />
        </button>

        {/* Middle section with nav icons */}
        <div className="flex flex-col items-center gap-8">
           <button
            onClick={closeModals}
            className={`p-3 rounded-lg transition-colors duration-200 ${isBuilderActive ? 'text-text-primary' : 'text-text-secondary/60 hover:text-text-primary'}`}
            aria-label="Outfit Builder"
            title="Outfit Builder"
          >
            <AvatarBuilderIcon className="h-7 w-7" />
          </button>
           <button
            onClick={() => handleNavClick('wardrobe')}
            className={`p-3 rounded-lg transition-colors duration-200 ${showWardrobe ? 'text-text-primary' : 'text-text-secondary/60 hover:text-text-primary'}`}
            aria-label="Wardrobe"
            title="Wardrobe"
          >
            <WardrobeIcon className="h-7 w-7" />
          </button>
           <button
            onClick={() => handleNavClick('looks')}
            className={`p-3 rounded-lg transition-colors duration-200 ${showLooks ? 'text-text-primary' : 'text-text-secondary/60 hover:text-text-primary'}`}
            aria-label="My Looks"
            title="My Looks"
          >
            <LooksIcon className="h-7 w-7" />
          </button>
        </div>

        {/* Bottom section with MoreIcon */}
        <div className="flex flex-col items-center">
            <MoreMenu 
                onLogout={handleLogout} 
                onChangeApiKey={handleChangeApiKey}
                className="p-2 rounded-lg transition-colors duration-200 text-text-secondary/70 hover:bg-black/5"
                iconClassName="h-6 w-6"
                menuPosition="top"
            />
        </div>
      </nav>


      {/* Wrapper for main content + mobile nav */}
      <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile Top Nav */}
          <nav className="lg:hidden w-full bg-bg-primary p-1 flex items-center justify-around flex-shrink-0 border-b border-border-color">
              <button onClick={handleLogout} className="p-2" title="Go to login"><DripboardLogo className="h-9 w-9 text-black" /></button>
              <button onClick={closeModals} className={`p-2 rounded-lg transition-colors ${isBuilderActive ? 'text-text-primary' : 'text-text-secondary/70'}`}><AvatarBuilderIcon className="h-7 w-7" /></button>
              <button onClick={() => handleNavClick('wardrobe')} className={`p-2 rounded-lg transition-colors ${showWardrobe ? 'text-text-primary' : 'text-text-secondary/70'}`}><WardrobeMobileIcon className="h-7 w-7" /></button>
              <button onClick={() => handleNavClick('looks')} className={`p-2 rounded-lg transition-colors ${showLooks ? 'text-text-primary' : 'text-text-secondary/70'}`}><LooksIcon className="h-7 w-7" /></button>
               <MoreMenu 
                  onLogout={handleLogout} 
                  onChangeApiKey={handleChangeApiKey}
                  className={`p-2 rounded-lg transition-colors text-text-secondary/70`}
                  iconClassName="h-7 w-7"
                  menuPosition="bottom"
              />
          </nav>
        
          {/* Main Content Area */}
          <div className="flex-1 flex flex-row overflow-hidden">
            {/* Vertical Text for Mobile/Tablet */}
            <div className="hidden sm:flex lg:hidden w-16 flex-shrink-0 bg-neutral-100 items-center justify-center border-r border-border-color">
              <h1 className="transform -rotate-90 whitespace-nowrap text-2xl font-bold tracking-[0.3em] text-neutral-900/80">
                Dripboard
              </h1>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col relative">
              <OutfitBuilder 
                  avatars={avatars}
                  clothing={clothing}
                  outfits={outfits}
                  onDataChange={refreshData}
                  storageError={storageError}
                />
              {showWardrobe && <Wardrobe avatars={avatars} clothing={clothing} onDataChange={refreshData} onClose={() => setShowWardrobe(false)} />}
              {showLooks && <Looks outfits={outfits} avatars={avatars} clothing={clothing} onClose={() => setShowLooks(false)}/>}
            </main>
          </div>
      </div>
      
      {showApiKeyModal && (
        <ApiKeyModal
            onSave={handleSaveApiKey}
            onClose={apiKey ? () => setShowApiKeyModal(false) : undefined}
        />
      )}
    </div>
  );
}
