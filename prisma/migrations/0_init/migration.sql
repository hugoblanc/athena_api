-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

-- CreateEnum
CREATE TYPE "content_contenttype_enum" AS ENUM ('YOUTUBE', 'WORDPRESS');

-- CreateEnum
CREATE TYPE "meta_media_type_enum" AS ENUM ('YOUTUBE', 'WORDPRESS');

-- CreateTable
CREATE TABLE "audio" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(250) NOT NULL,

    CONSTRAINT "PK_9562215b41192ae4ccdf314a789" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" SERIAL NOT NULL,
    "contentId" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "contentType" "content_contenttype_enum" NOT NULL,
    "description" TEXT NOT NULL,
    "plainText" TEXT,
    "publishedAt" TIMESTAMP(6) NOT NULL,
    "metaMediaId" INTEGER,
    "imageId" INTEGER,
    "audioId" INTEGER,

    CONSTRAINT "PK_6a2083913f3647b44f205204e36" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_embedding" (
    "id" SERIAL NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentId" INTEGER,
    "embedding" vector,

    CONSTRAINT "PK_8751627137e4cf599e9540cf002" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(250) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "PK_d6db1ab4ee9ad9dbe86c64e4cc3" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_meta_media" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(45) NOT NULL,

    CONSTRAINT "PK_9241a45bd81f6164dc9900a060a" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_media" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(30) NOT NULL,
    "url" VARCHAR(45) NOT NULL,
    "title" VARCHAR(45) NOT NULL,
    "logo" VARCHAR(150) NOT NULL,
    "donation" VARCHAR(100),
    "type" "meta_media_type_enum" NOT NULL,
    "listMetaMediaId" INTEGER,

    CONSTRAINT "PK_b50efa8772f8e47168bfe333009" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_jobs" (
    "id" VARCHAR(36) NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "sources" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "PK_1f6700d4c4d62b3b64811e20e1d" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UQ_d7bb829fd67079083772143c538" ON "content"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "REL_cd03caa6e34f3c76d9f1039353" ON "content"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "REL_b61086a972af81f27dae9cb889" ON "content"("audioId");

-- CreateIndex
CREATE INDEX "content-title-idx" ON "content"("title");

-- CreateIndex
CREATE INDEX "idx_chunk_index" ON "content_embedding"("chunkIndex");

-- CreateIndex
CREATE INDEX "idx_embedding_hnsw" ON "content_embedding"("embedding");

-- CreateIndex
CREATE UNIQUE INDEX "idx_content_chunk" ON "content_embedding"("contentId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_c9e1f4c700f5daa532a21f042bd" ON "meta_media"("key");

-- CreateIndex
CREATE INDEX "idx_created_at" ON "qa_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_status" ON "qa_jobs"("status");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "FK_b61086a972af81f27dae9cb889e" FOREIGN KEY ("audioId") REFERENCES "audio"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "FK_cd03caa6e34f3c76d9f1039353c" FOREIGN KEY ("imageId") REFERENCES "image"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "FK_dab6b32533309beba9df825c9a4" FOREIGN KEY ("metaMediaId") REFERENCES "meta_media"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content_embedding" ADD CONSTRAINT "FK_63d470d74b8b1aa5027f00cdd43" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meta_media" ADD CONSTRAINT "FK_fbaf618ec510913d002f58bf666" FOREIGN KEY ("listMetaMediaId") REFERENCES "list_meta_media"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

