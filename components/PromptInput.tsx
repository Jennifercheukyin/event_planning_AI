
import React from 'react';

interface PromptInputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder="e.g., 'A modern corporate gala with blue and silver decorations' or 'A rustic-themed wedding with floral arches and long tables.'"
      className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-shadow resize-none"
    />
  );
};
