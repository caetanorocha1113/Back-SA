-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "perfil" TEXT NOT NULL DEFAULT 'usuario';

-- CreateTable
CREATE TABLE "Transacao" (
    "id" SERIAL NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'concluida',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transacao_usuarioId_data_idx" ON "Transacao"("usuarioId", "data");

-- CreateIndex
CREATE INDEX "Transacao_usuarioId_tipo_data_idx" ON "Transacao"("usuarioId", "tipo", "data");

-- CreateIndex
CREATE INDEX "Transacao_usuarioId_categoria_idx" ON "Transacao"("usuarioId", "categoria");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
