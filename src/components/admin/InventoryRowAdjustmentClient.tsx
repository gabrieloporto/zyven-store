'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, CheckCircle2, AlertTriangle } from 'lucide-react';
import { recordInventoryAdjustmentAction } from '@/modules/products/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function InventoryRowAdjustmentClient({
  variantId,
  sku,
  lowStockThreshold,
}: {
  variantId: string;
  sku: string;
  lowStockThreshold: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [movementType, setMovementType] = useState<
    'purchase_entry' | 'manual_adjustment_in' | 'manual_adjustment_out'
  >('purchase_entry');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState(String(lowStockThreshold));
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await recordInventoryAdjustmentAction({
        variantId,
        movementType,
        quantity: Number(quantity),
        reason: reason.trim(),
        lowStockThreshold: threshold.trim() ? Number(threshold) : undefined,
        idempotencyKey: `inv-page:${variantId}:${Date.now()}:${Math.random()
          .toString(36)
          .slice(2, 7)}`,
      });

      if (!res.ok) {
        setFeedback({ type: 'err', text: res.error.message });
        return;
      }

      setQuantity('1');
      setReason('');
      setFeedback({
        type: 'ok',
        text: `Actualizado: físico ${res.data.newOnHand} u.`,
      });
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setFeedback(null);
          setOpen(true);
        }}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Ajustar
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-[260px] rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold text-[#7B19EC]">
          Ajuste {sku}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-neutral-500 hover:underline cursor-pointer"
        >
          Cerrar
        </button>
      </div>

      <select
        value={movementType}
        onChange={(e) =>
          setMovementType(
            e.target.value === 'manual_adjustment_out'
              ? 'manual_adjustment_out'
              : e.target.value === 'manual_adjustment_in'
                ? 'manual_adjustment_in'
                : 'purchase_entry'
          )
        }
        className="h-8 w-full rounded-md border border-neutral-300 bg-white px-2 text-xs"
      >
        <option value="purchase_entry">+ Ingreso / Reposición</option>
        <option value="manual_adjustment_in">+ Ajuste positivo</option>
        <option value="manual_adjustment_out">- Ajuste negativo</option>
      </select>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min="1"
          step="1"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Cant."
          className="h-8 bg-white text-xs"
        />
        <Input
          type="number"
          min="0"
          step="1"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Alerta"
          title="Umbral de stock bajo"
          className="h-8 bg-white text-xs"
        />
      </div>

      <Input
        required
        minLength={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (ej. Reposición)"
        className="h-8 bg-white text-xs"
      />

      {feedback ? (
        <p
          className={`flex items-center gap-1 text-[11px] ${
            feedback.type === 'err' ? 'text-red-600' : 'text-emerald-700'
          }`}
        >
          {feedback.type === 'err' ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </p>
      ) : null}

      <Button
        type="submit"
        size="sm"
        disabled={isPending || reason.trim().length < 4}
        className="h-8 w-full text-xs"
      >
        {isPending ? 'Guardando...' : 'Aplicar ajuste'}
      </Button>
    </form>
  );
}
