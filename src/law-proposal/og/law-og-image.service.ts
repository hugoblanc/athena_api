import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { LawProposalDetailDto } from '../dtos/law-proposal-response.dto';

/**
 * Génère l'image Open Graph (1200x630) d'une proposition de loi.
 *
 * Pipeline : on construit un arbre d'éléments (style flexbox), `satori` le rend
 * en SVG, puis `@resvg/resvg-js` (binding Rust natif, faible empreinte mémoire)
 * le rastérise en PNG. Aucune dépendance navigateur, aucun wasm lourd → adapté
 * à un petit VPS.
 *
 * Charte reprise de la PWA : fond sombre #0a0a0f, orange de marque #fc743a,
 * police Space Grotesk. Style « risograph » : aplats francs + bloc décalé.
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BRAND = '#fc743a';
const BG = '#0a0a0f';
const TEXT = '#f4f4f6';
const TEXT_DIM = '#9a9aa8';

/** Mini-hyperscript : produit la forme d'élément attendue par satori. */
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
export class LawOgImageService {
  private readonly logger = new Logger(LawOgImageService.name);
  private fonts: { name: string; data: Buffer; weight: 500 | 700; style: 'normal' }[] = [];
  private fontsReady = false;
  /** Texture sérigraphie (halftone) en data URI, ou null si absente. */
  private risoDataUri: string | null = null;

  constructor() {
    this.loadFonts();
    this.loadTexture();
  }

  /** Charge la texture riso. Échec non bloquant (carte sans texture). */
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

  /** Charge les polices une fois. Échec non fatal : on désactive la génération. */
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
        `Polices OG introuvables (public/og-fonts) — génération OG désactivée: ${err}`,
      );
      this.fontsReady = false;
    }
  }

  get available(): boolean {
    return this.fontsReady;
  }

  /** Génère le PNG OG d'une loi. Retourne le Buffer prêt à persister/servir. */
  async generate(proposal: LawProposalDetailDto): Promise<Buffer> {
    if (!this.fontsReady) {
      throw new Error('Polices OG non chargées');
    }

    const element = this.buildCard(proposal);
    // satori type sa signature avec ReactNode ; notre arbre minimal est
    // structurellement compatible (type + props.children).
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

  /** Construit l'arbre visuel de la carte. */
  private buildCard(p: LawProposalDetailDto): SatoriNode {
    const titre = truncate(clean(p.titre), 150);
    const typeLabel = formatType(p.typeProposition);
    // L'API renvoie parfois "Inconnu" / "Non spécifié" (scraping HTML sans
    // données député) → on bascule sur un libellé neutre plutôt qu'afficher ça.
    const rawNom = clean(p.auteur?.nom || '');
    const auteurNom = rawNom && !/^inconnu$/i.test(rawNom) ? rawNom : null;
    const rawGroupe = clean(p.auteur?.groupePolitique || '');
    const groupe =
      rawGroupe && !/^non spécifié$/i.test(rawGroupe) ? rawGroupe : null;
    const keyPoint =
      p.simplified?.status === 'completed' && p.simplified.keyPoints?.length
        ? truncate(clean(p.simplified.keyPoints[0]), 120)
        : null;

    // --- Calques décoratifs (peints AVANT le contenu, donc en arrière-plan) ---

    // Texture sérigraphie plein cadre.
    const texture = this.risoDataUri
      ? h('img', {
          position: 'absolute',
          top: 0,
          left: 0,
          width: OG_WIDTH,
          height: OG_HEIGHT,
        } as Record<string, unknown>, undefined)
      : '';
    if (texture && typeof texture !== 'string') {
      (texture as { props: Record<string, unknown> }).props.src = this.risoDataUri;
    }

    // Gros N° en filigrane (motif graphique, bas-droite, débordant).
    const bigNumber = h(
      'div',
      {
        position: 'absolute',
        bottom: -110,
        right: -20,
        display: 'flex',
        fontSize: 400,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: -8,
        color: 'rgba(252,116,58,0.10)',
        // évite le retour à la ligne
        whiteSpace: 'nowrap',
      },
      `${clean(p.numero)}`,
    );

    // --- Contenu (flux normal) ---

    // Monogramme Athena (carré orange + A blanc) + wordmark.
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
            width: 68,
            height: 68,
            backgroundColor: BRAND,
            borderRadius: 18,
          },
          h(
            'div',
            {
              display: 'flex',
              fontSize: 46,
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
            marginLeft: 18,
            fontSize: 32,
            fontWeight: 700,
            color: TEXT,
          },
          'Athena',
        ),
      ],
    );

    const header = h(
      'div',
      { display: 'flex', alignItems: 'center', width: '100%' },
      brandMark,
    );

    const content = h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flexGrow: 1,
      },
      [
        // Kicker
        h(
          'div',
          {
            display: 'flex',
            marginBottom: 22,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: 3,
            color: BRAND,
          },
          `N° ${clean(p.numero)}   ·   ${typeLabel}`,
        ),
        // Titre
        h(
          'div',
          {
            display: 'flex',
            fontSize: titre.length > 90 ? 52 : 62,
            fontWeight: 700,
            lineHeight: 1.1,
            color: TEXT,
          },
          titre,
        ),
        keyPoint
          ? h(
              'div',
              {
                display: 'flex',
                marginTop: 24,
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1.3,
                color: TEXT_DIM,
              },
              `« ${keyPoint} »`,
            )
          : '',
      ],
    );

    const footer = h(
      'div',
      { display: 'flex', flexDirection: 'column' },
      [
        h(
          'div',
          { display: 'flex', fontSize: 26, fontWeight: 700, color: TEXT },
          auteurNom ?? 'Assemblée nationale',
        ),
        groupe
          ? h(
              'div',
              {
                display: 'flex',
                fontSize: 22,
                fontWeight: 500,
                color: TEXT_DIM,
                marginTop: 4,
              },
              groupe,
            )
          : '',
      ],
    );

    return h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: BG,
        fontFamily: 'Space Grotesk',
        padding: 72,
        position: 'relative',
      },
      [texture, bigNumber, header, content, footer],
    );
  }
}

/** Nettoie les espaces/sauts de ligne d'un texte scrapé. */
function clean(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Libellé de type lisible. L'API renvoie souvent une forme courte
 * ("ordinaire", "constitutionnelle") → on préfixe "PROPOSITION DE LOI".
 */
function formatType(type?: string): string {
  const t = clean(type || '').toLowerCase();
  if (!t) return 'PROPOSITION DE LOI';
  if (t.includes('proposition')) return t.toUpperCase();
  return `PROPOSITION DE LOI ${t}`.toUpperCase();
}

/** Tronque proprement sur la limite de caractères, avec ellipsis. */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
