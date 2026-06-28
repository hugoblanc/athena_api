import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Stockage des images OG pré-générées des CONTENUS (articles / vidéos).
 *
 * Même principe que le stockage OG des lois (volume persistant local mappé par
 * CapRover, cf. `OG_STORAGE_DIR`) mais clé composite `(key, contentId)` et
 * préfixe de fichier dédié (`content-…`) pour cohabiter dans le même volume
 * sans collision avec les `loi-….png`.
 *
 * Volontairement séparé de `VolumeOgStorage` (lois) : ne pas toucher au chemin
 * OG des lois déjà en prod.
 */
export interface ContentOgStorage {
  has(key: string, contentId: string): Promise<boolean>;
  read(key: string, contentId: string): Promise<Buffer | null>;
  write(key: string, contentId: string, png: Buffer): Promise<void>;
}

const STORAGE_DIR =
  process.env.OG_STORAGE_DIR?.replace(/\/$/, '') ||
  join(process.cwd(), 'data', 'og');

@Injectable()
export class VolumeContentOgStorage implements ContentOgStorage {
  private readonly logger = new Logger(VolumeContentOgStorage.name);
  private readonly dir = STORAGE_DIR;
  private ensured = false;

  /** (clé média, contentId) -> nom de fichier sûr. */
  private fileFor(key: string, contentId: string): string {
    const safe = `${key}-${contentId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.dir, `content-${safe}.png`);
  }

  private async ensureDir(): Promise<void> {
    if (this.ensured) return;
    await mkdir(this.dir, { recursive: true });
    this.ensured = true;
    this.logger.log(`Stockage OG contenu: ${this.dir}`);
  }

  async has(key: string, contentId: string): Promise<boolean> {
    try {
      const s = await stat(this.fileFor(key, contentId));
      return s.isFile() && s.size > 0;
    } catch {
      return false;
    }
  }

  async read(key: string, contentId: string): Promise<Buffer | null> {
    try {
      return await readFile(this.fileFor(key, contentId));
    } catch {
      return null;
    }
  }

  async write(key: string, contentId: string, png: Buffer): Promise<void> {
    await this.ensureDir();
    await writeFile(this.fileFor(key, contentId), png);
  }
}

/** Token d'injection pour le stockage OG des contenus. */
export const CONTENT_OG_STORAGE = Symbol('CONTENT_OG_STORAGE');
