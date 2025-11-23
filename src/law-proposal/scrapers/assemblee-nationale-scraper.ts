import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { PropositionResume } from './types';

/**
 * Service de scraping de la liste des propositions de loi
 */
@Injectable()
export class AssembleeNationaleScraper {
  private readonly baseUrl = 'https://www2.assemblee-nationale.fr';
  private readonly userAgent = 'LawScraper/1.0 (Educational Project)';
  private readonly delayBetweenRequests = 2000;

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPropositionsDeLoi(page: number = 0, limit: number = 150): Promise<PropositionResume[]> {
    const offset = page * limit;
    const url = `${this.baseUrl}/documents/liste?type=propositions-loi&limit=${limit}&offset=${offset}&legis=17`;

    try {
      console.log(`Fetching propositions de loi from: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        timeout: 30000,
      });

      console.log(`Response status: ${response.status}`);

      return this.parsePropositionsDeLoi(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Error fetching data: ${error.message}`);
        if (error.response) {
          console.error(`Status: ${error.response.status}`);
          console.error(`Data:`, error.response.data);
        }
      }
      throw error;
    }
  }

  private parsePropositionsDeLoi(html: string): PropositionResume[] {
    const $ = cheerio.load(html);
    const propositions: PropositionResume[] = [];

    // Cibler les <li> qui contiennent un data-id commençant par "OMC_PION"
    $('ul.liens-liste > li[data-id^="OMC_PION"]').each((index, element) => {
      const $el = $(element);

      // Extraire le titre et le numéro depuis le h3
      const h3Text = $el.find('h3').text().trim();
      const numeroMatch = h3Text.match(/N°\s*(\d+)/);
      const numero = numeroMatch ? numeroMatch[1] : '';

      // Le titre est tout ce qui est avant " - N° "
      const titre = h3Text.split(/-\s*N°/)[0].trim();

      // Extraire la date
      const dateText = $el.find('.heure').text().trim();
      const date = dateText.replace('Mis en ligne', '').trim();

      // Extraire les liens
      const dossierLink = $el.find('a:contains("Dossier législatif")').attr('href');
      const documentLink = $el.find('a:contains("Document")').attr('href');

      // Extraire la description
      const description = $el.find('p').first().text().trim();

      if (titre && numero) {
        propositions.push({
          titre,
          numero,
          date: date || undefined,
          auteurs: description || undefined,
          url: documentLink || dossierLink || '',
        });
      }
    });

    console.log(`Found ${propositions.length} propositions de loi`);
    return propositions;
  }

  async analyzePageStructure(url?: string): Promise<void> {
    const targetUrl = url || `${this.baseUrl}/documents/liste?type=propositions-loi`;

    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);

      console.log('\n=== Page Structure Analysis ===\n');
      console.log(`Page title: ${$('title').text()}`);
      console.log(`\nMain containers:`);

      // Analyser les conteneurs principaux
      $('main, #content, .content, .container, .liste, table').each((i, el) => {
        const tagName = el.tagName;
        const classes = $(el).attr('class');
        const id = $(el).attr('id');
        console.log(`  - <${tagName}> ${id ? `#${id}` : ''} ${classes ? `.${classes}` : ''}`);
      });

      console.log(`\nLinks found: ${$('a').length}`);
      console.log(`Tables found: ${$('table').length}`);
      console.log(`Lists found: ${$('ul, ol').length}`);

      // Afficher quelques liens pour comprendre la structure
      console.log(`\nSample links:`);
      $('a').slice(0, 10).each((i, el) => {
        const text = $(el).text().trim().substring(0, 60);
        const href = $(el).attr('href');
        if (text && href) {
          console.log(`  ${i + 1}. "${text}" -> ${href}`);
        }
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Error: ${error.message}`);
        if (error.response?.status === 429) {
          console.error('Rate limit exceeded. Try adding more delay between requests.');
        }
      }
      throw error;
    }
  }
}
