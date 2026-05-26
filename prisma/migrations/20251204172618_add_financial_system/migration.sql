-- CreateTable
CREATE TABLE "planilhas_financeiras" (
    "id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "valorMensalidade" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalReceitas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDespesas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoFinal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "criada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planilhas_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_mensalidade" (
    "id" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "planilhaId" TEXT NOT NULL,
    "quantidadeMeses" INTEGER NOT NULL DEFAULT 1,
    "valorPago" DECIMAL(65,30) NOT NULL,
    "mesesReferentes" TEXT NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_mensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receitas" (
    "id" TEXT NOT NULL,
    "planilhaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "planilhaId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planilhas_financeiras_mes_ano_key" ON "planilhas_financeiras"("mes", "ano");

-- AddForeignKey
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_planilhaId_fkey" FOREIGN KEY ("planilhaId") REFERENCES "planilhas_financeiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_planilhaId_fkey" FOREIGN KEY ("planilhaId") REFERENCES "planilhas_financeiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_planilhaId_fkey" FOREIGN KEY ("planilhaId") REFERENCES "planilhas_financeiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
