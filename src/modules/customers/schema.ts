import { z } from 'zod';

export const ARGENTINE_PROVINCES = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const;

export const documentTypeSchema = z.enum(['DNI', 'CUIT', 'CUIL']);

export const argentineDocumentNumberSchema = z
  .string()
  .trim()
  .regex(
    /^\d{7,11}$/,
    'Ingresá un número de DNI o CUIT/CUIL válido (solo números, sin puntos ni guiones).'
  );

export const argentinePostalCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^([A-Z]?\d{4}[A-Z]{0,3})$/,
    'Ingresá un código postal argentino válido (ej. 1864 o B1864).'
  );

export const signInSchema = z.object({
  email: z.string().trim().email('Ingresá un correo electrónico válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export const signUpSchema = signInSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(3, 'Ingresá tu nombre y apellido completo.')
    .max(100),
  phone: z
    .string()
    .trim()
    .min(8, 'Ingresá un teléfono de contacto válido.')
    .max(25)
    .optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Ingresá un correo electrónico válido.'),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Ingresá tu nombre y apellido completo.')
    .max(100),
  phone: z
    .string()
    .trim()
    .min(8, 'Ingresá un teléfono de contacto válido.')
    .max(25),
  documentType: documentTypeSchema,
  documentNumber: argentineDocumentNumberSchema,
});

export const customerAddressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  recipientName: z
    .string()
    .trim()
    .min(3, 'Ingresá el nombre y apellido de quien recibe.')
    .max(100),
  phone: z
    .string()
    .trim()
    .min(8, 'Ingresá un teléfono de contacto válido.')
    .max(25),
  streetName: z
    .string()
    .trim()
    .min(2, 'Ingresá la calle.')
    .max(120),
  streetNumber: z
    .string()
    .trim()
    .min(1, 'Ingresá la altura (o S/N).')
    .max(20),
  floorApt: z.string().trim().max(40).optional(),
  betweenStreets: z.string().trim().max(140).optional(),
  locality: z
    .string()
    .trim()
    .min(2, 'Ingresá la localidad.')
    .max(80),
  partyDepartment: z.string().trim().max(80).optional(),
  province: z.enum(ARGENTINE_PROVINCES, {
    errorMap: () => ({ message: 'Seleccioná una provincia válida.' }),
  }),
  postalCode: argentinePostalCodeSchema,
  referenceNotes: z.string().trim().max(240).optional(),
  isDefault: z.boolean().default(false),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
