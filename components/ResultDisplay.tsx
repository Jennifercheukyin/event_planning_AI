import React, { useState } from 'react';
import type { GenerationResult } from '../types';
import { Icon } from './Icon';

interface ResultDisplayProps {
  result: GenerationResult;
}

// Shopping items that typically appear in event setups
const getShoppingList = (eventType: string) => {
  const baseItems = [
    {
      name: "String Lights (100ft)",
      category: "Lighting",
      amazonUrl: "https://www.amazon.com/s?k=outdoor+string+lights+100ft+waterproof",
      price: "$45-85"
    },
    {
      name: "Round Folding Tables (60 inch)",
      category: "Furniture",
      amazonUrl: "https://www.amazon.com/s?k=60+inch+round+folding+table+event",
      price: "$80-150"
    },
    {
      name: "Chiavari Chairs",
      category: "Furniture",
      amazonUrl: "https://www.amazon.com/s?k=chiavari+chairs+wedding+event",
      price: "$35-60 each"
    },
    {
      name: "Table Linens (120 inch Round)",
      category: "Linens",
      amazonUrl: "https://www.amazon.com/s?k=120+inch+round+tablecloth+polyester",
      price: "$15-30"
    },
    {
      name: "LED Uplighting (Set of 8)",
      category: "Lighting",
      amazonUrl: "https://www.amazon.com/s?k=led+uplighting+wedding+dmx+wireless",
      price: "$150-300"
    },
    {
      name: "Centerpiece Vases",
      category: "Decor",
      amazonUrl: "https://www.amazon.com/s?k=glass+cylinder+vases+centerpiece+set",
      price: "$30-60/set"
    },
    {
      name: "Artificial Flower Arrangements",
      category: "Decor",
      amazonUrl: "https://www.amazon.com/s?k=artificial+flower+arrangements+centerpieces",
      price: "$25-50"
    },
    {
      name: "Chair Covers & Sashes",
      category: "Linens",
      amazonUrl: "https://www.amazon.com/s?k=chair+covers+spandex+wedding+sashes",
      price: "$2-5 each"
    },
    {
      name: "Outdoor Event Tent (20x30)",
      category: "Shelter",
      amazonUrl: "https://www.amazon.com/s?k=20x30+party+tent+outdoor+wedding",
      price: "$300-600"
    },
    {
      name: "Dance Floor Tiles (12x12)",
      category: "Flooring",
      amazonUrl: "https://www.amazon.com/s?k=portable+dance+floor+tiles+outdoor",
      price: "$400-800"
    },
    {
      name: "Cocktail Tables",
      category: "Furniture",
      amazonUrl: "https://www.amazon.com/s?k=cocktail+table+high+top+30+inch",
      price: "$50-90"
    },
    {
      name: "Portable Bar Setup",
      category: "Service",
      amazonUrl: "https://www.amazon.com/s?k=portable+bar+led+event+rental",
      price: "$200-400"
    },
    {
      name: "Chafing Dishes Set",
      category: "Catering",
      amazonUrl: "https://www.amazon.com/s?k=chafing+dish+set+stainless+steel+buffet",
      price: "$150-250/set"
    },
    {
      name: "Beverage Dispensers",
      category: "Catering",
      amazonUrl: "https://www.amazon.com/s?k=glass+beverage+dispenser+stand+spigot",
      price: "$40-80"
    },
    {
      name: "Outdoor Heaters",
      category: "Comfort",
      amazonUrl: "https://www.amazon.com/s?k=patio+heater+propane+commercial",
      price: "$150-300"
    },
    {
      name: "Event Signage & Easels",
      category: "Signage",
      amazonUrl: "https://www.amazon.com/s?k=wedding+signs+easel+welcome+acrylic",
      price: "$30-80"
    },
    {
      name: "Wireless PA System",
      category: "Audio",
      amazonUrl: "https://www.amazon.com/s?k=portable+pa+system+wireless+microphone",
      price: "$200-500"
    },
    {
      name: "Fairy Light Curtain",
      category: "Lighting",
      amazonUrl: "https://www.amazon.com/s?k=fairy+light+curtain+backdrop+wedding",
      price: "$30-60"
    }
  ];

  return baseItems;
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showShoppingList, setShowShoppingList] = useState(false);

  if (!result.images || result.images.length === 0) {
      return (
        <div className="text-center text-gray-500">
            <p>No images were generated.</p>
        </div>
      )
  }
  
  const activeImage = result.images[activeTabIndex];
  const shoppingItems = getShoppingList("event");

  const handleTabClick = (index: number) => {
    setActiveTabIndex(index);
  }

  return (
    <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Your Vision Transformed
      </h2>
      
      {/* Tabs */}
      <div className="w-full border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {result.images.map((image, index) => (
            <button
              key={image.label}
              onClick={() => handleTabClick(index)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTabIndex === index
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {image.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Image Display */}
      <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-xl">
        <img 
          src={activeImage.imageUrl} 
          alt={activeImage.label} 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Shopping List Toggle Button */}
      <button
        onClick={() => setShowShoppingList(!showShoppingList)}
        className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
      >
        <Icon type="shopping" className="w-5 h-5" />
        {showShoppingList ? 'Hide Shopping List' : 'View Shopping List'}
      </button>

      {/* Shopping List */}
      {showShoppingList && (
        <div className="w-full mt-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛍️</span> Event Setup Shopping List
            </h3>
            <p className="text-white/90 text-sm mt-1">
              Click any item to view options on Amazon
            </p>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shoppingItems.map((item, index) => (
                <a
                  key={index}
                  href={item.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-all duration-200 group border border-gray-200 hover:border-purple-300"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-purple-700">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.category} • {item.price}
                    </div>
                  </div>
                  <div className="ml-3 text-gray-400 group-hover:text-purple-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong>💡 Pro Tip:</strong> These are common items for event setups. Quantities and specific styles will depend on your venue size and guest count.
              </p>
            </div>
          </div>
        </div>
      )}
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