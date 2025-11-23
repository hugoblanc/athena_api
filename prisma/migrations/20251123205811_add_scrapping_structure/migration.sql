-- CreateTable
CREATE TABLE "depute" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "groupePolitique" TEXT NOT NULL,
    "groupePolitiqueCode" TEXT NOT NULL,
    "photoUrl" TEXT,
    "urlDepute" TEXT,
    "acteurRef" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "law_proposal" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "titre" VARCHAR(500) NOT NULL,
    "legislature" TEXT NOT NULL,
    "typeProposition" TEXT NOT NULL,
    "dateMiseEnLigne" DATE NOT NULL,
    "dateDepot" DATE,
    "description" TEXT,
    "urlDocument" TEXT NOT NULL,
    "urlDossierLegislatif" TEXT,
    "dateScraping" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "simplifiedData" JSONB,
    "simplificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "auteurId" INTEGER NOT NULL,

    CONSTRAINT "law_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "lawProposalId" INTEGER NOT NULL,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "titre" TEXT,
    "texte" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amendement" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "auteur" TEXT,
    "statut" TEXT,
    "url" TEXT,
    "lawProposalId" INTEGER NOT NULL,

    CONSTRAINT "amendement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_coSignataires" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_coSignataires_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "depute_acteurRef_key" ON "depute"("acteurRef");

-- CreateIndex
CREATE INDEX "depute_nom_groupePolitiqueCode_idx" ON "depute"("nom", "groupePolitiqueCode");

-- CreateIndex
CREATE INDEX "depute_groupePolitiqueCode_idx" ON "depute"("groupePolitiqueCode");

-- CreateIndex
CREATE UNIQUE INDEX "law_proposal_numero_key" ON "law_proposal"("numero");

-- CreateIndex
CREATE INDEX "law_proposal_dateMiseEnLigne_idx" ON "law_proposal"("dateMiseEnLigne" DESC);

-- CreateIndex
CREATE INDEX "law_proposal_typeProposition_idx" ON "law_proposal"("typeProposition");

-- CreateIndex
CREATE INDEX "law_proposal_simplificationStatus_idx" ON "law_proposal"("simplificationStatus");

-- CreateIndex
CREATE INDEX "law_proposal_auteurId_dateMiseEnLigne_idx" ON "law_proposal"("auteurId", "dateMiseEnLigne" DESC);

-- CreateIndex
CREATE INDEX "_coSignataires_B_index" ON "_coSignataires"("B");

-- AddForeignKey
ALTER TABLE "law_proposal" ADD CONSTRAINT "law_proposal_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "depute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_lawProposalId_fkey" FOREIGN KEY ("lawProposalId") REFERENCES "law_proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article" ADD CONSTRAINT "article_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendement" ADD CONSTRAINT "amendement_lawProposalId_fkey" FOREIGN KEY ("lawProposalId") REFERENCES "law_proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_coSignataires" ADD CONSTRAINT "_coSignataires_A_fkey" FOREIGN KEY ("A") REFERENCES "depute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_coSignataires" ADD CONSTRAINT "_coSignataires_B_fkey" FOREIGN KEY ("B") REFERENCES "law_proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
