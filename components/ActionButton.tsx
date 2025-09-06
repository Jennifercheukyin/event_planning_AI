
import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ children, disabled, ...props }) => {
  return (
    <button
      {...props}
      disabled={disabled}
      className="w-full flex items-center justify-center bg-brand-secondary text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
};
