import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptInput } from './components/PromptInput';
import { ActionButton } from './components/ActionButton';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { getEventBlueprint, generateLayoutFromBlueprint } from './services/geminiService';
import type { GenerationResult, UploadedFile, LocationType } from './types';
import { Icon } from './components/Icon';

const App: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [venueWebsite, setVenueWebsite] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Direct generation without blueprint review
  const handleGenerate = useCallback(async () => {
    if (uploadedFiles.length === 0 && !location && !venueWebsite.trim()) {
      setError('Please upload at least one venue image or provide location/website.');
      return;
    }
    if (!prompt) {
      setError('Please describe your event vision.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGenerationResult(null);

    try {
      const onProgress = (message: string) => {
        setLoadingMessage(message);
      };
      
      // Step 1: Analyze venue and create blueprint (internal, not shown to user)
      const blueprintData = await getEventBlueprint(uploadedFiles, prompt, location, venueWebsite, onProgress);
      
      // Step 2: Generate images directly from blueprint
      const result = await generateLayoutFromBlueprint(blueprintData, onProgress);
      setGenerationResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [uploadedFiles, prompt, location, venueWebsite]);
  
  const handleReset = () => {
    setUploadedFiles([]);
    setLocation(null);
    setVenueWebsite('');
    setPrompt('');
    setGenerationResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Icon type="sparkles" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Event Vision AI
                </h1>
                <p className="text-xs text-gray-600">Transform venues with AI magic</p>
              </div>
            </div>
            <button 
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <Icon type="reset" className="w-4 h-4" />
              <span className="hidden sm:inline">Start Over</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Hero Section with Problem Statement */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Your Complete Event Planning Solution
          </h2>
          <p className="text-xl text-gray-700 mb-2 font-medium">
            From Vision to Reality in One Platform
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Transform any venue with AI-powered visualizations, get professional floor plans, 
            photorealistic event renders from multiple angles, and a curated shopping list 
            with direct links to purchase everything you see in your vision.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full">
              <span className="text-purple-600">📸</span>
              <span className="text-sm font-medium text-purple-900">Venue Analysis</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-full">
              <span className="text-pink-600">🎨</span>
              <span className="text-sm font-medium text-pink-900">Multi-Angle Renders</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full">
              <span className="text-purple-600">📐</span>
              <span className="text-sm font-medium text-purple-900">Floor Plans</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-full">
              <span className="text-pink-600">🛍️</span>
              <span className="text-sm font-medium text-pink-900">Shopping List</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Section - Modern Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">🏛️</span> Setup Your Event
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Step 1: Venue */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                    1
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Upload Venue Photos</h4>
                </div>
                <ImageUploader 
                  files={uploadedFiles}
                  onFilesUpdate={setUploadedFiles}
                  location={location}
                  onLocationUpdate={setLocation}
                  venueWebsite={venueWebsite}
                  onVenueWebsiteUpdate={setVenueWebsite}
                />
              </div>

              {/* Step 2: Vision */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                    2
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Describe Your Event</h4>
                </div>
                <PromptInput 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Elegant wedding reception for 150 guests with garden theme, string lights, and dance floor"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={(uploadedFiles.length === 0 && !location && !venueWebsite.trim()) || !prompt || isLoading}
                className={`
                  w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform
                  ${isLoading || (uploadedFiles.length === 0 && !location && !venueWebsite.trim()) || !prompt
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                  }
                  flex items-center justify-center gap-3
                `}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Creating Magic...</span>
                  </>
                ) : (
                  <>
                    <Icon type="sparkles" className="w-5 h-5" />
                    <span>Generate Event Design</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Section - Modern Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">✨</span> Your Vision Realized
              </h3>
            </div>
            
            <div className="p-6 min-h-[500px] flex items-center justify-center">
              {isLoading && (
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-pulse flex items-center justify-center">
                      <Icon type="sparkles" className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">AI is working its magic...</p>
                  <p className="text-sm text-gray-600 animate-pulse">{loadingMessage}</p>
                </div>
              )}
              
              {!isLoading && error && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon type="error" className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</p>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <button 
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {!isLoading && !error && generationResult && (
                <ResultDisplay result={generationResult} />
              )}
              
              {!isLoading && !error && !generationResult && (
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Icon type="image" className="w-16 h-16 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Transform</h3>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    Upload your venue photos and describe your dream event. 
                    AI will create stunning visualizations in seconds.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section - Updated for One-Stop Shop */}
        <div className="mt-16 max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Everything You Need to Plan Your Perfect Event
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏛️</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Venue Analysis</h4>
              <p className="text-sm text-gray-600">AI maps your exact space with precise measurements</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📐</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Technical Floor Plans</h4>
              <p className="text-sm text-gray-600">Professional CAD-style layouts for vendors</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎨</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Multi-Angle Views</h4>
              <p className="text-sm text-gray-600">See your event from every perspective</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🛍️</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Smart Shopping List</h4>
              <p className="text-sm text-gray-600">Buy exactly what you see with direct links</p>
            </div>
          </div>
          
          {/* Value Proposition Box */}
          <div className="mt-12 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 text-center border border-purple-200">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Why Event Vision AI?
            </h3>
            <p className="text-gray-700 max-w-3xl mx-auto">
              Stop juggling multiple tools and vendors. Our AI-powered platform takes you from 
              initial venue photos to fully realized event designs with actionable shopping lists. 
              Perfect for wedding planners, corporate event managers, and anyone organizing 
              memorable gatherings. Save hours of planning time and thousands in design fees.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500 border-t border-gray-200">
        <p>Powered by Google Gemini AI • Nano Banana Model</p>
      </footer>
    </div>
  );
};

export default App;