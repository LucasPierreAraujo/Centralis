-- CreateTable
CREATE TABLE "membros" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grau" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);
