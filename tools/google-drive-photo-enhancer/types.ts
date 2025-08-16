export interface User {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface Photo {
  id: string;
  name: string;
  description: string;
  url: string;
  width: number;
  height: number;
  fileSize: number; // in bytes
  author?: string;
  copyright?: string;
  adjustments?: {
    brightness: number; // 0-200, 100 is default
    contrast: number;   // 0-200, 100 is default
    saturation: number; // 0-200, 100 is default
  };
}

export interface AIEnhancementSuggestion {
  suggestedFileName: string;
  suggestedDescription: string;
  suggestedWidth: number;
  suggestedHeight: number;
  suggestedFileSize?: number;
  enhancementNotes: string;
}