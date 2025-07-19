@@ .. @@
 import React from 'react';
 import { ThemeProvider } from './context/ThemeContext';
 import { GameProvider } from './context/GameContext';
+import ErrorBoundary from './components/common/ErrorBoundary';
 import Header from './components/common/Header';
 import Footer from './components/common/Footer';
 import Dashboard from './pages/Dashboard';
 
 function App() {
   return (
-    <ThemeProvider>
-      <GameProvider>
-        <div className="min-h-screen flex flex-col">
-          <Header />
-          <main className="flex-1 bg-bg-primary">
-            <Dashboard />
-          </main>
-          <Footer />
-        </div>
-      </GameProvider>
-    </ThemeProvider>
+    <ErrorBoundary>
+      <ThemeProvider>
+        <GameProvider>
+          <div className="min-h-screen flex flex-col">
+            <Header />
+            <main className="flex-1 bg-bg-primary">
+              <Dashboard />
+            </main>
+            <Footer />
+          </div>
+        </GameProvider>
+      </ThemeProvider>
+    </ErrorBoundary>
   );
 }