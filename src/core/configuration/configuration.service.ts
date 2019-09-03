import { Injectable } from '@nestjs/common';
import { IConfigurationService } from './iconfiguration-service';
import { PubsubhubService } from './pubsubhub/pubsubhub.service';

/**
 * *~~~~~~~~~~~~~~~~~~~
 * Author: HugoBlanc |
 * *~~~~~~~~~~~~~~~~~~~
 * Cette classe est une class de configuration
 * Elle est automatiquement initialisé au démarrage de l'application
 * Chaque Service qui implement IConfigurationService doit être ajouté ici
 * *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
@Injectable()
export class ConfigurationService implements IConfigurationService {

  constructor(private pubsubhubService: PubsubhubService) {}

  /**
   * Methode d'initilisation générale
   */
  init() {
    // Ajouter ici chaque classe qui devra être configuré/initialisé au démarrage
    this.pubsubhubService.init();
  }
}
