import { Injectable } from '@nestjs/common';

/** Bannière de migration affichée dans l'app native Ionic pour inviter
 *  les utilisateurs à basculer vers la PWA (`athena-app.xyz`). */
export interface MigrationBanner {
  enabled: boolean;
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  learnMoreUrl: string;
}

export interface AppConfig {
  migrationBanner: MigrationBanner;
}

const DEFAULTS = {
  title: 'Athena évolue',
  message:
    'Retrouvez Athena en version web, installable sur votre écran d’accueil. Vos identifiants restent les mêmes.',
  ctaLabel: 'Découvrir',
  ctaUrl: 'https://athena-app.xyz',
  learnMoreUrl: 'https://athena-app.xyz',
};

/**
 * Configuration distante pilotée par variables d'environnement (CapRover).
 *
 * La bannière est **OFF par défaut** : l'app native embarque le code mais ne
 * l'affiche pas tant que `MIGRATION_BANNER_ENABLED` n'est pas posé à `true`.
 * Cela permet de publier sur le store (review sans bannière sortante) puis de
 * l'allumer à distance sans republier.
 *
 * Ciblage par `versionCode` : on ne montre la bannière qu'aux installs dont le
 * `versionCode` est ≥ `MIGRATION_BANNER_MIN_VERSION_CODE` (si défini). Permet
 * de n'allumer que les builds qui embarquent réellement le composant bannière.
 */
@Injectable()
export class AppConfigService {
  getConfig(versionCode?: number): AppConfig {
    return {
      migrationBanner: this.getMigrationBanner(versionCode),
    };
  }

  private getMigrationBanner(versionCode?: number): MigrationBanner {
    const enabled = this.isBannerEnabled(versionCode);
    return {
      enabled,
      title: process.env.MIGRATION_BANNER_TITLE || DEFAULTS.title,
      message: process.env.MIGRATION_BANNER_MESSAGE || DEFAULTS.message,
      ctaLabel: process.env.MIGRATION_BANNER_CTA_LABEL || DEFAULTS.ctaLabel,
      ctaUrl: process.env.MIGRATION_BANNER_CTA_URL || DEFAULTS.ctaUrl,
      learnMoreUrl:
        process.env.MIGRATION_BANNER_LEARN_MORE_URL || DEFAULTS.learnMoreUrl,
    };
  }

  private isBannerEnabled(versionCode?: number): boolean {
    if (process.env.MIGRATION_BANNER_ENABLED !== 'true') {
      return false;
    }
    const minRaw = process.env.MIGRATION_BANNER_MIN_VERSION_CODE;
    if (minRaw) {
      const min = Number.parseInt(minRaw, 10);
      // Si un seuil est défini et que le client n'envoie pas (ou est en
      // dessous) → on n'affiche pas, par prudence.
      if (Number.isFinite(min) && (versionCode === undefined || versionCode < min)) {
        return false;
      }
    }
    return true;
  }
}
