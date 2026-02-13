import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import GameRules from './GameRules';
import { BookOpen } from 'lucide-react';
import { getCurrentAIProvider, setCurrentAIProvider } from '../../utils/aiProvider';
import { openAIService } from '../../utils/openaiService';
import { anthropicService } from '../../utils/anthropicService';

const Header: React.FC = () => {
  const [showRules, setShowRules] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'anthropic'>(getCurrentAIProvider);

  const openAIAvailable = openAIService.isAvailable();
  const anthropicAvailable = anthropicService.isAvailable();
  const showProviderSwitch = openAIAvailable || anthropicAvailable;

  useEffect(() => {
    const current = getCurrentAIProvider();
    const available = current === 'openai' ? openAIAvailable : anthropicAvailable;
    if (!available && (openAIAvailable || anthropicAvailable)) {
      const fallback = openAIAvailable ? 'openai' : 'anthropic';
      setCurrentAIProvider(fallback);
      setProvider(fallback);
    } else {
      setProvider(current);
    }
  }, [openAIAvailable, anthropicAvailable]);

  const handleProviderChange = (p: 'openai' | 'anthropic') => {
    if (p === 'anthropic' && !anthropicAvailable) return;
    if (p === 'openai' && !openAIAvailable) return;
    setCurrentAIProvider(p);
    setProvider(p);
  };

  return (
    <>
      <header className="bg-bg-primary border-b border-gray-200 dark:border-gray-800 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* Logo and Numerix text */}
          <div className="flex items-center space-x-2">
            <svg width="40" height="40" viewBox="0 0 64 64">
              <defs>
                <radialGradient id="headerLogoGradient" cx="0.3" cy="0.35">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e40af" />
                </radialGradient>
                <filter id="headerLogoShadow">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="4" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.35"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Ball circle */}
              <circle cx="32" cy="32" r="28" fill="url(#headerLogoGradient)" filter="url(#headerLogoShadow)"/>
              
              {/* Highlight ellipse */}
              <ellipse cx="24" cy="24" rx="22" ry="14" fill="#ffffff" opacity="0.18" transform="rotate(-35 32 32)"/>
              
              {/* White border */}
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2"/>
              
              {/* Letter N */}
              <text x="32" y="42" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#ffffff" textAnchor="middle" filter="url(#headerLogoShadow)">N</text>
            </svg>
            <h1 className="text-2xl font-bold text-primary">Numerix</h1>
          </div>
          
          {/* Actions on the right */}
          <div className="flex items-center space-x-2">
            {showProviderSwitch && (
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden" role="group" aria-label="AI provider">
                <button
                  type="button"
                  onClick={() => handleProviderChange('openai')}
                  disabled={!openAIAvailable}
                  title="Use OpenAI for AI recommendations"
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${provider === 'openai' ? 'bg-primary text-white' : 'bg-bg-primary text-text-secondary hover:bg-bg-secondary'} ${!openAIAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange('anthropic')}
                  disabled={!anthropicAvailable}
                  title="Use Anthropic for AI recommendations"
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${provider === 'anthropic' ? 'bg-primary text-white' : 'bg-bg-primary text-text-secondary hover:bg-bg-secondary'} ${!anthropicAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Anthropic
                </button>
              </div>
            )}
            <button
              onClick={() => setShowRules(true)}
              className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
              aria-label="Regole del gioco"
              title="Regole del gioco"
            >
              <BookOpen className="h-5 w-5 text-primary" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <GameRules isOpen={showRules} onClose={() => setShowRules(false)} />
    </>
  );
};

export default Header;