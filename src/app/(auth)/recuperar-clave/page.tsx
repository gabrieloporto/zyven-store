'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction } from '@/modules/customers/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });
      if (!result.ok) {
        setErrorMessage(result.error.message);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-xs">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#111111]">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Ingresá tu email y te enviaremos un enlace para restablecer tu
            contraseña.
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

        {sent ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            Si el correo está registrado en Zyven Store, recibirás un enlace de
            recuperación en los próximos minutos.
          </div>
        ) : (
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
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </Button>
          </form>
        )}

        <div className="border-t border-neutral-200 pt-4 text-center text-sm">
          <Link
            href="/login"
            className="font-semibold text-[#7B19EC] hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
