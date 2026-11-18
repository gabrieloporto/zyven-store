'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ZYVEN_BRAND } from '@/lib/brand';
import { signInAction } from '@/modules/customers/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/cuenta';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await signInAction({ email, password });
      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }
      router.push(nextPath.startsWith('/') ? nextPath : '/cuenta');
      router.refresh();
    });
  }

  return (
    <>
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-[#111111]"
          >
            Correo electrónico
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#111111]"
            >
              Contraseña
            </label>
            <Link
              href="/recuperar-clave"
              className="text-xs font-medium text-[#7B19EC] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-xs">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-4 rounded-xl bg-[#111111] px-5 py-3">
            <Image
              src={ZYVEN_BRAND.assets.logoTransparent.src}
              alt={ZYVEN_BRAND.assets.logoTransparent.alt}
              width={ZYVEN_BRAND.assets.logoTransparent.width}
              height={ZYVEN_BRAND.assets.logoTransparent.height}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Ingresá a tu cuenta de {ZYVEN_BRAND.name}
          </p>
        </div>

        <Suspense fallback={<div className="h-44 animate-pulse rounded-lg bg-neutral-100" />}>
          <LoginForm />
        </Suspense>

        <div className="border-t border-neutral-200 pt-4 text-center text-sm text-neutral-600">
          ¿Todavía no tenés cuenta?{' '}
          <Link
            href="/registro"
            className="font-semibold text-[#7B19EC] hover:underline"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
