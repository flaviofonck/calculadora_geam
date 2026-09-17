-- CreateTable
CREATE TABLE "Nodo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "creadoPor" TEXT NOT NULL DEFAULT 'seed',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transportador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Transportador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tramo" (
    "id" TEXT NOT NULL,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "transportadorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fijos" DOUBLE PRECISION NOT NULL,
    "variables" DOUBLE PRECISION NOT NULL,
    "aom" DOUBLE PRECISION NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" TEXT NOT NULL DEFAULT 'seed',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estampilla" (
    "transportadorId" TEXT NOT NULL,
    "fijos" DOUBLE PRECISION NOT NULL,
    "variables" DOUBLE PRECISION NOT NULL,
    "aom" DOUBLE PRECISION NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" TEXT NOT NULL DEFAULT 'seed',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estampilla_pkey" PRIMARY KEY ("transportadorId")
);

-- CreateTable
CREATE TABLE "ParametroTarifario" (
    "clave" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" TEXT NOT NULL DEFAULT 'seed',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametroTarifario_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hashPassword" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoLogin" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "intentadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitoso" BOOLEAN NOT NULL,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "valorAntes" JSONB,
    "valorDespues" JSONB,
    "hechoPor" TEXT NOT NULL,
    "hechoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nodo_nombre_key" ON "Nodo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Transportador_nombre_key" ON "Transportador"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Tramo_origenId_destinoId_key" ON "Tramo"("origenId", "destinoId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_correo_key" ON "AdminUser"("correo");

-- CreateIndex
CREATE INDEX "IntentoLogin_correo_intentadoEn_idx" ON "IntentoLogin"("correo", "intentadoEn");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_hechoEn_idx" ON "AuditLog"("entidad", "hechoEn");

-- AddForeignKey
ALTER TABLE "Tramo" ADD CONSTRAINT "Tramo_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Nodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramo" ADD CONSTRAINT "Tramo_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Nodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramo" ADD CONSTRAINT "Tramo_transportadorId_fkey" FOREIGN KEY ("transportadorId") REFERENCES "Transportador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estampilla" ADD CONSTRAINT "Estampilla_transportadorId_fkey" FOREIGN KEY ("transportadorId") REFERENCES "Transportador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
