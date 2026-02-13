import React, { useState, useEffect, useRef } from 'react';
import { User, LogIn, LogOut, Eye, EyeOff } from 'lucide-react';
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
  const justSignedUpRef = useRef(false); // Use ref to prevent auto-login after signup

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
      const hash = window.location.hash;
      
      // Try different token formats
      const token = urlParams.get('token') || urlParams.get('token_hash');
      const type = urlParams.get('type');
      
      // Check hash for tokens (Supabase sometimes uses hash)
      let hashToken = null;
      let hashType = null;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        hashToken = hashParams.get('access_token') || hashParams.get('token');
        hashType = hashParams.get('type');
      }
      
      const finalToken = token || hashToken;
      const finalType = type || hashType || 'signup';
      
      if (finalToken) {
        // User clicked email confirmation link
        try {
          console.log('Attempting email confirmation...', { finalType, hasToken: !!finalToken });
          
          // Try verifyOtp first (for new format)
          let confirmResult = await supabase.auth.verifyOtp({
            token_hash: finalToken,
            type: 'signup',
          });
          
          // If that fails, try the exchangeSessionForTokens method
          if (confirmResult.error) {
            console.log('verifyOtp failed, trying alternative method...', confirmResult.error);
            // Try using the token directly in the URL
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
              // Try to exchange the token
              const { data: exchangeData, error: exchangeError } = await supabase.auth.getUser();
              if (exchangeError) {
                throw confirmResult.error; // Use original error
              }
            }
          }
          
          if (confirmResult.error) {
            setError('Errore durante la conferma email: ' + confirmResult.error.message);
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
          console.error('Email confirmation error:', error);
          setError('Errore durante la conferma email: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
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
            console.log('Initial session found but email not confirmed, signing out...');
            supabase.auth.signOut();
            clearInvalidTokens();
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, { hasSession: !!session, emailConfirmed: session?.user?.email_confirmed_at });
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        clearInvalidTokens();
        setUser(null);
        setLoading(false);
        return;
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // CRITICAL: Block any sign-in if we just signed up (prevents auto-login)
        if (justSignedUpRef.current) {
          console.log('Blocking sign-in after signup, forcing sign out...');
          await supabase.auth.signOut();
          clearInvalidTokens();
          setUser(null);
          setLoading(false);
          return;
        }
        
        // CRITICAL: Check if user email is confirmed FIRST
        if (session?.user) {
          if (!session.user.email_confirmed_at) {
            // Email not confirmed, sign out immediately and block access
            console.log('Email not confirmed, signing out immediately...', { event, userId: session.user.id });
            await supabase.auth.signOut();
            clearInvalidTokens();
            setUser(null);
            setLoading(false);
            
            if (event === 'SIGNED_IN') {
              setError('La tua email deve essere confermata prima di accedere. Controlla la tua casella email.');
              setShowAuth(true);
            }
            return; // Exit early, don't set user
          } else {
            // Email is confirmed, allow access
            setUser(session.user);
            setLoading(false);
            return;
          }
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
      // Sign up with email and password only
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          // Use the new confirmation method
          data: {
            redirect_to: `${window.location.origin}/`,
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        throw error;
      }
      
      console.log('Signup response:', { 
        hasUser: !!data.user, 
        hasSession: !!data.session,
        emailConfirmed: data.user?.email_confirmed_at,
        email: data.user?.email,
        userId: data.user?.id
      });
      
      // Check if email confirmation is required but user was auto-confirmed
      // This happens when "Enable email confirmations" is OFF in Supabase
      if (data.user && data.user.email_confirmed_at && !data.session) {
        console.warn('User was auto-confirmed without email confirmation. This means "Enable email confirmations" is disabled in Supabase.');
      }
      
      // CRITICAL: Immediately sign out to prevent auto-login
      // Supabase may create a session even if email confirmation is required
      // We must sign out immediately after signup, regardless of email_confirmed_at
      
      // Set flag to prevent any user state from being set
      justSignedUpRef.current = true;
      
      // Sign out immediately
      await supabase.auth.signOut();
      clearInvalidTokens();
      
      // Force clear any session state
      setUser(null);
      
      // Reset flag after a short delay to allow signout to complete
      setTimeout(() => {
        justSignedUpRef.current = false;
      }, 3000);
      
      // Check if user was created
      if (data.user) {
        // Check if email was already confirmed (means email confirmation is disabled in Supabase)
        if (data.user.email_confirmed_at) {
          console.warn('⚠️ Email confirmation is DISABLED in Supabase. User was auto-confirmed.');
          setError('⚠️ Email confirmation non è abilitata in Supabase. Controlla le impostazioni di autenticazione.');
          // Still show confirmation message but warn user
          setEmailConfirmationSent(true);
        } else {
          // Email confirmation is enabled - normal flow
          console.log('✅ Email confirmation enabled. User must confirm email.');
          setEmailConfirmationSent(true);
          showToast.success('Registrazione completata! Controlla la tua casella email per confermare il tuo account.');
        }
        
        // Clear password but keep email so user can see where confirmation was sent
        setPassword('');
        
        // Force user to stay on auth screen
        setShowAuth(true);
        setIsSignUp(true);
      } else {
        // This shouldn't happen, but handle it
        console.error('No user returned from signup');
        setError('Errore durante la registrazione. Riprova.');
      }
    } catch (error) {
      console.error('Signup error:', error);
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
                    Per utilizzare l'applicazione e salvare i tuoi dati, effettua l'accesso.
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
                </div>
              </div>
            ) : (
              <div className="card bg-bg-primary/90 backdrop-blur-sm shadow-xl border-2 border-gray-300 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Accesso</h2>
                
                <form onSubmit={handleSignIn} className="space-y-4">
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
                            console.log('Resending confirmation email to:', email);
                            const { data, error } = await supabase.auth.resend({
                              type: 'signup',
                              email: email,
                              options: {
                                emailRedirectTo: `${window.location.origin}/`,
                              }
                            });
                            if (error) {
                              console.error('Resend error:', error);
                              throw error;
                            }
                            console.log('Resend success:', data);
                            showToast.success('Email di conferma inviata di nuovo! Controlla la tua casella email.');
                          } catch (error) {
                            console.error('Resend error:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
                            showToast.error('Errore durante l\'invio della email: ' + errorMessage);
                            setError('Errore invio email: ' + errorMessage);
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
                  >
                    Accedi
                  </button>
                </form>
                
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