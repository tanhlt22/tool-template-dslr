import { Outfit } from 'next/font/google';
import '../index.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
});

export const metadata = {
  title: 'HaiVuStudio Frame Designer',
  description: 'Design dynamic layouts, texts, and stickers with Google Gemini Imagen 3',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${outfit.variable} font-sans`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-slate-900 text-slate-100 antialiased overflow-hidden w-screen h-screen">
        {children}
      </body>
    </html>
  );
}
