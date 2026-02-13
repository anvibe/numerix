import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { openAIService } from '../../utils/openaiService';
import { anthropicService } from '../../utils/anthropicService';

const OPENAI_KEY = 'numerix-openai-key';
const ANTHROPIC_KEY = 'numerix-anthropic-key';

const OpenAISettings: React.FC = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');
  const [showOpenAIKey, setShowOpenAIKey] = useState<boolean>(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState<boolean>(false);
  const [testingProvider, setTestingProvider] = useState<'openai' | 'anthropic' | null>(null);
  const [openaiStatus, setOpenaiStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [anthropicStatus, setAnthropicStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const savedOpenAI = localStorage.getItem(OPENAI_KEY);
    const savedAnthropic = localStorage.getItem(ANTHROPIC_KEY);
    if (savedOpenAI) setOpenaiApiKey(savedOpenAI);
    if (savedAnthropic) setAnthropicApiKey(savedAnthropic);
    if (savedOpenAI) testOpenAI(savedOpenAI);
    if (savedAnthropic) testAnthropic(savedAnthropic);
  }, []);

  const testOpenAI = async (keyToTest?: string) => {
    setTestingProvider('openai');
    setErrorMessage('');
    const prev = (window as unknown as { __VITE_OPENAI_API_KEY?: string }).__VITE_OPENAI_API_KEY;
    if (keyToTest) (window as unknown as { __VITE_OPENAI_API_KEY?: string }).__VITE_OPENAI_API_KEY = keyToTest;
    try {
      const ok = await openAIService.testConnection();
      setOpenaiStatus(ok ? 'connected' : 'error');
      if (!ok) setErrorMessage('OpenAI: connessione fallita. Verifica la chiave API.');
    } catch (e) {
      setOpenaiStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'OpenAI: errore di connessione');
    } finally {
      if (keyToTest && prev !== undefined) (window as unknown as { __VITE_OPENAI_API_KEY?: string }).__VITE_OPENAI_API_KEY = prev;
      setTestingProvider(null);
    }
  };

  const testAnthropic = async (keyToTest?: string) => {
    setTestingProvider('anthropic');
    setErrorMessage('');
    const prev = (window as unknown as { __VITE_ANTHROPIC_API_KEY?: string }).__VITE_ANTHROPIC_API_KEY;
    if (keyToTest) (window as unknown as { __VITE_ANTHROPIC_API_KEY?: string }).__VITE_ANTHROPIC_API_KEY = keyToTest;
    try {
      const ok = await anthropicService.testConnection();
      setAnthropicStatus(ok ? 'connected' : 'error');
      if (!ok) setErrorMessage('Anthropic: connessione fallita. Verifica la chiave API.');
    } catch (e) {
      setAnthropicStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Anthropic: errore di connessione');
    } finally {
      if (keyToTest && prev !== undefined) (window as unknown as { __VITE_ANTHROPIC_API_KEY?: string }).__VITE_ANTHROPIC_API_KEY = prev;
      setTestingProvider(null);
    }
  };

  const handleSaveOpenAI = () => {
    if (!openaiApiKey.trim()) {
      setErrorMessage('Inserisci una chiave API OpenAI valida');
      return;
    }
    localStorage.setItem(OPENAI_KEY, openaiApiKey.trim());
    (window as unknown as { __VITE_OPENAI_API_KEY?: string }).__VITE_OPENAI_API_KEY = openaiApiKey.trim();
    testOpenAI(openaiApiKey.trim());
    setErrorMessage('');
  };

  const handleSaveAnthropic = () => {
    if (!anthropicApiKey.trim()) {
      setErrorMessage('Inserisci una chiave API Anthropic valida');
      return;
    }
    localStorage.setItem(ANTHROPIC_KEY, anthropicApiKey.trim());
    (window as unknown as { __VITE_ANTHROPIC_API_KEY?: string }).__VITE_ANTHROPIC_API_KEY = anthropicApiKey.trim();
    testAnthropic(anthropicApiKey.trim());
    setErrorMessage('');
  };

  const handleRemoveOpenAI = () => {
    localStorage.removeItem(OPENAI_KEY);
    setOpenaiApiKey('');
    setOpenaiStatus('unknown');
    setErrorMessage('');
  };

  const handleRemoveAnthropic = () => {
    localStorage.removeItem(ANTHROPIC_KEY);
    setAnthropicApiKey('');
    setAnthropicStatus('unknown');
    setErrorMessage('');
  };

  const statusIcon = (status: 'unknown' | 'connected' | 'error') => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error': return <XCircle className="h-5 w-5 text-error" />;
      default: return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  return (
    <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center mb-4">
        <Settings className="h-5 w-5 mr-2 text-primary" />
        <h3 className="text-lg font-semibold">Configurazione AI (OpenAI e Anthropic)</h3>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Chiavi API opzionali
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Puoi usare OpenAI e/o Anthropic per l&apos;AI avanzata. Aggiungi le chiavi qui sotto e scegli il provider con l&apos;interruttore <strong>OpenAI | Anthropic</strong> nella barra in alto (prima dell&apos;icona Regole del gioco).
              </p>
            </div>
          </div>
        </div>

        {/* OpenAI */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">OpenAI</h4>
            <div className="flex items-center space-x-2">
              {statusIcon(openaiStatus)}
              <span className="text-sm">{openaiStatus === 'connected' ? 'Connesso' : openaiStatus === 'error' ? 'Errore' : 'Non configurato'}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type={showOpenAIKey ? 'text' : 'password'}
                id="openai-key"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-md"
              />
              <button type="button" onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={handleSaveOpenAI} disabled={!openaiApiKey.trim()} className="btn btn-primary flex items-center disabled:opacity-50">
              <Key className="h-4 w-4 mr-1" /> Salva
            </button>
            <button onClick={() => testOpenAI(openaiApiKey || undefined)} disabled={!openaiApiKey.trim() || testingProvider === 'openai'} className="btn btn-outline flex items-center disabled:opacity-50">
              {testingProvider === 'openai' ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Test
            </button>
            {openaiApiKey && (
              <button onClick={handleRemoveOpenAI} className="btn btn-outline text-error flex items-center">
                <XCircle className="h-4 w-4 mr-2" /> Rimuovi
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a>
          </p>
        </div>

        {/* Anthropic */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Anthropic</h4>
            <div className="flex items-center space-x-2">
              {statusIcon(anthropicStatus)}
              <span className="text-sm">{anthropicStatus === 'connected' ? 'Connesso' : anthropicStatus === 'error' ? 'Errore' : 'Non configurato'}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                id="anthropic-key"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-md"
              />
              <button type="button" onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={handleSaveAnthropic} disabled={!anthropicApiKey.trim()} className="btn btn-primary flex items-center disabled:opacity-50">
              <Key className="h-4 w-4 mr-1" /> Salva
            </button>
            <button onClick={() => testAnthropic(anthropicApiKey || undefined)} disabled={!anthropicApiKey.trim() || testingProvider === 'anthropic'} className="btn btn-outline flex items-center disabled:opacity-50">
              {testingProvider === 'anthropic' ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Test
            </button>
            {anthropicApiKey && (
              <button onClick={handleRemoveAnthropic} className="btn btn-outline text-error flex items-center">
                <XCircle className="h-4 w-4 mr-2" /> Rimuovi
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.anthropic.com</a>
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center text-error text-sm">
            <XCircle className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}

        <div className="text-xs text-text-secondary space-y-1">
          <p>• Le chiavi sono salvate localmente nel browser. In produzione usa un proxy backend.</p>
          <p>• Debug: apri la console del browser per vedere quale provider è in uso (<code className="bg-bg-secondary px-1 rounded">[Numerix AI]</code>).</p>
        </div>
      </div>
    </div>
  );
};

export default OpenAISettings;
