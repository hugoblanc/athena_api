import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Stockage des images OG pré-générées.
 *
 * Implémentation actuelle : **volume persistant local** (répertoire mappé par
 * CapRover, voir `OG_STORAGE_DIR`). L'interface reste volontairement minimale
 * pour basculer un jour vers un bucket objet (S3/GCS) sans toucher au reste :
 * il suffira d'une autre implémentation de `OgStorage`.
 */
export interface OgStorage {
  /** Le PNG existe-t-il déjà pour ce numéro ? */
  has(numero: string): Promise<boolean>;
  /** Lit le PNG (ou null si absent). */
  read(numero: string): Promise<Buffer | null>;
  /** Écrit/écrase le PNG. */
  write(numero: string, png: Buffer): Promise<void>;
}

/**
 * Répertoire de stockage. En prod, pointer vers le **Persistent Directory**
 * déclaré sur CapRover (ex. `/app/data/og`) pour survivre aux redéploiements.
 * Défaut : `./data/og` (présent en dev, gitignoré).
 */
const STORAGE_DIR =
  process.env.OG_STORAGE_DIR?.replace(/\/$/, '') ||
  join(process.cwd(), 'data', 'og');

@Injectable()
export class VolumeOgStorage implements OgStorage {
  private readonly logger = new Logger(VolumeOgStorage.name);
  private readonly dir = STORAGE_DIR;
  private ensured = false;

  /** Numéro -> nom de fichier sûr (les numéros AN sont alphanumériques). */
  private fileFor(numero: string): string {
    const safe = numero.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.dir, `loi-${safe}.png`);
  }

  private async ensureDir(): Promise<void> {
    if (this.ensured) return;
    await mkdir(this.dir, { recursive: true });
    this.ensured = true;
    this.logger.log(`Stockage OG: ${this.dir}`);
  }

  async has(numero: string): Promise<boolean> {
    try {
      const s = await stat(this.fileFor(numero));
      return s.isFile() && s.size > 0;
    } catch {
      return false;
    }
  }

  async read(numero: string): Promise<Buffer | null> {
    try {
      return await readFile(this.fileFor(numero));
    } catch {
      return null;
    }
  }

  async write(numero: string, png: Buffer): Promise<void> {
    await this.ensureDir();
    await writeFile(this.fileFor(numero), png);
  }
}

/** Token d'injection pour l'implémentation de stockage OG. */
export const OG_STORAGE = Symbol('OG_STORAGE');
