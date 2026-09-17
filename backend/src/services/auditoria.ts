export async function registrarAuditoria(
  db: { auditLog: { create: (args: any) => Promise<any> } },
  data: {
    entidad: string;
    entidadId: string;
    accion: 'crear' | 'editar' | 'eliminar';
    valorAntes?: any;
    valorDespues?: any;
    hechoPor: string;
  }
) {
  await db.auditLog.create({
    data: {
      entidad: data.entidad,
      entidadId: data.entidadId,
      accion: data.accion,
      valorAntes: data.valorAntes ?? null,
      valorDespues: data.valorDespues ?? null,
      hechoPor: data.hechoPor,
    },
  });
}
