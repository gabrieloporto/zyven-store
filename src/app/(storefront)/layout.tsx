import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
