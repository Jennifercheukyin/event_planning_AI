
import React from 'react';

const flavorMessages = [
    "Consulting with our digital interior designer...",
    "Arranging the virtual furniture...",
    "Adding a touch of AI magic...",
    "Finalizing the decor...",
    "Polishing the pixels...",
    "Great designs take time!",
];

interface LoaderProps {
    message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  const [flavorMessage, setFlavorMessage] = React.useState(flavorMessages[0]);
  
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setFlavorMessage(prev => {
        const currentIndex = flavorMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % flavorMessages.length;
        return flavorMessages[nextIndex];
      });
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <svg className="animate-spin h-12 w-12 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-lg font-semibold text-gray-700">{message || 'Generating Your Vision'}</p>
      <p className="text-gray-500 text-center w-64 h-10">{flavorMessage}</p>
    </div>
  );
};
