import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Depute } from './types';
import { normalizeGroupePolitique } from './types';

/**
 * Service de scraping des informations sur les députés
 */
@Injectable()
export class DeputeScraper {
  private readonly baseUrl = 'https://www.assemblee-nationale.fr';
  private readonly userAgent = 'LawScraper/1.0 (Educational Project)';
  private cache: Map<string, Depute> = new Map();

  /**
   * Récupère les informations d'un député depuis l'API JSON
   */
  async fetchDeputeInfo(acteurRef: string): Promise<Depute | null> {
    // Vérifier le cache
    if (this.cache.has(acteurRef)) {
      return this.cache.get(acteurRef)!;
    }

    try {
      // L'API opendata pour les acteurs
      const url = `${this.baseUrl}/dyn/opendata/${acteurRef}.json`;

      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000,
      });

      const data = response.data.acteur || response.data;

      // Extraire les informations
      const etatCivil = data.etatCivil || {};
      const prenom = etatCivil.prenom || '';
      const nom = etatCivil.nom || '';
      const nomComplet = `${prenom} ${nom}`.trim();

      // Groupe politique actuel
      let groupePolitique = 'Non spécifié';
      if (data.mandats && data.mandats.mandat) {
        const mandats = Array.isArray(data.mandats.mandat)
          ? data.mandats.mandat
          : [data.mandats.mandat];

        // Trouver le mandat actuel (sans date de fin)
        const mandatActuel = mandats.find((m: any) => !m.dateFin || m.dateFin === '');

        if (mandatActuel && mandatActuel.organes) {
          const organes = mandatActuel.organes.organeRef || [];
          const organesList = Array.isArray(organes) ? organes : [organes];

          // Chercher le groupe politique (commence par PO et contient GP)
          const groupeRef = organesList.find((ref: string) => ref.startsWith('PO') && ref.includes('GP'));

          if (groupeRef) {
            // On pourrait faire un appel pour récupérer le nom du groupe
            // Pour l'instant on stocke la référence
            groupePolitique = groupeRef;
          }
        }
      }

      // Photo
      const photoUrl = data.photo?.url
        ? `${this.baseUrl}${data.photo.url}`
        : undefined;

      const depute: Depute = {
        nom: nomComplet || 'Nom inconnu',
        groupePolitique,
        groupePolitiqueCode: normalizeGroupePolitique(groupePolitique),
        photoUrl,
        urlDepute: `${this.baseUrl}/dyn/acteurs/${acteurRef}`,
      };

      // Mettre en cache
      this.cache.set(acteurRef, depute);

      return depute;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const message = error.message;
        console.warn(`⚠️  Failed to fetch député info for ${acteurRef}: HTTP ${status} - ${message}`);
      } else {
        console.warn(`⚠️  Failed to fetch député info for ${acteurRef}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Fallback : essayer de scraper la page HTML
      return this.fetchDeputeFromPage(acteurRef);
    }
  }

  /**
   * Récupère les infos depuis la page HTML du député (fallback)
   */
  private async fetchDeputeFromPage(acteurRef: string): Promise<Depute | null> {
    try {
      const url = `${this.baseUrl}/dyn/acteurs/${acteurRef}`;

      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);

      // Extraire le nom
      const nom = $('h1.depute-nom, h1').first().text().trim();

      // Extraire le groupe
      const groupe = $('.groupe-politique, .depute-groupe').first().text().trim();

      // Extraire la photo
      const photoUrl = $('img.photo-depute, img[alt*="photo"]')
        .first()
        .attr('src');

      const groupePolitique = groupe || 'Non spécifié';

      const depute: Depute = {
        nom: nom || 'Nom inconnu',
        groupePolitique,
        groupePolitiqueCode: normalizeGroupePolitique(groupePolitique),
        photoUrl: photoUrl
          ? photoUrl.startsWith('http')
            ? photoUrl
            : `${this.baseUrl}${photoUrl}`
          : undefined,
        urlDepute: url,
      };

      this.cache.set(acteurRef, depute);
      return depute;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        console.warn(`⚠️  Failed to fetch député page for ${acteurRef}: HTTP ${status}`);
      } else {
        console.warn(`⚠️  Failed to fetch député page for ${acteurRef}`);
      }
      return null;
    }
  }

  /**
   * Récupère les infos de plusieurs députés en parallèle
   */
  async fetchMultipleDeputes(acteurRefs: string[]): Promise<Map<string, Depute>> {
    const results = new Map<string, Depute>();

    // Traiter par lots de 5 pour ne pas surcharger le serveur
    const batchSize = 5;

    for (let i = 0; i < acteurRefs.length; i += batchSize) {
      const batch = acteurRefs.slice(i, i + batchSize);

      const promises = batch.map(ref => this.fetchDeputeInfo(ref));
      const deputes = await Promise.all(promises);

      deputes.forEach((depute, index) => {
        if (depute) {
          results.set(batch[index], depute);
        }
      });

      // Petit délai entre les lots
      if (i + batchSize < acteurRefs.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
