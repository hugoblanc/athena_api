# Spécification Fonctionnelle - Module Law Proposal

## 1. Contexte et Objectif

Athéna intègre un nouveau module permettant de scraper, persister et simplifier les propositions de loi de l'Assemblée Nationale française. L'objectif est de rendre accessibles ces propositions avec une version simplifiée générée par IA, lisible en 30 secondes à 1 minute.

## 2. Périmètre Fonctionnel

### 2.1 Scraping Automatisé
- **Cron quotidien** : récupération automatique des nouvelles propositions de loi chaque jour
- **Endpoint d'initialisation** : permettre de scraper manuellement les X dernières propositions pour initialiser la base
- **Détection de nouveauté** : une proposition est considérée comme nouvelle si son numéro n'existe pas en base

### 2.2 Persistance des Données
- **Mode snapshot immuable (MVP)** : chaque proposition est scrapée une seule fois
- Stockage complet de la structure existante définie dans `lawscrapper/src/types.ts`
- Pas de re-scraping ni de versioning dans cette première version
- Conservation de toutes les propositions historiques

### 2.3 Génération de Version Simplifiée
- **Provider LLM** : OpenAI (déjà configuré dans Athéna)
- **Génération asynchrone** : après le scraping, génération en arrière-plan
- **Format** : version condensée respectant la structure originale (exposé des motifs + articles)
- **Objectif** : compréhension globale en 30-60 secondes de lecture

### 2.4 Exposition des Données
- **Phase MVP** : pas d'API REST publique dans l'immédiat
- Infrastructure préparée pour future intégration frontend
- Logs et monitoring pour suivre le scraping

## 3. Données Scrapées

Réutilisation complète du scrapper existant `src/lawscrapper` :
- Métadonnées : numéro, titre, législature, type, dates
- Auteur principal et co-signataires (députés avec groupe politique)
- Sections : exposé des motifs, articles structurés
- Amendements (si disponibles)
- URLs : document original, dossier législatif

## 4. Workflow Technique (Aperçu)

1. **Trigger** : Cron quotidien OU endpoint manuel
2. **Scraping** : récupération liste + détail via le scrapper existant
3. **Vérification** : skip si numéro déjà présent en base
4. **Persistance** : stockage version originale complète
5. **Génération IA** : création version simplifiée (asynchrone)
6. **Stockage final** : mise à jour de l'entité avec version simplifiée

## 5. Contraintes et Limites MVP

- Pas de mise à jour des propositions existantes
- Pas de gestion de versioning
- Pas d'API REST exposée
- Pas de suivi d'état d'avancement législatif
- Rate limiting : respect des délais entre requêtes (2s par défaut du scrapper)

## 6. Module NestJS

- **Nom** : `LawProposalModule`
- **Localisation** : `src/law-proposal/`
- **Architecture** : Domain-Driven Design (comme modules existants `content`, `qa`)
- **Réutilisation** : intégration du code `src/lawscrapper` existant
