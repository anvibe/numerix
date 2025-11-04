import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { openAIService } from '../../utils/openaiService';

const OpenAISettings: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem('numerix-openai-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      // Test connection on load if key exists
      testConnection(savedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      setErrorMessage('Inserisci una chiave API valida');
      return;
    }

    // Save to localStorage
    localStorage.setItem('numerix-openai-key', apiKey.trim());
    
    // Update environment variable (for current session)
    (window as any).__VITE_OPENAI_API_KEY = apiKey.trim();
    
    // Test the connection
    testConnection(apiKey.trim());
    
    setErrorMessage('');
  };

  const testConnection = async (keyToTest?: string) => {
    setIsTestingConnection(true);
    setErrorMessage('');
    
    try {
      // Temporarily set the API key for testing
      const originalKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (keyToTest) {
        import.meta.env.VITE_OPENAI_API_KEY = keyToTest;
      }
      
      const isConnected = await openAIService.testConnection();
      
      // Restore original key
      if (keyToTest && originalKey !== undefined) {
        import.meta.env.VITE_OPENAI_API_KEY = originalKey;
      }
      
      setConnectionStatus(isConnected ? 'connected' : 'error');
      if (!isConnected) {
        setErrorMessage('Connessione fallita. Verifica che la chiave API sia corretta e abbia i permessi necessari.');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Errore di connessione sconosciuto');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('numerix-openai-key');
    setApiKey('');
    setConnectionStatus('unknown');
    setErrorMessage('');
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-error" />;
      default:
        return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connesso';
      case 'error':
        return 'Errore di connessione';
      default:
        return 'Non configurato';
    }
  };

  return (
    <div className="mb-6 p-4 bg-bg-primary border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center mb-4">
        <Settings className="h-5 w-5 mr-2 text-primary" />
        <h3 className="text-lg font-semibold">Configurazione OpenAI</h3>
        <div className="ml-auto flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Configurazione OpenAI (Opzionale)
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Per utilizzare l'AI avanzata con OpenAI, inserisci la tua chiave API. 
                Senza questa configurazione, verrà utilizzata l'AI locale (meno sofisticata ma gratuita).
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="openai-key" className="block text-sm font-medium text-text-secondary mb-2">
            Chiave API OpenAI
          </label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="openai-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-md"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="btn btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="h-4 w-4 mr-1" />
              Salva
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center text-error text-sm">
            <XCircle className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={() => testConnection()}
            disabled={!apiKey.trim() || isTestingConnection}
            className="btn btn-outline flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingConnection ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isTestingConnection ? 'Test in corso...' : 'Testa Connessione'}
          </button>

          {apiKey && (
            <button
              onClick={handleRemoveApiKey}
              className="btn btn-outline text-error flex items-center"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rimuovi Chiave
            </button>
          )}
        </div>

        <div className="text-xs text-text-secondary space-y-1">
          <p>• Ottieni la tua chiave API da: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a></p>
          <p>• La chiave viene salvata localmente nel tuo browser</p>
          <p>• Costi: circa $0.01-0.03 per generazione (dipende dal modello utilizzato)</p>
          <p>• ⚠️ Nota: In produzione, usa sempre un proxy backend per le chiamate API</p>
        </div>
      </div>
    </div>
  );
};

export default OpenAISettings;