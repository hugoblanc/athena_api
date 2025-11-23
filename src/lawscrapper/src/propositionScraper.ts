import axios from 'axios';
import * as cheerio from 'cheerio';
import type { PropositionLoi, Depute, Section, Article } from './types.js';
import { normalizeGroupePolitique } from './types.js';
import { DeputeScraper } from './deputeScraper.js';

/**
 * Service principal de scraping des propositions de loi
 * Compatible NestJS - Ajouter @Injectable() et injecter DeputeScraper lors de l'intégration
 */
export class PropositionScraper {
  private readonly baseUrl = 'https://www.assemblee-nationale.fr';
  private readonly userAgent = 'LawScraper/1.0 (Educational Project)';
  private deputeScraper: DeputeScraper;

  constructor() {
    this.deputeScraper = new DeputeScraper();
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extrait l'ID du document depuis l'URL
   * Ex: pion2124.asp -> PIONANR5L17B2124
   */
  private extractDocumentId(url: string, numero: string): string {
    // Format: PIONANR5L17BXXXX où XXXX est le numéro
    return `PIONANR5L17B${numero}`;
  }

  /**
   * Récupère les métadonnées depuis le JSON opendata
   */
  private async fetchMetadata(docId: string): Promise<any> {
    const url = `${this.baseUrl}/dyn/opendata/${docId}.json`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch metadata for ${docId}`);
      return null;
    }
  }

  /**
   * Récupère le contenu HTML depuis le fichier .raw
   */
  private async fetchRawContent(docId: string): Promise<string | null> {
    const url = `${this.baseUrl}/dyn/docs/${docId}.raw`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch raw content for ${docId}`);
      return null;
    }
  }

  /**
   * Récupère les infos des auteurs depuis le carrousel
   */
  private async fetchAuteursFromCarrousel(docId: string): Promise<Depute | null> {
    const url = `${this.baseUrl}/dyn/embed/documents/${docId}/carrousel-auteurs`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);

      // Le premier auteur est l'auteur principal
      // Chercher dans les slides du swiper carousel
      const premierAuteur = $('.swiper-slide .an-bloc, .an-bloc, .depute-card, .auteur-card, .card').first();

      if (premierAuteur.length === 0) {
        return null;
      }

      // Extraire tous les textes significatifs de la carte
      const allTextNodes = premierAuteur.find('*').map((i, el) => {
        const text = $(el).clone().children().remove().end().text().trim();
        return text;
      }).get().filter(t => t && t.length > 3 && t.length < 150); // Filtrer les textes significatifs

      // Le premier texte est généralement le nom, le deuxième le groupe
      const nom = allTextNodes[0] || '';
      const groupe = allTextNodes[1] || '';

      const photoImg = premierAuteur.find('img').first();
      const photoUrl = photoImg.attr('src');

      const groupePolitique = groupe || 'Non spécifié';

      return {
        nom: nom || 'Inconnu',
        groupePolitique,
        groupePolitiqueCode: normalizeGroupePolitique(groupePolitique),
        photoUrl: photoUrl ?
          (photoUrl.startsWith('http') ? photoUrl : `${this.baseUrl}${photoUrl}`)
          : undefined,
      };
    } catch (error) {
      console.error(`Failed to fetch carrousel for ${docId}:`, error);
      return null;
    }
  }

  /**
   * Nettoie le texte HTML
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Parse le contenu HTML pour extraire les sections
   */
  private parseContent(html: string): Section[] {
    const $ = cheerio.load(html);
    const sections: Section[] = [];

    // Chercher "EXPOSÉ DES MOTIFS"
    $('p.assnat4titreintit').each((i, el) => {
      const titre = $(el).text().trim();

      if (titre.includes('EXPOSÉ DES MOTIFS')) {
        // Récupérer tous les paragraphes suivants jusqu'à la prochaine section
        let texte = '';
        let current = $(el).next();

        while (current.length > 0 && !current.hasClass('assnat4titreintit')) {
          const paragraphText = current.text().trim();
          if (paragraphText && current.prop('tagName') === 'P') {
            texte += paragraphText + '\n\n';
          }
          current = current.next();
        }

        if (texte) {
          sections.push({
            type: 'expose_motifs',
            titre: 'EXPOSÉ DES MOTIFS',
            texte: this.cleanText(texte),
          });
        }
      }
    });

    // Chercher les articles
    const articles: Article[] = [];
    $('p.assnat9ArticleNum').each((i, el) => {
      const articleNumero = $(el).text().trim();

      // Récupérer le contenu de l'article
      let texte = '';
      let current = $(el).next();

      while (current.length > 0 && !current.hasClass('assnat9ArticleNum')) {
        const text = current.text().trim();
        if (text && current.prop('tagName') === 'P') {
          texte += text + '\n\n';
        }
        current = current.next();
      }

      if (texte) {
        articles.push({
          numero: articleNumero,
          texte: this.cleanText(texte),
        });
      }
    });

    if (articles.length > 0) {
      sections.push({
        type: 'articles',
        titre: 'ARTICLES',
        texte: articles.map(a => `${a.numero}\n\n${a.texte}`).join('\n\n'),
        articles,
      });
    }

    return sections;
  }

  /**
   * Extrait les informations de l'auteur depuis les métadonnées JSON
   */
  private async fetchAuteurInfo(acteurRef: string): Promise<Depute> {
    // TODO: Implémenter l'appel à l'API des acteurs pour récupérer les détails
    // Pour l'instant, retourner un objet basique
    return {
      nom: 'À récupérer',
      groupePolitique: 'À récupérer',
    };
  }

  /**
   * Scrape une proposition complète en combinant JSON et .raw
   */
  async scrapeProposition(url: string): Promise<PropositionLoi | null> {
    try {
      console.log(`\n📄 Scraping: ${url}`);

      // Extraire le numéro depuis l'URL
      const numeroMatch = url.match(/pion(\d+)/i);
      if (!numeroMatch) {
        console.error('Cannot extract numero from URL');
        return null;
      }
      const numero = numeroMatch[1];

      // Construire l'ID du document
      const docId = this.extractDocumentId(url, numero);
      console.log(`   Document ID: ${docId}`);

      // 1. Récupérer les métadonnées JSON
      console.log('   Fetching metadata...');
      const metadata = await this.fetchMetadata(docId);

      if (!metadata) {
        console.error('   ❌ Failed to fetch metadata');
        return null;
      }

      // 2. Récupérer le contenu .raw
      console.log('   Fetching content...');
      const rawHtml = await this.fetchRawContent(docId);

      if (!rawHtml) {
        console.error('   ❌ Failed to fetch content');
        return null;
      }

      // 3. Parser les données
      const titre = metadata.titres?.titrePrincipalCourt || metadata.titres?.titrePrincipal || '';
      const legislature = metadata.legislature || '17';
      const typeProposition = metadata.classification?.sousType?.code === 'CONST'
        ? 'constitutionnelle'
        : 'ordinaire';

      // Date de dépôt
      const dateDepot = metadata.cycleDeVie?.chrono?.dateDepot;
      const dateMiseEnLigne = dateDepot
        ? new Date(dateDepot).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR');

      // Auteur principal - récupérer depuis le carrousel
      console.log('   Fetching auteur info...');
      const auteurFromCarrousel = await this.fetchAuteursFromCarrousel(docId);

      const auteur: Depute = auteurFromCarrousel || {
        nom: 'Inconnu',
        groupePolitique: 'Non spécifié',
      };

      // Co-signataires
      let coSignataires: Depute[] | undefined;
      const coSigs = metadata.coSignataires?.coSignataire;

      if (coSigs && Array.isArray(coSigs) && coSigs.length > 0) {
        console.log(`   Fetching ${coSigs.length} co-signataires...`);

        const coSigRefs = coSigs.map((cs: any) => cs.acteur?.acteurRef).filter(Boolean);

        if (coSigRefs.length > 0) {
          const deputesMap = await this.deputeScraper.fetchMultipleDeputes(coSigRefs);
          coSignataires = Array.from(deputesMap.values());
        }
      }

      // Parser le contenu
      const sections = this.parseContent(rawHtml);

      // URL dossier législatif
      const dossierRef = metadata.dossierRef;
      const urlDossierLegislatif = dossierRef
        ? `${this.baseUrl}/dyn/17/dossiers/${dossierRef}`
        : undefined;

      const proposition: PropositionLoi = {
        numero,
        titre,
        legislature,
        typeProposition,
        dateMiseEnLigne,
        auteur,
        coSignataires,
        sections,
        description: metadata.notice?.formule,
        urlDocument: url,
        urlDossierLegislatif,
        dateScraping: new Date().toISOString(),
        version: '1.0',
      };

      console.log(`   ✅ Success`);
      console.log(`      - Titre: ${titre.substring(0, 60)}...`);
      console.log(`      - Type: ${typeProposition}`);
      console.log(`      - Auteur: ${auteur.nom}`);
      if (coSignataires && coSignataires.length > 0) {
        console.log(`      - Co-signataires: ${coSignataires.length}`);
      }
      console.log(`      - Sections: ${sections.length}`);

      if (sections.length > 0) {
        sections.forEach(s => {
          console.log(`        • ${s.titre} (${s.texte.length} chars)`);
          if (s.articles) {
            console.log(`          → ${s.articles.length} article(s)`);
          }
        });
      }

      return proposition;

    } catch (error) {
      console.error('Error scraping proposition:', error);
      return null;
    }
  }

  /**
   * Scrape plusieurs propositions avec rate limiting
   */
  async scrapeMultiple(urls: string[], delayMs: number = 2000): Promise<PropositionLoi[]> {
    const propositions: PropositionLoi[] = [];

    for (let i = 0; i < urls.length; i++) {
      const prop = await this.scrapeProposition(urls[i]);

      if (prop) {
        propositions.push(prop);
      }

      // Rate limiting
      if (i < urls.length - 1) {
        console.log(`\n⏳ Waiting ${delayMs}ms...\n`);
        await this.delay(delayMs);
      }
    }

    return propositions;
  }
}
