'use client';

import App from '../../App';
import { UIProvider } from '../../contexts/UIContext';

export default function LibraryPage() {
  return (
    <UIProvider>
      <App initialView="library" />
    </UIProvider>
  );
}
