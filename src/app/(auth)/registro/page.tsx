'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ZYVEN_BRAND } from '@/lib/brand';
import { signUpAction } from '@/modules/customers/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await signUpAction({
        fullName,
        phone: phone || undefined,
        email,
        password,
      });

      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }

      if (result.data.requiresEmailConfirmation) {
        setSuccessMessage(
          '¡Cuenta creada! Revisá tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.'
        );
      } else {
        router.push('/cuenta');
        router.refresh();
      }
    });
  }

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
          <h1 className="text-2xl font-bold text-[#111111]">Crear cuenta</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Registrate para seguir tus pedidos y guardar tus direcciones
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="fullName"
                className="text-sm font-medium text-[#111111]"
              >
                Nombre y apellido
              </label>
              <Input
                id="fullName"
                name="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Martín Gómez"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-[#111111]"
              >
                Teléfono / WhatsApp (opcional)
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 11 5555-4444"
              />
            </div>

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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[#111111]"
              >
                Contraseña (mínimo 8 caracteres)
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creando cuenta...' : 'Registrarme'}
            </Button>
          </form>
        )}

        <div className="border-t border-neutral-200 pt-4 text-center text-sm text-neutral-600">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="font-semibold text-[#7B19EC] hover:underline"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
