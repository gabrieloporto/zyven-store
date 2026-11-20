'use client';

import {
  createContext,
  useContext,
  useState,
  useTransition,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  addToCartAction,
  updateCartItemQuantityAction,
  removeCartItemAction,
} from '@/modules/cart/actions';
import type { CartDetailedView } from '@/modules/cart/service';
import { CartPreviewModal } from './CartPreviewModal';

interface CartContextValue {
  cart: CartDetailedView;
  isModalOpen: boolean;
  isPending: boolean;
  errorMessage: string | null;
  openCartModal: () => void;
  closeCartModal: () => void;
  clearError: () => void;
  addItem: (
    variantId: string,
    quantityToAdd?: number,
    options?: { openModal?: boolean }
  ) => Promise<boolean>;
  setItemQuantity: (variantId: string, quantity: number) => Promise<boolean>;
  removeItem: (variantId: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartDetailedView;
  children: ReactNode;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartDetailedView>(initialCart);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCart(initialCart);
  }, [initialCart]);

  function openCartModal() {
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function closeCartModal() {
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  function clearError() {
    setErrorMessage(null);
  }

  function addItem(
    variantId: string,
    quantityToAdd = 1,
    options?: { openModal?: boolean }
  ): Promise<boolean> {
    setErrorMessage(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await addToCartAction({ variantId, quantityToAdd });
        if (!res.ok) {
          setErrorMessage(res.error.message);
          resolve(false);
          return;
        }
        setCart(res.data);
        if (options?.openModal !== false) {
          setIsModalOpen(true);
        }
        router.refresh();
        resolve(true);
      });
    });
  }

  function setItemQuantity(
    variantId: string,
    quantity: number
  ): Promise<boolean> {
    setErrorMessage(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await updateCartItemQuantityAction({ variantId, quantity });
        if (!res.ok) {
          setErrorMessage(res.error.message);
          resolve(false);
          return;
        }
        setCart(res.data);
        router.refresh();
        resolve(true);
      });
    });
  }

  function removeItem(variantId: string): Promise<boolean> {
    setErrorMessage(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await removeCartItemAction({ variantId });
        if (!res.ok) {
          setErrorMessage(res.error.message);
          resolve(false);
          return;
        }
        setCart(res.data);
        router.refresh();
        resolve(true);
      });
    });
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        isModalOpen,
        isPending,
        errorMessage,
        openCartModal,
        closeCartModal,
        clearError,
        addItem,
        setItemQuantity,
        removeItem,
      }}
    >
      {children}
      <CartPreviewModal />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe utilizarse dentro de un CartProvider.');
  }
  return ctx;
}
