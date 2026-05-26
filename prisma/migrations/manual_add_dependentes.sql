-- Migration: Add Dependentes table
-- Run this SQL manually if Prisma migrate is not working

CREATE TABLE IF NOT EXISTS "dependentes" (
    "id" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "tipoDependente" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TEXT,
    "dataCasamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependentes_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "dependentes" ADD CONSTRAINT "dependentes_membroId_fkey"
    FOREIGN KEY ("membroId") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
