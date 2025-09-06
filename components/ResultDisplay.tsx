
import React, { useState } from 'react';
import type { GenerationResult } from '../types';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { Icon } from './Icon';

interface ResultDisplayProps {
  result: GenerationResult;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { isSpeaking, isSupported, speak, cancel } = useTextToSpeech();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  if (!result.images || result.images.length === 0) {
      return (
        <div className="text-center text-gray-500">
            <p>No images were generated.</p>
        </div>
      )
  }
  
  const activeImage = result.images[activeTabIndex];
  
  const handleSpeakClick = () => {
    if (isSpeaking) {
      cancel();
    } else {
      speak(activeImage.description);
    }
  };

  const handleTabClick = (index: number) => {
    cancel(); // Stop speaking when changing tabs
    setActiveTabIndex(index);
  }

  return (
    <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-brand-secondary">Generated Layout</h2>
      
      {/* Tabs */}
      <div className="w-full border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {result.images.map((image, index) => (
            <button
              key={image.label}
              onClick={() => handleTabClick(index)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTabIndex === index
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {image.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Image Display */}
      <div className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-inner">
        <img src={activeImage.imageUrl} alt={activeImage.label} className="w-full h-full object-contain" />
      </div>
      
      {/* Description */}
      <div className="w-full text-left p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg text-gray-700">Description</h3>
            {isSupported && (
                <button 
                  onClick={handleSpeakClick} 
                  className="flex items-center space-x-2 text-sm text-brand-accent hover:text-blue-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                  disabled={!activeImage.description}
                >
                  <Icon type={isSpeaking ? 'pause' : 'volume'} className="w-5 h-5" />
                  <span>{isSpeaking ? 'Stop' : 'Read Aloud'}</span>
                </button>
            )}
        </div>
        <p className="text-gray-600">{activeImage.description}</p>
      </div>
    </div>
  );
};

// Add fade-in animation to tailwind config or in a style tag if needed.
// For simplicity, we can add it here.
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);
