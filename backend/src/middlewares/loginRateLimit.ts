import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BLOCK_MINUTES = parseInt(process.env.LOGIN_BLOCK_MINUTES || '15', 10);

export async function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const correo = req.body.correo?.toLowerCase();
  if (!correo) return next();

  const recientes = await prisma.intentoLogin.findMany({
    where: { correo },
    orderBy: { intentadoEn: 'desc' },
    take: 3,
  });

  if (recientes.length >= 3 && recientes.every(i => !i.exitoso)) {
    const ultimo = recientes[0].intentadoEn;
    const bloqueo = new Date(ultimo.getTime() + BLOCK_MINUTES * 60 * 1000);
    if (new Date() < bloqueo) {
      return res.status(429).json({ error: 'Cuenta bloqueada. Intenta más tarde.' });
    }
  }

  next();
}

export async function registrarIntento(correo: string, exitoso: boolean) {
  await prisma.intentoLogin.create({
    data: { correo: correo.toLowerCase(), exitoso },
  });
}
