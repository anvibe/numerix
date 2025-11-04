import React from 'react';
import { Dices } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  return (
    <header className="bg-bg-primary border-b border-gray-200 dark:border-gray-800 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Dices className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Numerix</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;