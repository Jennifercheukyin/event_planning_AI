
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8">
        <h1 className="text-3xl font-bold text-brand-secondary">
          nano<span className="text-brand-primary">banana</span>
        </h1>
        <p className="text-gray-500">AI-Powered Event Design</p>
      </div>
    </header>
  );
};
