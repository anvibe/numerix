import React, { useState, useEffect } from 'react';
import { User, LogIn, LogOut, UserPlus } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { showToast } from '../../utils/toast';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Clear invalid tokens from localStorage
  const clearInvalidTokens = () => {
    try {
      localStorage.removeItem('sb-kmndhvzjyhyiwwdmgyqg-auth-token');
      localStorage.removeItem('supabase.auth.token');
      // Clear any other potential Supabase auth keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') && key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  useEffect(() => {
    // Get initial session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        // Clear invalid tokens if there's an auth error
        if (error.message.includes('refresh_token_not_found') || 
            error.message.includes('Invalid Refresh Token')) {
          clearInvalidTokens();
        }
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to get session:', error);
      clearInvalidTokens();
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        clearInvalidTokens();
      }
      
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore durante il login');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      showToast.success('Registrazione completata! Puoi ora effettuare il login.');
      setIsSignUp(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore durante la registrazione');
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      // Clear tokens on successful sign out
      clearInvalidTokens();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">Numerix</h1>
              <p className="text-text-secondary">
                Accedi per salvare le tue combinazioni e utilizzare tutte le funzionalità
              </p>
            </div>

            {!showAuth ? (
              <div className="card text-center">
                <div className="mb-6">
                  <User className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Benvenuto in Numerix</h2>
                  <p className="text-text-secondary text-sm">
                    Per utilizzare l'applicazione e salvare i tuoi dati, effettua l'accesso o registrati.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowAuth(true);
                      setIsSignUp(false);
                    }}
                    className="btn btn-primary w-full flex items-center justify-center"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Accedi
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAuth(true);
                      setIsSignUp(true);
                    }}
                    className="btn btn-outline w-full flex items-center justify-center"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Registrati
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">
                  {isSignUp ? 'Registrazione' : 'Accesso'}
                </h2>
                
                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                      placeholder="tua@email.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                      placeholder="Password"
                      minLength={6}
                    />
                  </div>
                  
                  {error && (
                    <div className="text-error text-sm">{error}</div>
                  )}
                  
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                  >
                    {isSignUp ? 'Registrati' : 'Accedi'}
                  </button>
                </form>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:underline text-sm"
                  >
                    {isSignUp 
                      ? 'Hai già un account? Accedi' 
                      : 'Non hai un account? Registrati'
                    }
                  </button>
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAuth(false)}
                    className="text-text-secondary hover:underline text-sm"
                  >
                    Torna indietro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth status bar */}
      <div className="bg-bg-secondary border-b border-gray-200 dark:border-gray-800 px-4 py-2">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center text-sm text-text-secondary">
            <User className="h-4 w-4 mr-2" />
            <span>Connesso come: {user.email}</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Esci
          </button>
        </div>
      </div>
      
      {children}
    </div>
  );
};

export default AuthWrapper;