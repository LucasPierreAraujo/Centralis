/*
  Warnings:

  - Added the required column `tipoGasto` to the `despesas` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('FIXO', 'VARIAVEL');

-- AlterTable
ALTER TABLE "despesas" ADD COLUMN     "tipoGasto" "TipoGasto" NOT NULL;

-- AlterTable
ALTER TABLE "planilhas_financeiras" ADD COLUMN     "saldoFinalCaixa" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "saldoFinalTronco" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "saldoInicialCaixa" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "saldoInicialTronco" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "totalDoacoesFilantropicas" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTroncoRecebido" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tronco_beneficencia" (
    "id" TEXT NOT NULL,
    "planilhaId" TEXT NOT NULL,
    "grauSessao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "tronco_beneficencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doacoes_filantropicas" (
    "id" TEXT NOT NULL,
    "planilhaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "doacoes_filantropicas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tronco_beneficencia" ADD CONSTRAINT "tronco_beneficencia_planilhaId_fkey" FOREIGN KEY ("planilhaId") REFERENCES "planilhas_financeiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacoes_filantropicas" ADD CONSTRAINT "doacoes_filantropicas_planilhaId_fkey" FOREIGN KEY ("planilhaId") REFERENCES "planilhas_financeiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
