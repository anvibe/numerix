@@ .. @@
 import React from 'react';
 import { Dices } from 'lucide-react';
 import ThemeToggle from './ThemeToggle';
+import ApiStatus from './ApiStatus';
 
 const Header: React.FC = () => {
   return (
@@ .. @@
         </div>
         
         <div className="flex items-center space-x-4">
+          <ApiStatus />
           <ThemeToggle />
         </div>
       </div>