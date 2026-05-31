'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LoginModal } from '../components/LoginModal';
import { Loader2 } from 'lucide-react';

// Dynamic load of the main App editor to prevent SSR "window is not defined" Fabric.js errors
const MainAppEditor = dynamic(
  () => import('../App').then((mod) => mod.App),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="font-sans font-bold text-slate-400">Đang khởi tạo Canvas Workspace...</span>
      </div>
    )
  }
);

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('lumibooth_auth_token');
    const savedUser = localStorage.getItem('lumibooth_username');
    
    if (token) {
      setIsAuthenticated(true);
      setUsername(savedUser || 'Admin');
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };

  // Prevent flash before hydration checks are finished
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginModal onSuccess={handleLoginSuccess} />;
  }

  return <MainAppEditor />;
}
