'use client';

import App from '../App';
import { UIProvider } from '../contexts/UIContext';

export default function Home() {
  return (
    <UIProvider>
      <App />
    </UIProvider>
  );
}
