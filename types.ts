
export type FileType = 'image' | 'video';

export interface UploadedFile {
  base64: string; // The base64 representation of the file, including the data URL prefix.
  mimeType: string; // e.g., 'image/png', 'video/mp4'
  type: FileType;
  name: string;
}

export interface GeolocationCoordinates {
    latitude: number;
    longitude: number;
}

export type LocationType = GeolocationCoordinates | string;

export interface GeneratedImage {
    imageUrl: string;
    description: string;
    label: string; // e.g., "Front View", "Floor Plan"
}

export interface GenerationResult {
  images: GeneratedImage[];
}

export interface BlueprintData {
  blueprint: string;
  userFiles: UploadedFile[];
  foundFiles: UploadedFile[];
  mediaAnalysis: string;
}