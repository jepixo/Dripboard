export interface User {
  name: string;
}

export interface StoredItem {
  id: string;
  name:string;
  imageDataUrl: string;
}

export interface Avatar extends StoredItem {
  chest?: number;
  waist?: number;
}

export enum ClothingCategory {
  HEADWEAR = 'Headwear',
  EYEWEAR = 'Eyewear',
  TOP = 'Top',
  BOTTOM = 'Bottom',
  FOOTWEAR = 'Footwear',
  ACCESSORIES = 'Accessories',
}

export const CLOTHING_CATEGORIES = Object.values(ClothingCategory);

// New Types for Sizing
export type SizeSystem = 'alpha' | 'numeric' | 'uk_shoe';
export type AlphaSize = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export const ALPHA_SIZES: AlphaSize[] = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export type NumericSize = 32 | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 48 | 50 | 52 | 54 | 56 | 58 | 60;
export const NUMERIC_SIZES: NumericSize[] = [32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60];
export type UKShoeSize = 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10 | 10.5 | 11 | 11.5 | 12 | 12.5 | 13;
export const UK_SHOE_SIZES: UKShoeSize[] = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13];

export interface ClothingItem extends StoredItem {
  category: ClothingCategory;
  description?: string;
  colors: string[];
  fabrics: string[];
  patterns: string[];
  styles: string[];
  customTags: string[];
  // Size fields
  sizeSystem?: SizeSystem;
  alphaSize?: AlphaSize;
  numericSize?: NumericSize;
  shoeSize?: UKShoeSize;
}

export interface Outfit {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  type: 'generated' | 'custom';
  avatarId?: string;
  items?: Partial<Record<ClothingCategory, ClothingItem[]>>;
}
