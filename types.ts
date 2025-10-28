
export interface User {
  name: string;
}

export interface StoredItem {
  id: string;
  name: string;
  imageDataUrl: string;
}

export interface Avatar extends StoredItem {}

export enum ClothingCategory {
  HEAD = 'Head',
  UPPER_BODY_BASE = 'Upper Body (Base)',
  UPPER_BODY_OVER = 'Upper Body (Over)',
  LOWER_BODY = 'Lower Body',
  FEET = 'Feet',
  ACCESSORY_HAND = 'Hand Accessory',
  ACCESSORY_HIP = 'Hip Accessory',
  ACCESSORY_FACE = 'Face Accessory',
}

export const CLOTHING_CATEGORIES = Object.values(ClothingCategory);

export interface ClothingItem extends StoredItem {
  category: ClothingCategory;
  description?: string;
}

export interface Outfit {
  id: string;
  name: string;
  avatarId: string;
  items: Partial<Record<ClothingCategory, ClothingItem>>;
  generatedImageUrl: string;
  createdAt: string;
}