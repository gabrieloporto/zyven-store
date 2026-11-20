import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { CartProvider } from '@/components/storefront/CartProvider';
import { getActiveCartDetailed } from '@/modules/cart/service';

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialCart = await getActiveCartDetailed();

  return (
    <CartProvider initialCart={initialCart}>
      <div className="flex min-h-screen flex-col bg-white text-[#111111]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
