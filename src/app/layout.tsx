import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ZYVEN_BRAND } from '@/lib/brand';

const montserrat = localFont({
  src: '../assets/fonts/montserrat-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ),
  title: {
    default: `${ZYVEN_BRAND.name} | ${ZYVEN_BRAND.tagline}`,
    template: `%s | ${ZYVEN_BRAND.name}`,
  },
  description:
    'Tienda oficial de Zyven Store. Perfumes originales, auriculares, parlantes, tecnología e indumentaria con envíos a todo el país desde Alejandro Korn, Buenos Aires.',
  icons: {
    icon: [
      { url: ZYVEN_BRAND.assets.faviconIco, sizes: 'any' },
      {
        url: ZYVEN_BRAND.assets.favicon32,
        type: 'image/webp',
        sizes: '32x32',
      },
      {
        url: ZYVEN_BRAND.assets.favicon512,
        type: 'image/webp',
        sizes: '512x512',
      },
    ],
    apple: [
      {
        url: ZYVEN_BRAND.assets.appleTouchIcon180,
        sizes: '180x180',
        type: 'image/webp',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: ZYVEN_BRAND.name,
    title: `${ZYVEN_BRAND.name} — ${ZYVEN_BRAND.tagline}`,
    description: ZYVEN_BRAND.subtitle,
    images: [
      {
        url: ZYVEN_BRAND.assets.heroBanner.src,
        width: ZYVEN_BRAND.assets.heroBanner.width,
        height: ZYVEN_BRAND.assets.heroBanner.height,
        alt: ZYVEN_BRAND.assets.heroBanner.alt,
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={montserrat.variable}
    >
      <body className="min-h-screen flex flex-col bg-white text-[#111111] antialiased selection:bg-[#7B19EC] selection:text-white">
        {children}
      </body>
    </html>
  );
}
