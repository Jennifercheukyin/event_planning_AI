
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptInput } from './components/PromptInput';
import { ActionButton } from './components/ActionButton';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { getEventBlueprint, generateLayoutFromBlueprint } from './services/geminiService';
import type { GenerationResult, UploadedFile, LocationType, BlueprintData } from './types';
import { Icon } from './components/Icon';
import { BlueprintReview } from './components/BlueprintReview';

const App: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [venueWebsite, setVenueWebsite] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // New state for the blueprint review step
  const [blueprintData, setBlueprintData] = useState<BlueprintData | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const handleGetBlueprint = useCallback(async () => {
    if (uploadedFiles.length === 0 && !location && !venueWebsite.trim()) {
      setError('Please upload at least one file, provide a location, or enter a venue website.');
      return;
    }
     if (!prompt) {
      setError('Please provide a prompt for your vision.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGenerationResult(null);
    setBlueprintData(null);
    setIsReviewing(false);

    try {
      const onProgress = (message: string) => {
        setLoadingMessage(message);
      };
      const result = await getEventBlueprint(uploadedFiles, prompt, location, venueWebsite, onProgress);
      setBlueprintData(result);
      setIsReviewing(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [uploadedFiles, prompt, location, venueWebsite]);

  const handleGenerateFromBlueprint = useCallback(async (finalBlueprint: string) => {
    if (!blueprintData) return;

    setIsReviewing(false);
    setIsLoading(true);
    setError(null);
    
    try {
      const onProgress = (message: string) => {
        setLoadingMessage(message);
      };
      const result = await generateLayoutFromBlueprint({ ...blueprintData, blueprint: finalBlueprint }, onProgress);
      setGenerationResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [blueprintData]);
  
  const handleReset = () => {
    setUploadedFiles([]);
    setLocation(null);
    setVenueWebsite('');
    setPrompt('');
    setGenerationResult(null);
    setError(null);
    setIsLoading(false);
    setBlueprintData(null);
    setIsReviewing(false);
  };

  const handleCancelReview = () => {
    setIsReviewing(false);
    setBlueprintData(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Column */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col space-y-6 h-fit">
          <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-brand-secondary">1. Your Venue</h2>
             <button onClick={handleReset} className="text-sm text-gray-500 hover:text-brand-accent transition-colors flex items-center gap-1">
                <Icon type="reset" className="w-4 h-4" />
                Start Over
             </button>
          </div>
          <ImageUploader 
            files={uploadedFiles}
            onFilesUpdate={setUploadedFiles}
            location={location}
            onLocationUpdate={setLocation}
            venueWebsite={venueWebsite}
            onVenueWebsiteUpdate={setVenueWebsite}
          />
          <div>
            <h2 className="text-2xl font-bold text-brand-secondary mb-4">2. Your Vision</h2>
            <PromptInput value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <ActionButton
            onClick={handleGetBlueprint}
            disabled={(uploadedFiles.length === 0 && !location && !venueWebsite.trim()) || !prompt || isLoading || isReviewing}
          >
            {isLoading ? 'Analyzing...' : 'Create Blueprint'}
            <Icon type="sparkles" className="w-5 h-5 ml-2" />
          </ActionButton>
        </div>

        {/* Output Column */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-center items-center min-h-[400px]">
          {isLoading && <Loader message={loadingMessage} />}
          {!isLoading && error && (
            <div className="text-center text-red-500">
              <Icon type="error" className="w-12 h-12 mx-auto mb-4" />
              <p className="font-semibold">Generation Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {!isLoading && !error && generationResult && (
            <ResultDisplay result={generationResult} />
          )}
          {!isLoading && !error && !generationResult && !isReviewing && (
            <div className="text-center text-gray-400">
              <Icon type="image" className="w-24 h-24 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold">Your event awaits</h3>
              <p>The generated venue design will appear here.</p>
            </div>
          )}
        </div>
      </main>

      {isReviewing && blueprintData && (
        <BlueprintReview
          blueprintData={blueprintData}
          onCancel={handleCancelReview}
          onConfirm={handleGenerateFromBlueprint}
        />
      )}
    </div>
  );
};

export default App;