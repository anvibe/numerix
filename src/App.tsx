import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { GameProvider } from './context/GameContext';
import AuthWrapper from './components/common/AuthWrapper';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Dashboard from './pages/Dashboard';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ToastProvider';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider />
        <AuthWrapper>
          <GameProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 bg-bg-primary">
                <Dashboard />
              </main>
              <Footer />
            </div>
          </GameProvider>
        </AuthWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;