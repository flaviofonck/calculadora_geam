import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const nodoSchema = z.object({
  nombre: z.string().min(1),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export const tramoSchema = z.object({
  origenId: z.string().min(1),
  destinoId: z.string().min(1),
  transportadorId: z.string().min(1),
  tipo: z.string().min(1),
  fijos: z.number(),
  variables: z.number(),
  aom: z.number(),
}).refine(d => d.origenId !== d.destinoId, {
  message: 'El origen y el destino no pueden ser el mismo nodo',
  path: ['destinoId'],
});

export const transportadorSchema = z.object({
  nombre: z.string().min(1),
  color: z.string().min(1),
});

export const estampillaSchema = z.object({
  transportadorId: z.string().min(1),
  fijos: z.number(),
  variables: z.number(),
  aom: z.number(),
});

export const parametroSchema = z.object({
  clave: z.string().min(1),
  valor: z.number(),
});

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Payload inválido', details: result.error.issues });
    }
    req.body = result.data;
    next();
  };
}
