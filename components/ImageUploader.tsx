
import React, { useCallback, useState } from 'react';
import type { UploadedFile, LocationType, FileType } from '../types';
import { Icon } from './Icon';

interface ImageUploaderProps {
  files: UploadedFile[];
  onFilesUpdate: (files: UploadedFile[]) => void;
  location: LocationType | null;
  onLocationUpdate: (location: LocationType | null) => void;
  venueWebsite: string;
  onVenueWebsiteUpdate: (website: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ files, onFilesUpdate, location, onLocationUpdate, venueWebsite, onVenueWebsiteUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleFiles = useCallback((selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = [...files];
    Array.from(selectedFiles).forEach(file => {
      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const fileType: FileType = file.type.startsWith('image/') ? 'image' : 'video';
          newFiles.push({
            base64: reader.result as string,
            mimeType: file.type,
            type: fileType,
            name: file.name,
          });
          onFilesUpdate([...newFiles]); // Create a new array to trigger re-render
        };
        reader.readAsDataURL(file);
      }
    });
  }, [onFilesUpdate, files]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  }, [handleFiles]);
  
  const handleRemoveFile = (index: number) => {
      onFilesUpdate(files.filter((_, i) => i !== index));
  };
  
  const handleGetLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  onLocationUpdate({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                  });
                  setLocationError(null);
              },
              (error) => {
                  setLocationError(`Error: ${error.message}`);
              }
          );
      } else {
          setLocationError("Geolocation is not supported by this browser.");
      }
  }

  const commonDragEvents = {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => e.preventDefault(),
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); },
  };
  
  const getLocationInputValue = () => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    return `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`;
  }

  return (
    <div className="space-y-4">
      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {files.map((file, index) => (
            <div key={index} className="relative group aspect-square">
              {file.type === 'image' ? (
                <img src={file.base64} alt={file.name} className="w-full h-full object-cover rounded-md" />
              ) : (
                <div className="w-full h-full bg-gray-800 rounded-md flex flex-col items-center justify-center text-white p-1">
                    <Icon type="video" className="w-8 h-8" />
                    <span className="text-xs text-center truncate w-full mt-1">{file.name}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <button onClick={() => handleRemoveFile(index)} className="text-white bg-red-500 hover:bg-red-600 rounded-full p-2 transition-colors">
                  <Icon type="trash" className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div 
        onDrop={handleDrop}
        {...commonDragEvents}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? 'border-brand-accent bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
      >
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-upload"
          multiple
        />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
          <Icon type="upload" className="w-10 h-10 text-gray-400 mb-3" />
          <p className="font-semibold text-gray-700">
            <span className="text-brand-accent">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-gray-500">Images or Videos</p>
        </label>
      </div>
      
      {/* Geolocation */}
      <div className="space-y-2">
         <label htmlFor="location-input" className="block text-sm font-medium text-gray-700">
            Venue Location (Optional)
         </label>
         <div className="flex items-center gap-2">
            <input
                id="location-input"
                type="text"
                placeholder="e.g., Paris, France"
                value={getLocationInputValue()}
                onChange={(e) => onLocationUpdate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-shadow"
            />
            <button 
                onClick={handleGetLocation} 
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Use current location"
                title="Use current location"
            >
                <Icon type="map-pin" className="w-5 h-5 text-brand-accent"/>
            </button>
         </div>
         {locationError && (
             <p className="text-sm text-red-500 mt-1">{locationError}</p>
         )}
      </div>

      {/* Venue Website */}
      <div className="space-y-2">
         <label htmlFor="website-input" className="block text-sm font-medium text-gray-700">
            Venue Website (Optional)
         </label>
         <input
            id="website-input"
            type="url"
            placeholder="https://examplevenue.com"
            value={venueWebsite}
            onChange={(e) => onVenueWebsiteUpdate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-shadow"
         />
      </div>
    </div>
  );
};