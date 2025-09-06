import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerationResult, UploadedFile, LocationType, GeneratedImage, GeolocationCoordinates, BlueprintData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';

// A list of MIME types supported by the image generation model.
const SUPPORTED_IMAGE_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
];

/**
 * Removes the data URL prefix from a base64 string.
 */
const cleanBase64 = (base64String: string): string => {
    return base64String.split(',')[1] || base64String;
};

/**
 * A new pre-processing step to remove UI elements from screenshots.
 */
async function cleanUpImages(
  files: UploadedFile[],
  onProgress: (message: string) => void
): Promise<UploadedFile[]> {
    onProgress("Cleaning up input images...");
    
    const imageFilesToClean = files.filter(file => SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimeType));
    const otherFiles = files.filter(file => !SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimeType)); // videos, etc.

    if (imageFilesToClean.length === 0) {
        return files; // No images to clean
    }

    const cleanupPromises = imageFilesToClean.map(async (file) => {
        const cleanupPrompt = "This image is a screenshot from a virtual walkthrough. Please remove any UI