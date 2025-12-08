export interface UploadedImage {
  file: File;
  preview: string; // Base64 or Blob URL for display
  base64Data: string; // Pure base64 string for API
  mimeType: string;
}

export interface GenerationResult {
  imageUrl: string;
  promptUsed: string;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
}