import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { SupabaseIntegrationService, ChatService, ApiError } from '../../utils/apiService';

interface ApiStatusProps {
  showDetails?: boolean;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ showDetails = false }) => {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [chatStatus, setChatStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [errors, setErrors] = useState<string[]>([]);

  const checkApiStatus = async () => {
    const newErrors: string[] = [];
    
    // Check Supabase integration
    try {
      const supabaseConnected = await SupabaseIntegrationService.checkConnection();
      setSupabaseStatus(supabaseConnected ? 'connected' : 'error');
      if (!supabaseConnected) {
        newErrors.push('Supabase integration non disponibile (404)');
      }
    } catch (error) {
      setSupabaseStatus('error');
      if (error instanceof ApiError) {
        newErrors.push(`Supabase: ${error.status} ${error.statusText}`);
      } else {
        newErrors.push('Errore di connessione Supabase');
      }
    }

    // Check Chat service
    try {
      await ChatService.getChatHistory('test');
      setChatStatus('connected');
    } catch (error) {
      setChatStatus('error');
      if (error instanceof ApiError) {
        newErrors.push(`Chat API: ${error.status} ${error.statusText}`);
      } else {
        newErrors.push('Errore di connessione Chat API');
      }
    }

    setErrors(newErrors);
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkApiStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (supabaseStatus === 'checking' || chatStatus === 'checking') {
      return 'checking';
    }
    if (supabaseStatus === 'error' || chatStatus === 'error') {
      return 'error';
    }
    return 'connected';
  };

  const overallStatus = getOverallStatus();

  if (!showDetails) {
    // Simple status indicator
    return (
      <div className="flex items-center space-x-2">
        {overallStatus === 'checking' && (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-xs text-text-secondary">Controllo connessione...</span>
          </>
        )}
        {overallStatus === 'connected' && (
          <>
            <Wifi className="h-4 w-4 text-success" />
            <span className="text-xs text-success">Online</span>
          </>
        )}
        {overallStatus === 'error' && (
          <>
            <WifiOff className="h-4 w-4 text-error" />
            <span className="text-xs text-error">Problemi di connessione</span>
          </>
        )}
      </div>
    );
  }

  // Detailed status panel
  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          {overallStatus === 'connected' ? (
            <CheckCircle className="h-5 w-5 text-success mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-error mr-2" />
          )}
          Stato API
        </h3>
        <button
          onClick={checkApiStatus}
          className="btn btn-outline text-sm"
          disabled={overallStatus === 'checking'}
        >
          {overallStatus === 'checking' ? 'Controllo...' : 'Aggiorna'}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded">
          <span className="font-medium">Integrazione Supabase</span>
          <div className="flex items-center space-x-2">
            {supabaseStatus === 'checking' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
            {supabaseStatus === 'connected' && (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
            {supabaseStatus === 'error' && (
              <AlertCircle className="h-4 w-4 text-error" />
            )}
            <span className={`text-sm ${
              supabaseStatus === 'connected' ? 'text-success' : 
              supabaseStatus === 'error' ? 'text-error' : 'text-text-secondary'
            }`}>
              {supabaseStatus === 'connected' ? 'Connesso' : 
               supabaseStatus === 'error' ? 'Errore' : 'Controllo...'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded">
          <span className="font-medium">Chat API</span>
          <div className="flex items-center space-x-2">
            {chatStatus === 'checking' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
            {chatStatus === 'connected' && (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
            {chatStatus === 'error' && (
              <AlertCircle className="h-4 w-4 text-error" />
            )}
            <span className={`text-sm ${
              chatStatus === 'connected' ? 'text-success' : 
              chatStatus === 'error' ? 'text-error' : 'text-text-secondary'
            }`}>
              {chatStatus === 'connected' ? 'Connesso' : 
               chatStatus === 'error' ? 'Errore' : 'Controllo...'}
            </span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded">
          <h4 className="text-sm font-medium text-error mb-2">Errori rilevati:</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-error mr-2">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 text-xs text-text-secondary">
        Ultimo controllo: {lastCheck.toLocaleTimeString('it-IT')}
      </div>
    </div>
  );
};

export default ApiStatus;