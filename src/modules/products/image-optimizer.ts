import 'server-only';
import sharp from 'sharp';
import { AppError } from '@/lib/errors';

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB

export interface OptimizedProductImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
  extension: 'webp';
}

/**
 * Optimiza imágenes de catálogo en el servidor convirtiéndolas a WebP (máx. 1600x1600, calidad 82).
 * Evita depender de Supabase Image Transformations (que requiere Plan Pro) y ahorra ~80% de Storage y Egress.
 */
export async function optimizeProductImageToWebp(
  inputBuffer: Buffer
): Promise<OptimizedProductImage> {
  if (inputBuffer.byteLength === 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'El archivo de imagen está vacío.',
    });
  }

  if (inputBuffer.byteLength > MAX_INPUT_BYTES) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'La imagen supera el tamaño máximo permitido de 10 MB.',
    });
  }

  const pipeline = sharp(inputBuffer, { failOn: 'error' })
    .rotate() // Respeta orientación EXIF
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    contentType: 'image/webp',
    extension: 'webp',
  };
}
