import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

/**
 * Génère l'image Open Graph (1200x630) d'un CONTENU (article WordPress ou vidéo
 * YouTube) partagé. Pendant des lois (`law-og-image.service.ts`), même charte et
 * même pipeline (satori → SVG → resvg → PNG, faible empreinte RAM).
 *
 * Différence : un contenu a une miniature (YouTube/WordPress). On la rend en
 * `backgroundImage` (cover) sur un panneau droit — chemin satori le plus
 * robuste, pas de dimensions d'image requises (le handler ne renvoie pas
 * width/height). Si la miniature manque ou échoue, repli typographique
 * plein-cadre. Le nom du média est toujours mis en avant (valorise la source +
 * sert la boucle « médias = ambassadeurs »).
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BRAND = '#fc743a';
const BG = '#0a0a0f';
const TEXT = '#f4f4f6';
const TEXT_DIM = '#9a9aa8';

export interface ContentOgInput {
  title: string;
  /** Titre du média source (ex. « Le Média », « Blast »). */
  mediaTitle?: string | null;
  /** Type média source : `YOUTUBE` | `WORDPRESS`. */
  mediaType?: string | null;
  /** URL de la miniature (YouTube/WordPress), si disponible. */
  imageUrl?: string | null;
}

type SatoriNode =
  | string
  | { type: string; props: { style?: Record<string, unknown>; children?: unknown } };

function h(
  type: string,
  style: Record<string, unknown>,
  children?: SatoriNode | SatoriNode[],
): SatoriNode {
  return { type, props: { style, children } };
}

@Injectable()
export class ContentOgImageService {
  private readonly logger = new Logger(ContentOgImageService.name);
  private fonts: { name: string; data: Buffer; weight: 500 | 700; style: 'normal' }[] = [];
  private fontsReady = false;
  private risoDataUri: string | null = null;

  constructor() {
    this.loadFonts();
    this.loadTexture();
  }

  private loadTexture(): void {
    try {
      const png = readFileSync(
        join(process.cwd(), 'public', 'og-assets', 'riso.png'),
      );
      this.risoDataUri = `data:image/png;base64,${png.toString('base64')}`;
    } catch {
      this.risoDataUri = null;
    }
  }

  private loadFonts(): void {
    try {
      const dir = join(process.cwd(), 'public', 'og-fonts');
      this.fonts = [
        {
          name: 'Space Grotesk',
          data: readFileSync(join(dir, 'SpaceGrotesk-500.ttf')),
          weight: 500,
          style: 'normal',
        },
        {
          name: 'Space Grotesk',
          data: readFileSync(join(dir, 'SpaceGrotesk-700.ttf')),
          weight: 700,
          style: 'normal',
        },
      ];
      this.fontsReady = true;
    } catch (err) {
      this.logger.error(
        `Polices OG introuvables (public/og-fonts) — génération OG contenu désactivée: ${err}`,
      );
      this.fontsReady = false;
    }
  }

  get available(): boolean {
    return this.fontsReady;
  }

  /** Récupère une image distante et l'encode en data URI (ou null si échec). */
  private async fetchAsDataUri(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const type = res.headers.get('content-type') || 'image/jpeg';
      // On ne rastérise pas du SVG distant en arrière-plan (résultats erratiques).
      if (type.includes('svg')) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) return null;
      return `data:${type};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /** Génère le PNG OG d'un contenu. */
  async generate(input: ContentOgInput): Promise<Buffer> {
    if (!this.fontsReady) {
      throw new Error('Polices OG non chargées');
    }

    const thumb = input.imageUrl
      ? await this.fetchAsDataUri(input.imageUrl)
      : null;

    const element = this.buildCard(input, thumb);
    const svg = await satori(element as any, {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: this.fonts,
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: OG_WIDTH },
      font: { loadSystemFonts: false },
    });
    return Buffer.from(resvg.render().asPng());
  }

  private buildCard(input: ContentOgInput, thumb: string | null): SatoriNode {
    const title = truncate(clean(input.title), thumb ? 110 : 150);
    const media = clean(input.mediaTitle || '') || 'Média indépendant';
    const isVideo = (input.mediaType || '').toUpperCase() === 'YOUTUBE';
    const typeLabel = isVideo ? 'VIDÉO' : 'ARTICLE';
    const verb = isVideo ? 'à regarder' : 'à lire';

    // Texture sérigraphie plein cadre (arrière-plan).
    const texture =
      this.risoDataUri &&
      h(
        'img',
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: OG_WIDTH,
          height: OG_HEIGHT,
        } as Record<string, unknown>,
        undefined,
      );
    if (texture && typeof texture !== 'string') {
      (texture as { props: Record<string, unknown> }).props.src = this.risoDataUri;
    }

    // Monogramme Athena + wordmark.
    const brandMark = h(
      'div',
      { display: 'flex', alignItems: 'center' },
      [
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            backgroundColor: BRAND,
            borderRadius: 17,
          },
          h(
            'div',
            {
              display: 'flex',
              fontSize: 44,
              fontWeight: 700,
              color: '#ffffff',
              marginTop: -4,
            },
            'A',
          ),
        ),
        h(
          'div',
          {
            display: 'flex',
            marginLeft: 16,
            fontSize: 30,
            fontWeight: 700,
            color: TEXT,
          },
          'Athena',
        ),
      ],
    );

    // Colonne texte (gauche).
    const textColumn = h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        // Sans miniature : pleine largeur. Avec : ~58% pour laisser le panneau.
        width: thumb ? 660 : '100%',
        padding: 64,
      },
      [
        brandMark,
        h(
          'div',
          { display: 'flex', flexDirection: 'column' },
          [
            h(
              'div',
              {
                display: 'flex',
                marginBottom: 20,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
                color: BRAND,
              },
              `${typeLabel}   ·   ${media.toUpperCase()}`,
            ),
            h(
              'div',
              {
                display: 'flex',
                fontSize: title.length > 80 ? 50 : 60,
                fontWeight: 700,
                lineHeight: 1.12,
                color: TEXT,
              },
              title,
            ),
          ],
        ),
        h(
          'div',
          {
            display: 'flex',
            fontSize: 24,
            fontWeight: 500,
            color: TEXT_DIM,
          },
          `${verb} sur Athena · l'agrégateur des médias indépendants`,
        ),
      ],
    );

    const children: SatoriNode[] = [];
    if (texture) children.push(texture);
    children.push(textColumn);

    // Panneau miniature (droite) en cover, avec liseré orange à gauche.
    if (thumb) {
      children.push(
        h('div', {
          display: 'flex',
          width: OG_WIDTH - 660,
          height: '100%',
          borderLeft: `6px solid ${BRAND}`,
          backgroundImage: `url(${thumb})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      );
    }

    return h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: BG,
        fontFamily: 'Space Grotesk',
        position: 'relative',
      },
      children,
    );
  }
}

function clean(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
