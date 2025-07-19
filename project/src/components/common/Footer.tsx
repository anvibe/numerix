import React from 'react';
import DisclaimerBanner from './DisclaimerBanner';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-bg-primary border-t border-gray-200 dark:border-gray-800 py-6">
      <div className="container mx-auto px-4">
        <DisclaimerBanner />
        
        <div className="text-center text-sm text-text-secondary">
          <p>© {currentYear} Numerix - Generatore Intelligente di Numeri</p>
          <p className="mt-1">
            Questa applicazione è stata creata a scopo dimostrativo. 
            Non è affiliata a Sisal, Lottomatica o altri operatori di gioco.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;