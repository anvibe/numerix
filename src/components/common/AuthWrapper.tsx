import React, { useState, useEffect } from 'react';
import { User, LogIn, LogOut, UserPlus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { showToast } from '../../utils/toast';
import NumberAnimation from './NumberAnimation';

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

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
    // Handle email confirmation callback from URL
    const handleEmailConfirmation = async () => {
      // Check for Supabase email confirmation tokens in URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const type = urlParams.get('type');
      
      if (type === 'signup' && token) {
        // User clicked email confirmation link
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup',
          });
          
          if (error) {
            setError('Errore durante la conferma email: ' + error.message);
            setShowAuth(true);
          } else {
            showToast.success('Email confermata con successo! Ora puoi effettuare il login.');
            // Clear URL parameters
            window.history.replaceState(null, '', window.location.pathname);
            setIsSignUp(false);
            setShowAuth(true);
            setEmailConfirmationSent(false);
          }
        } catch (error) {
          setError('Errore durante la conferma email');
          setShowAuth(true);
        }
      }
    };
    
    handleEmailConfirmation();
    
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
        // Only set user if email is confirmed
        if (session?.user?.email_confirmed_at) {
          setUser(session.user);
        } else {
          // If user exists but email not confirmed, sign them out
          if (session?.user) {
            supabase.auth.signOut();
          }
          setUser(null);
        }
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
      } else if (event === 'SIGNED_IN') {
        // Check if user email is confirmed
        if (session?.user && !session.user.email_confirmed_at) {
          // Email not confirmed, sign out
          supabase.auth.signOut();
          setUser(null);
          setError('La tua email deve essere confermata prima di accedere. Controlla la tua casella email.');
          return;
        }
      }
      
      // Only set user if email is confirmed
      if (session?.user?.email_confirmed_at) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        // Sign out if email not confirmed
        await supabase.auth.signOut();
        setError('La tua email deve essere confermata prima di accedere. Controlla la tua casella email e clicca sul link di conferma.');
        return;
      }
      
      setShowAuth(false);
      setEmail('');
      setPassword('');
      setEmailConfirmationSent(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore durante il login';
      if (errorMessage.includes('Email not confirmed') || errorMessage.includes('email_not_confirmed')) {
        setError('La tua email deve essere confermata prima di accedere. Controlla la tua casella email e clicca sul link di conferma.');
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        // Email confirmation required
        setEmailConfirmationSent(true);
        showToast.success('Email di conferma inviata! Controlla la tua casella email e clicca sul link per confermare il tuo account.');
        // Don't switch to login, stay on signup form but show confirmation message
        setPassword('');
      } else {
        // If email confirmation is disabled (shouldn't happen in production)
        showToast.success('Registrazione completata! Puoi ora effettuare il login.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore durante la registrazione');
      setEmailConfirmationSent(false);
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
      <div className="min-h-screen bg-bg-primary relative overflow-hidden">
        <NumberAnimation />
        <div className="container mx-auto px-4 py-8 relative z-10 flex items-center justify-center min-h-screen">
          <div className="max-w-md mx-auto w-full">
            {!showAuth ? (
              <div className="card text-center bg-bg-primary/90 backdrop-blur-sm shadow-xl border-2 border-gray-300 dark:border-gray-700">
                <div className="mb-6">
                  {/* Ball style logo with letter N */}
                  <div className="flex items-center justify-center mb-4">
                    <svg width="80" height="80" viewBox="0 0 64 64" className="mx-auto">
                      <defs>
                        <radialGradient id="logoGradient" cx="0.3" cy="0.35">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="50%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1e40af" />
                        </radialGradient>
                        <filter id="logoShadow">
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
                      <circle cx="32" cy="32" r="28" fill="url(#logoGradient)" filter="url(#logoShadow)"/>
                      
                      {/* Highlight ellipse */}
                      <ellipse cx="24" cy="24" rx="22" ry="14" fill="#ffffff" opacity="0.18" transform="rotate(-35 32 32)"/>
                      
                      {/* White border */}
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2"/>
                      
                      {/* Letter N */}
                      <text x="32" y="42" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#ffffff" textAnchor="middle" filter="url(#logoShadow)">N</text>
                    </svg>
                  </div>
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
              <div className="card bg-bg-primary/90 backdrop-blur-sm shadow-xl border-2 border-gray-300 dark:border-gray-700">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
                      placeholder="tua@email.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-md bg-bg-primary"
                        placeholder="Password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="text-error text-sm bg-error/10 border border-error/20 rounded-md p-3">{error}</div>
                  )}
                  
                  {emailConfirmationSent && (
                    <div className="bg-primary/10 border border-primary/30 rounded-md p-4 text-sm">
                      <div className="font-semibold text-primary mb-2">📧 Email di conferma inviata!</div>
                      <div className="text-text-secondary mb-3">
                        Abbiamo inviato un'email di conferma a <strong>{email}</strong>.
                        <br />
                        Controlla la tua casella email e clicca sul link per confermare il tuo account.
                        <br />
                        Dopo la conferma, potrai effettuare il login.
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { error } = await supabase.auth.resend({
                              type: 'signup',
                              email: email,
                            });
                            if (error) throw error;
                            showToast.success('Email di conferma inviata di nuovo!');
                          } catch (error) {
                            showToast.error('Errore durante l\'invio della email: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
                          }
                        }}
                        className="text-primary hover:underline text-xs"
                      >
                        Non hai ricevuto l'email? Invia di nuovo
                      </button>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={emailConfirmationSent}
                  >
                    {isSignUp ? 'Registrati' : 'Accedi'}
                  </button>
                </form>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setEmailConfirmationSent(false);
                      setError('');
                    }}
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
                    onClick={() => {
                      setShowAuth(false);
                      setEmailConfirmationSent(false);
                      setError('');
                    }}
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