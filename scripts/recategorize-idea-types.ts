import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { fetchAllIssues, typeOf } from './import-github-issues';

/**
 * Rattrapage one-shot : re-catégorise le `type` des idées importées de GitHub.
 *
 * Contexte : l'ancien `typeOf` rabattait tout label non-`bug` sur `feature`,
 * donc les ~144 demandes d'ajout de média (label `media`) ont été stockées en
 * `type = 'feature'` → l'onglet « Média » des clients est vide et l'onglet
 * « Idées » est pollué. Ce script relit les labels GitHub (source de vérité) et
 * remet le bon `type` sur chaque idée, identifiée par `githubIssueNumber`.
 *
 * Sûr : ne touche QUE le champ `type`. Ne réécrit pas `voteCount` (qui vit
 * désormais en BDD via IdeaVote et ne doit pas être écrasé), ni `status`, ni le
 * texte. Idempotent : relançable sans effet de bord.
 *
 * Lancer : npx ts-node -r tsconfig-paths/register scripts/recategorize-idea-types.ts
 * Requiert : DATABASE_URL (.env) et ATHENA_GITHUB_TOKEN.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const issues = await fetchAllIssues();
    console.log(`${issues.length} issue(s) récupérée(s) depuis GitHub`);

    let changed = 0;
    let unchanged = 0;
    let missing = 0;
    const transitions: Record<string, number> = {};

    for (const issue of issues) {
      const newType = typeOf(issue);
      const idea = await prisma.idea.findUnique({
        where: { githubIssueNumber: issue.number },
        select: { id: true, type: true },
      });

      if (!idea) {
        missing++;
        continue;
      }
      if (idea.type === newType) {
        unchanged++;
        continue;
      }

      await prisma.idea.update({
        where: { id: idea.id },
        data: { type: newType },
      });
      const key = `${idea.type} → ${newType}`;
      transitions[key] = (transitions[key] ?? 0) + 1;
      changed++;
    }

    console.log('Transitions de type :');
    for (const [key, count] of Object.entries(transitions)) {
      console.log(`  ${key} : ${count}`);
    }
    console.log(
      `Rattrapage terminé : ${changed} re-catégorisée(s), ${unchanged} inchangée(s), ${missing} absente(s) en BDD.`,
    );
    process.exit(0);
  } catch (error: any) {
    console.error('Erreur rattrapage:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
