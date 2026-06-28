import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Import one-shot des GitHub issues du repo vers la table `idea` (migration
 * du système de vote GitHub → BDD).
 *
 * - Idempotent : upsert sur `githubIssueNumber`, relançable sans doublon.
 * - voteCount initial = réactions 👍 (ou nb de commentaires en fallback, qui
 *   correspond à l'ancien compteur « clap = commentaire +1 »).
 * - type = label `bug` > `media` > `feature` (cf. typeOf).
 * - status = `done` si l'issue est close, sinon `open`.
 *
 * Lancer : npx ts-node -r tsconfig-paths/register scripts/import-github-issues.ts
 * Requiert : DATABASE_URL (.env) et ATHENA_GITHUB_TOKEN.
 */

const REPO = 'hugoblanc/Athena';
const TOKEN = process.env.ATHENA_GITHUB_TOKEN;

interface GhLabel {
  name: string;
}
export interface GhIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  /** "completed" | "not_planned" | "reopened" | null (GitHub). */
  state_reason: string | null;
  comments: number;
  pull_request?: unknown;
  reactions?: { '+1'?: number };
  labels: GhLabel[];
  created_at: string;
}

/** Labels GitHub signalant un refus (close « won't do »). */
const REJECT_LABELS = new Set([
  'wontfix',
  "won't fix",
  'wont-fix',
  'duplicate',
  'invalid',
]);

/**
 * Mappe l'état GitHub → statut roadmap.
 * - ouvert → open (Proposé)
 * - fermé « not planned » OU label wontfix/duplicate/invalid → rejected (Refusé)
 * - fermé sinon (completed) → done (Terminé)
 */
function statusOf(issue: GhIssue): string {
  if (issue.state !== 'closed') return 'open';
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  const refused =
    issue.state_reason === 'not_planned' ||
    labels.some((l) => REJECT_LABELS.has(l));
  return refused ? 'rejected' : 'done';
}

export async function fetchAllIssues(): Promise<GhIssue[]> {
  const all: GhIssue[] = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://api.github.com/repos/${REPO}/issues?state=all&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(TOKEN ? { Authorization: `Token ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub ${res.status}: ${await res.text()}`);
    }
    const batch = (await res.json()) as GhIssue[];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  // Exclut les pull requests (l'API issues les inclut).
  return all.filter((i) => !i.pull_request);
}

/**
 * Mappe les labels GitHub → type d'idée (un seul `type` en BDD).
 * Priorité : `bug` > `media` > `feature` (défaut). Les demandes d'ajout de
 * média (label `media`, ~moitié des issues) doivent être distinguées des
 * idées de fonctionnalité, sinon l'onglet « Média » des clients reste vide.
 */
export function typeOf(issue: GhIssue): string {
  const names = issue.labels.map((l) => l.name.toLowerCase());
  if (names.includes('bug')) return 'bug';
  if (names.includes('media')) return 'media';
  return 'feature';
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const issues = await fetchAllIssues();
    console.log(`${issues.length} issue(s) récupérée(s) depuis ${REPO}`);

    let created = 0;
    let updated = 0;
    for (const issue of issues) {
      // L'ancien vote = 1 commentaire (clap = commentaire « +1 »). Le compteur
      // historiquement affiché côté app était donc `comments`. On prend le max
      // avec les réactions 👍 au cas où certaines issues en aient reçu.
      const voteCount = Math.max(
        issue.comments ?? 0,
        issue.reactions?.['+1'] ?? 0,
      );
      const data = {
        title: issue.title.slice(0, 200),
        body: issue.body ?? '',
        type: typeOf(issue),
        status: statusOf(issue),
        voteCount,
      };

      const existing = await prisma.idea.findUnique({
        where: { githubIssueNumber: issue.number },
        select: { id: true },
      });

      await prisma.idea.upsert({
        where: { githubIssueNumber: issue.number },
        create: { ...data, githubIssueNumber: issue.number },
        update: data,
      });

      if (existing) updated++;
      else created++;
    }

    console.log(`Import terminé : ${created} créée(s), ${updated} mise(s) à jour.`);
    process.exit(0);
  } catch (error: any) {
    console.error('Erreur import:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-exécution uniquement en lancement direct (pas si importé par un autre
// script, ex. recategorize-idea-types.ts qui réutilise typeOf/fetchAllIssues).
if (require.main === module) {
  main();
}
