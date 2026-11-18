/**
 * Fuente de verdad de identidad visual, ubicación operativa y recursos multimedia de Zyven Store.
 * Los recursos originales permanecen intactos en /zyven-multimedia y se sirven desde /public/brand.
 */

export const ZYVEN_BRAND = {
  name: 'Zyven Store',
  tagline: 'Tecnología, estilo y mucho más',
  subtitle: 'Todo lo que buscás, en un solo lugar.',
  locale: 'es-AR',
  currency: 'ARS',
  colors: {
    white: '#FFFFFF',
    black: '#111111',
    violet: '#7B19EC',
  },
  location: {
    locality: 'Alejandro Korn',
    party: 'San Vicente',
    province: 'Buenos Aires',
    postalCode: '1864',
    country: 'Argentina',
    countryCode: 'AR',
    warehouseCode: 'ALEJANDRO_KORN',
  },
  assets: {
    logoTransparent: {
      src: '/brand/zyven-logo-transparente.webp',
      width: 486,
      height: 182,
      alt: 'Zyven Store',
    },
    logoBlackBg: {
      src: '/brand/zyven-logo-fondo-negro.webp',
      width: 486,
      height: 182,
      alt: 'Zyven Store',
    },
    heroBanner: {
      src: '/brand/zyven-banner-principal-v2.webp',
      width: 1920,
      height: 640,
      alt: 'Zyven Store — Tecnología, estilo y mucho más. Todo lo que buscás, en un solo lugar.',
    },
    faviconIco: '/favicon.ico',
    favicon32: '/brand/zyven-favicon-32.webp',
    favicon512: '/brand/zyven-favicon-512.webp',
    appleTouchIcon180: '/brand/zyven-apple-touch-icon-180.webp',
  },
} as const;
