-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_admins" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "responsavel_nome" TEXT,
    "responsavel_email" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'pro',
    "max_avaliadores" INTEGER NOT NULL DEFAULT 5,
    "max_empresas" INTEGER NOT NULL DEFAULT 30,
    "max_obras" INTEGER NOT NULL DEFAULT 999,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliadores" (
    "id" TEXT NOT NULL,
    "consultoria_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'avaliador',
    "tipo_registro" TEXT,
    "registro_mte" TEXT,
    "crea" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avaliadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_clientes" (
    "id" TEXT NOT NULL,
    "consultoria_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "cnae" TEXT,
    "grau_risco" TEXT,
    "responsavel_nome" TEXT,
    "responsavel_cargo" TEXT,
    "responsavel_email" TEXT,
    "avaliador_responsavel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "consultoria_id" TEXT NOT NULL,
    "empresa_cliente_id" TEXT,
    "avaliador_id" TEXT,
    "name" TEXT NOT NULL,
    "etapa" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "empresa_nome" TEXT,
    "empresa_cnpj" TEXT,
    "num_funcionarios" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obra_empreiteiras" (
    "id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "consultoria_id" TEXT,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "num_funcionarios" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obra_empreiteiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistorias" (
    "id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "consultoria_id" TEXT NOT NULL,
    "avaliador_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data_vistoria" TEXT NOT NULL,
    "clima" TEXT,
    "etapa_obra" TEXT,
    "observacoes_gerais" TEXT,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "total_itens" INTEGER NOT NULL DEFAULT 0,
    "total_conformes" INTEGER NOT NULL DEFAULT 0,
    "total_nao_conformes" INTEGER NOT NULL DEFAULT 0,
    "total_na" INTEGER NOT NULL DEFAULT 0,
    "indice_conformidade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "classificacao" TEXT,
    "parecer_ia" TEXT,
    "parecer_editado" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoria_itens" (
    "id" TEXT NOT NULL,
    "vistoria_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "bloco_id" TEXT NOT NULL,
    "bloco_titulo" TEXT,
    "item_texto" TEXT,
    "item_ref" TEXT,
    "item_nivel" TEXT,
    "item_perigo" TEXT,
    "item_multa" TEXT,
    "item_nr_texto" TEXT,
    "item_etapa" TEXT,
    "item_tipo_verificacao" TEXT,
    "item_evidencias" JSONB NOT NULL DEFAULT '[]',
    "item_aplicabilidade" TEXT,
    "item_criterio" TEXT,
    "status" TEXT NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistoria_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoria_item_empresas" (
    "id" TEXT NOT NULL,
    "vistoria_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "empresa_tipo" TEXT NOT NULL,
    "empreiteira_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vistoria_item_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoria_fotos" (
    "id" TEXT NOT NULL,
    "vistoria_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "item_id" TEXT,
    "vistoria_item_id" TEXT,
    "storage_path" TEXT NOT NULL,
    "filename" TEXT,
    "mime_type" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'nc',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vistoria_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "master_admins_email_key" ON "master_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "avaliadores_email_key" ON "avaliadores"("email");

