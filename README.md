# Lumibooth AI Frame Designer

Lumibooth AI Frame Designer is a premium, high-performance interactive web application built with **React**, **Next.js**, **TypeScript**, and **Fabric.js** to design highly customizable layouts and templates for DSLR and photo booth installations.

It leverages artificial intelligence to assist creators in building professional layouts, utilizing a responsive studio canvas, a dynamic design inspector, custom layers, asset search, and various advanced export configurations.

---

## ✨ Features

- **Interactive Canvas Editor**: Fully-featured vector and raster canvas powered by Fabric.js supporting selection, scaling, rotations, custom shapes, layers, and text formatting.
- **Smart AI Integration**: Built-in support for generative AI capabilities using Google Gemini (`@google/generative-ai`) to help style, modify, and auto-compose frame borders and assets.
- **Asset/Template Management**: Easily search, drag, and manage background overlays, placeholders, frames, and typography assets.
- **Advanced Export System**: Clean export tools to compile and pack designs into DSLRbooth-compatible formats or zip archives (using `jszip`).
- **Modern User Interface**: Responsive dark-mode interface utilizing TailwindCSS, glassmorphism aesthetics, fluid micro-interactions, and Lucide React icons.
- **Supabase Integration**: Authenticate users and save designs/assets securely with Supabase databases and storage.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (version 18+ recommended) and npm installed.

### Installation

1. Navigate to the project directory:
   ```bash
   cd tool-template-dslr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build and Production

To build a production-ready application:

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```text
tool-template-dslr/
├── src/
│   ├── app/           # Next.js App Router (pages, layout, APIs)
│   ├── components/    # Reusable studio & UI components (CanvasEditor, Inspector, Sidebar, etc.)
│   ├── constants/     # Global configurations, dimensions, static assets
│   ├── hooks/         # Custom React hooks (canvas controllers, state sync)
│   ├── services/      # Supabase and AI integration layers
│   ├── utils/         # Helper functions (zipping, calculations, export tools)
│   └── index.css      # Core style definitions and Tailwind directives
├── public/            # Static public assets (fonts, icons, presets)
├── next.config.mjs    # Next.js configurations
└── tailwind.config.js # Custom design tokens and styling themes
```

---

## 🛠️ Built With

- **Framework**: [Next.js](https://nextjs.org/) (React 18)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Canvas Engine**: [Fabric.js](http://fabricjs.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database/Auth**: [Supabase](https://supabase.com/)
- **AI Backend**: [Google Generative AI SDK](https://github.com/google-gemini/generative-ai-js)
