import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Change le statut d'une ou plusieurs idées (roadmap) directement en base.
 * Plus léger qu'un back-office : à lancer à la demande.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/set-idea-status.ts <statut> <id...>
 *
 * Exemples :
 *   set-idea-status.ts rejected 240 241 242     # refuser 3 idées (par id)
 *   set-idea-status.ts in_progress 12           # passer #12 en cours
 *   set-idea-status.ts planned 7                 # valider #7
 *
 * Astuce : l'id d'une idée est dans l'URL de sa page détail (/roadmap/<id>).
 * Statuts : open | planned | in_progress | done | rejected
 */

const STATUSES = ['open', 'planned', 'in_progress', 'done', 'rejected'];

async function main() {
  const [status, ...idArgs] = process.argv.slice(2);

  if (!status || !STATUSES.includes(status)) {
    console.error(
      `Statut invalide. Usage: set-idea-status.ts <statut> <id...>\n` +
        `Statuts valides : ${STATUSES.join(' | ')}`,
    );
    process.exit(1);
  }
  const ids = idArgs.map((a) => Number(a)).filter((n) => Number.isFinite(n));
  if (ids.length === 0) {
    console.error('Aucun id valide fourni.');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
  });
  try {
    for (const id of ids) {
      const idea = await prisma.idea.findUnique({
        where: { id },
        select: { id: true, title: true, status: true },
      });
      if (!idea) {
        console.warn(`#${id} introuvable, ignoré.`);
        continue;
      }
      await prisma.idea.update({ where: { id }, data: { status } });
      console.log(
        `#${id} « ${idea.title.slice(0, 50)} » : ${idea.status} → ${status}`,
      );
    }
    process.exit(0);
  } catch (e: any) {
    console.error('Erreur:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
