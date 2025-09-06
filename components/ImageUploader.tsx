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

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  files, 
  onFilesUpdate, 
  location, 
  onLocationUpdate, 
  venueWebsite, 
  onVenueWebsiteUpdate 
}) => {
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
          onFilesUpdate([...newFiles]);
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
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesUpdate(newFiles);
  };

  const getLocation = () => {
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationUpdate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError('Unable to get location. Please enter manually.');
          console.error('Error getting location:', error);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Modern Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragging 
            ? 'border-purple-500 bg-purple-50 scale-[1.02]' 
            : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/50'
          }
        `}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="pointer-events-none">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon type="upload" className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {isDragging ? 'Drop your files here!' : 'Drop venue photos here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to browse • Supports images and videos
          </p>
        </div>
      </div>

      {/* File Preview Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                {file.type === 'image' ? (
                  <img 
                    src={file.base64} 
                    alt={file.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                    <Icon type="video" className="w-8 h-8 text-purple-600" />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
              >
                <span className="text-xs">×</span>
              </button>
              <p className="mt-1 text-xs text-gray-600 truncate">{file.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Location and Website Section */}
      <div className="space-y-3">
        {/* Location Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter venue address or location..."
            value={typeof location === 'string' ? location : location ? `${location.latitude}, ${location.longitude}` : ''}
            onChange={(e) => onLocationUpdate(e.target.value || null)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors text-sm"
          />
          <button
            onClick={getLocation}
            className="px-4 py-2.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Icon type="location" className="w-4 h-4" />
            <span className="hidden sm:inline">Get Location</span>
          </button>
        </div>
        
        {locationError && (
          <p className="text-xs text-red-500 mt-1">{locationError}</p>
        )}

        {/* Website Input */}
        <input
          type="url"
          placeholder="Venue website (optional)..."
          value={venueWebsite}
          onChange={(e) => onVenueWebsiteUpdate(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors text-sm"
        />
      </div>

      {/* Upload Summary */}
      {(files.length > 0 || location || venueWebsite) && (
        <div className="bg-purple-50 rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium text-purple-900">Ready to transform:</p>
          <ul className="text-xs text-purple-700 space-y-0.5">
            {files.length > 0 && (
              <li>• {files.length} {files.length === 1 ? 'file' : 'files'} uploaded</li>
            )}
            {location && (
              <li>• Location {typeof location === 'string' ? 'provided' : 'captured'}</li>
            )}
            {venueWebsite && (
              <li>• Website added</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};