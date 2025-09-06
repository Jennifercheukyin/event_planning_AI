
import React, { useState, useEffect } from 'react';
import { ActionButton } from './ActionButton';
import { Icon } from './Icon';
import type { BlueprintData, UploadedFile } from '../types';

interface BlueprintReviewProps {
  blueprintData: BlueprintData;
  onConfirm: (editedBlueprint: string) => void;
  onCancel: () => void;
}

const FilePreview: React.FC<{ file: UploadedFile }> = ({ file }) => (
    <div className="relative group aspect-square bg-gray-100 rounded-md">
        <img src={file.base64} alt={file.name} className="w-full h-full object-cover rounded-md" />
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1">
            <p className="text-white text-xs text-center truncate">{file.name}</p>
        </div>
    </div>
);

export const BlueprintReview: React.FC<BlueprintReviewProps> = ({ blueprintData, onConfirm, onCancel }) => {
  const { blueprint, foundFiles } = blueprintData;
  const [editedBlueprint, setEditedBlueprint] = useState(blueprint);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-fast"
      onClick={onCancel}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] flex flex-col space-y-4 transform animate-slide-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-brand-secondary">3. Review Blueprint</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            <p className="text-gray-600">
            Our AI has synthesized all available information into a "Master Blueprint". Review and edit it to ensure it's perfect before we generate the images.
            </p>
            <textarea
            value={editedBlueprint}
            onChange={(e) => setEditedBlueprint(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-shadow resize-none"
            rows={8}
            />
            {foundFiles.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">We also found these images online for context:</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {foundFiles.map((file, index) => (
                            <FilePreview key={index} file={file} />
                        ))}
                    </div>
                </div>
            )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
            <button
                onClick={onCancel}
                className="w-full flex items-center justify-center bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
                Cancel
            </button>
            <ActionButton onClick={() => onConfirm(editedBlueprint)}>
                Generate Layout
                <Icon type="sparkles" className="w-5 h-5 ml-2" />
            </ActionButton>
        </div>
      </div>
    </div>
  );
};

const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeInFast {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideInUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-fade-in-fast {
    animation: fadeInFast 0.3s ease-out forwards;
  }
  .animate-slide-in-up {
    animation: slideInUp 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);
