# Athena API - Spécification des Données Exposables

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Module Law Proposal](#module-law-proposal)
3. [Endpoints API Existants](#endpoints-api-existants)
4. [Endpoints API Proposés](#endpoints-api-proposés)
5. [Modèles de Données](#modèles-de-données)
6. [Cas d'Usage Frontend](#cas-dusage-frontend)
7. [Considérations Techniques](#considérations-techniques)

---

## Vue d'ensemble

L'API Athena expose des données relatives aux propositions de loi de l'Assemblée Nationale française. Ces données sont scrapées, structurées, et peuvent être enrichies avec des versions simplifiées générées par IA.

### État actuel de la base de données

**Tables principales :**
- `law_proposal` : Propositions de loi complètes
- `depute` : Députés (auteurs et co-signataires)
- `section` : Sections des propositions (exposé des motifs, articles)
- `article` : Articles de loi détaillés
- `amendement` : Amendements associés aux propositions

**Volumétrie :**
- Scraping configurable : de 1 à 500 propositions à la demande
- Données actualisables quotidiennement via CRON
- Historique complet depuis le début de la 17ème législature

---

## Module Law Proposal

### 1. Propositions de Loi (`LawProposal`)

#### Données disponibles

| Champ | Type | Description | Exposable publiquement |
|-------|------|-------------|------------------------|
| `id` | Integer | Identifiant unique interne | ❌ Non (technique) |
| `numero` | String | Numéro officiel de la proposition (ex: "2124") | ✅ Oui |
| `titre` | String | Titre complet de la proposition | ✅ Oui |
| `legislature` | String | Numéro de la législature (ex: "17") | ✅ Oui |
| `typeProposition` | String | Type : "ordinaire" ou "constitutionnelle" | ✅ Oui |
| `dateMiseEnLigne` | Date | Date de publication sur le site AN | ✅ Oui |
| `dateDepot` | Date | Date de dépôt officiel (nullable) | ✅ Oui |
| `description` | Text | Description courte/notice | ✅ Oui |
| `urlDocument` | String | URL du document original sur assemblee-nationale.fr | ✅ Oui |
| `urlDossierLegislatif` | String | URL du dossier législatif complet | ✅ Oui |
| `dateScraping` | Timestamp | Date de scraping (métadonnée technique) | ⚠️ Optionnel |
| `version` | String | Version du format de scraping | ❌ Non (technique) |
| `simplifiedVersion` | Text | Version simplifiée générée par IA | ✅ Oui (si disponible) |
| `simplificationStatus` | String | Statut : "pending", "completed", "failed" | ✅ Oui |
| `simplifiedAt` | Timestamp | Date de génération de la version simplifiée | ✅ Oui |
| `auteurId` | Integer | ID de l'auteur principal | ❌ Non (relation) |

#### Relations incluses

- **`auteur`** : Objet `Depute` complet (auteur principal)
- **`coSignataires`** : Tableau d'objets `Depute` (co-signataires)
- **`sections`** : Tableau d'objets `Section` avec articles imbriqués
- **`amendements`** : Tableau d'objets `Amendement`

---

### 2. Députés (`Depute`)

#### Données disponibles

| Champ | Type | Description | Exposable publiquement |
|-------|------|-------------|------------------------|
| `id` | Integer | Identifiant unique interne | ❌ Non (technique) |
| `nom` | String | Nom complet du député | ✅ Oui |
| `groupePolitique` | String | Nom complet du groupe politique | ✅ Oui |
| `groupePolitiqueCode` | String | Code normalisé du groupe (RN, LFI_NFP, SOC, etc.) | ✅ Oui |
| `photoUrl` | String | URL de la photo officielle | ✅ Oui |
| `urlDepute` | String | URL de la page du député sur assemblee-nationale.fr | ✅ Oui |
| `acteurRef` | String | Référence acteur dans l'API officielle (ex: "PA123456") | ⚠️ Optionnel |
| `createdAt` | Timestamp | Date de création (métadonnée) | ❌ Non |
| `updatedAt` | Timestamp | Date de mise à jour (métadonnée) | ❌ Non |

#### Groupes Politiques disponibles

Liste exhaustive des codes :

- **RN** : Rassemblement National
- **LFI_NFP** : La France insoumise - Nouveau Front Populaire
- **SOC** : Socialistes et apparentés
- **ECO** : Écologiste et Social
- **GDR** : Gauche Démocrate et Républicaine
- **EPR** : Ensemble pour la République
- **DEM** : Les Démocrates
- **HOR** : Horizons et apparentés
- **DR** : Droite Républicaine
- **UDR** : Union des droites pour la République
- **NI** : Non inscrit
- **UNKNOWN** : Non spécifié

---

### 3. Sections (`Section`)

#### Données disponibles

| Champ | Type | Description | Exposable publiquement |
|-------|------|-------------|------------------------|
| `id` | Integer | Identifiant unique interne | ❌ Non (technique) |
| `type` | String | Type : "expose_motifs", "articles", "sommaire", "autre" | ✅ Oui |
| `titre` | String | Titre de la section (ex: "EXPOSÉ DES MOTIFS") | ✅ Oui |
| `texte` | Text | Contenu textuel complet de la section | ✅ Oui |
| `lawProposalId` | Integer | ID de la proposition (relation) | ❌ Non (relation) |

#### Relations incluses

- **`articles`** : Tableau d'objets `Article` (pour les sections de type "articles")

---

### 4. Articles (`Article`)

#### Données disponibles

| Champ | Type | Description | Exposable publiquement |
|-------|------|-------------|------------------------|
| `id` | Integer | Identifiant unique interne | ❌ Non (technique) |
| `numero` | String | Numéro de l'article (ex: "Article 1er", "Article 2") | ✅ Oui |
| `titre` | String | Titre optionnel de l'article | ✅ Oui |
| `texte` | Text | Contenu complet de l'article | ✅ Oui |
| `sectionId` | Integer | ID de la section parente (relation) | ❌ Non (relation) |

---

### 5. Amendements (`Amendement`)

#### Données disponibles

| Champ | Type | Description | Exposable publiquement |
|-------|------|-------------|------------------------|
| `id` | Integer | Identifiant unique interne | ❌ Non (technique) |
| `numero` | String | Numéro de l'amendement | ✅ Oui |
| `date` | Date | Date de dépôt de l'amendement | ✅ Oui |
| `auteur` | String | Nom de l'auteur de l'amendement | ✅ Oui |
| `statut` | String | Statut de l'amendement (adopté, rejeté, etc.) | ✅ Oui |
| `url` | String | URL de l'amendement | ✅ Oui |
| `lawProposalId` | Integer | ID de la proposition (relation) | ❌ Non (relation) |

---

## Endpoints API Existants

### 1. POST `/law-proposal/initialize`

**Usage :** Initialisation du scraping (admin uniquement)

**Paramètres :**
- `limit` (query, integer) : Nombre de propositions à scraper (1-500)

**Réponse :**
```json
{
  "message": "Scraping completed, simplification in progress",
  "created": 25,
  "skipped": 5
}
```

**Exposable publiquement :** ❌ Non (opération admin)

---

### 2. POST `/law-proposal/process-simplification-queue`

**Usage :** Traitement de la queue de simplification IA (admin uniquement)

**Paramètres :**
- `batchSize` (query, integer) : Taille du lot à traiter

**Réponse :**
```json
{
  "message": "Queue processed successfully"
}
```

**Exposable publiquement :** ❌ Non (opération admin)

---

### 3. GET `/law-proposal/stats`

**Usage :** Récupération des statistiques globales

**Réponse :**
```json
{
  "total": 150,
  "pending": 45,
  "completed": 100,
  "failed": 5
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Dashboard administrateur
- Statistiques publiques sur la couverture de la base

---

### 4. GET `/law-proposal/recent`

**Usage :** Récupération des propositions récentes

**Paramètres :**
- `limit` (query, integer, défaut: 10) : Nombre de propositions à retourner

**Réponse :**
```json
{
  "data": [
    {
      "id": 1,
      "numero": "2124",
      "titre": "Proposition de loi visant à...",
      "legislature": "17",
      "typeProposition": "ordinaire",
      "dateMiseEnLigne": "2025-11-20T00:00:00.000Z",
      "dateDepot": "2025-11-19T00:00:00.000Z",
      "description": "...",
      "urlDocument": "https://...",
      "urlDossierLegislatif": "https://...",
      "simplificationStatus": "completed",
      "simplifiedAt": "2025-11-21T10:30:00.000Z",
      "auteur": {
        "id": 10,
        "nom": "Jean Dupont",
        "groupePolitique": "Rassemblement National",
        "groupePolitiqueCode": "RN",
        "photoUrl": "https://...",
        "urlDepute": "https://..."
      },
      "coSignataires": [
        {
          "id": 11,
          "nom": "Marie Martin",
          "groupePolitique": "Rassemblement National",
          "groupePolitiqueCode": "RN",
          "photoUrl": "https://...",
          "urlDepute": "https://..."
        }
      ]
    }
  ],
  "count": 10
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Page d'accueil avec les dernières propositions
- Fil d'actualité législative
- Widget "Dernières propositions"

---

### 5. GET `/law-proposal/:numero`

**Usage :** Récupération d'une proposition complète par son numéro

**Paramètres :**
- `numero` (query, string) : Numéro de la proposition (ex: "2124")

**Réponse :**
```json
{
  "id": 1,
  "numero": "2124",
  "titre": "Proposition de loi visant à...",
  "legislature": "17",
  "typeProposition": "ordinaire",
  "dateMiseEnLigne": "2025-11-20T00:00:00.000Z",
  "dateDepot": "2025-11-19T00:00:00.000Z",
  "description": "Description courte...",
  "urlDocument": "https://www.assemblee-nationale.fr/...",
  "urlDossierLegislatif": "https://www.assemblee-nationale.fr/dyn/17/dossiers/...",
  "simplifiedVersion": "Version simplifiée en langage courant...",
  "simplificationStatus": "completed",
  "simplifiedAt": "2025-11-21T10:30:00.000Z",
  "auteur": {
    "id": 10,
    "nom": "Jean Dupont",
    "groupePolitique": "Rassemblement National",
    "groupePolitiqueCode": "RN",
    "photoUrl": "https://www.assemblee-nationale.fr/...",
    "urlDepute": "https://www.assemblee-nationale.fr/dyn/acteurs/PA123456"
  },
  "coSignataires": [
    {
      "id": 11,
      "nom": "Marie Martin",
      "groupePolitique": "Rassemblement National",
      "groupePolitiqueCode": "RN",
      "photoUrl": "https://...",
      "urlDepute": "https://..."
    }
  ],
  "sections": [
    {
      "id": 1,
      "type": "expose_motifs",
      "titre": "EXPOSÉ DES MOTIFS",
      "texte": "Mesdames, Messieurs...",
      "articles": []
    },
    {
      "id": 2,
      "type": "articles",
      "titre": "ARTICLES",
      "texte": "Article 1er\n\nLe code...",
      "articles": [
        {
          "id": 1,
          "numero": "Article 1er",
          "titre": null,
          "texte": "Le code de la santé publique est ainsi modifié..."
        },
        {
          "id": 2,
          "numero": "Article 2",
          "titre": null,
          "texte": "La présente loi entre en vigueur..."
        }
      ]
    }
  ],
  "amendements": [
    {
      "id": 1,
      "numero": "AM001",
      "date": "2025-11-22T00:00:00.000Z",
      "auteur": "Pierre Durand",
      "statut": "En discussion",
      "url": "https://www.assemblee-nationale.fr/..."
    }
  ]
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Page de détail d'une proposition
- Lecteur de proposition avec navigation par articles
- Export PDF/impression
- Partage sur réseaux sociaux

---

## Endpoints API Proposés

### 1. GET `/law-proposal` (Liste paginée)

**Usage :** Récupération de toutes les propositions avec pagination

**Paramètres :**
- `page` (query, integer, défaut: 1) : Numéro de page
- `limit` (query, integer, défaut: 20) : Nombre d'éléments par page
- `sort` (query, string, défaut: "dateMiseEnLigne:desc") : Tri
- `filter[typeProposition]` (query, string) : Filtrer par type
- `filter[groupePolitique]` (query, string) : Filtrer par groupe politique de l'auteur
- `filter[simplificationStatus]` (query, string) : Filtrer par statut de simplification

**Réponse :**
```json
{
  "data": [ /* tableau de propositions */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Page de listing avec filtres
- Recherche avancée
- Export de données

---

### 2. GET `/law-proposal/search`

**Usage :** Recherche textuelle dans les propositions

**Paramètres :**
- `q` (query, string, requis) : Termes de recherche
- `fields` (query, array) : Champs à rechercher (titre, description, texte)
- `limit` (query, integer, défaut: 20) : Nombre de résultats

**Réponse :**
```json
{
  "query": "santé publique",
  "results": [
    {
      "numero": "2124",
      "titre": "Proposition de loi visant à améliorer la santé publique",
      "excerpt": "...la santé publique en France...",
      "relevance": 0.95
    }
  ],
  "count": 45
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Barre de recherche globale
- Moteur de recherche thématique
- Suggestions de recherche

---

### 3. GET `/depute`

**Usage :** Liste des députés avec statistiques

**Paramètres :**
- `groupePolitique` (query, string) : Filtrer par groupe
- `withStats` (query, boolean) : Inclure le nombre de propositions

**Réponse :**
```json
{
  "data": [
    {
      "id": 10,
      "nom": "Jean Dupont",
      "groupePolitique": "Rassemblement National",
      "groupePolitiqueCode": "RN",
      "photoUrl": "https://...",
      "urlDepute": "https://...",
      "stats": {
        "propositionsAuteur": 15,
        "propositionsCoSignataire": 32
      }
    }
  ],
  "count": 577
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Annuaire des députés
- Profil de député avec activité législative
- Statistiques par groupe politique

---

### 4. GET `/depute/:id/proposals`

**Usage :** Propositions d'un député (auteur ou co-signataire)

**Paramètres :**
- `id` (path, integer) : ID du député
- `role` (query, string) : "auteur" ou "coSignataire" ou "all" (défaut)

**Réponse :**
```json
{
  "depute": {
    "id": 10,
    "nom": "Jean Dupont",
    "groupePolitique": "Rassemblement National",
    "groupePolitiqueCode": "RN"
  },
  "propositions": [
    {
      "numero": "2124",
      "titre": "...",
      "role": "auteur",
      "dateMiseEnLigne": "2025-11-20T00:00:00.000Z"
    }
  ],
  "count": 15
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Profil de député avec historique
- Suivi d'un député
- Analyse de l'activité parlementaire

---

### 5. GET `/groupes-politiques/stats`

**Usage :** Statistiques par groupe politique

**Réponse :**
```json
{
  "data": [
    {
      "code": "RN",
      "nom": "Rassemblement National",
      "deputesCount": 88,
      "propositionsCount": 45,
      "propositionsAuteurCount": 32,
      "propositionsCoSignataireCount": 150
    },
    {
      "code": "LFI_NFP",
      "nom": "La France insoumise - Nouveau Front Populaire",
      "deputesCount": 75,
      "propositionsCount": 68,
      "propositionsAuteurCount": 50,
      "propositionsCoSignataireCount": 180
    }
  ]
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Dashboard analytique
- Visualisations (graphiques, camemberts)
- Comparaison inter-groupes

---

### 6. GET `/law-proposal/:numero/simplified`

**Usage :** Récupération uniquement de la version simplifiée

**Paramètres :**
- `numero` (path, string) : Numéro de la proposition

**Réponse :**
```json
{
  "numero": "2124",
  "titre": "Proposition de loi visant à...",
  "simplifiedVersion": "En langage simple, cette proposition vise à...",
  "simplificationStatus": "completed",
  "simplifiedAt": "2025-11-21T10:30:00.000Z"
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Popup "Version simplifiée"
- Mode lecture simplifiée
- Accessibilité (public non-juriste)

---

### 7. GET `/law-proposal/timeline`

**Usage :** Timeline des propositions par mois

**Paramètres :**
- `startDate` (query, date) : Date de début
- `endDate` (query, date) : Date de fin
- `groupBy` (query, string) : "day", "week", "month" (défaut: "month")

**Réponse :**
```json
{
  "timeline": [
    {
      "period": "2025-11",
      "count": 25,
      "types": {
        "ordinaire": 23,
        "constitutionnelle": 2
      }
    },
    {
      "period": "2025-10",
      "count": 32,
      "types": {
        "ordinaire": 30,
        "constitutionnelle": 2
      }
    }
  ]
}
```

**Exposable publiquement :** ✅ Oui

**Cas d'usage frontend :**
- Graphique temporel d'activité législative
- Analyse de tendances
- Calendrier interactif

---

## Modèles de Données

### Structure JSON complète d'une Proposition

```typescript
interface LawProposalDTO {
  // Identité
  numero: string;
  titre: string;
  legislature: string;
  typeProposition: "ordinaire" | "constitutionnelle";

  // Dates
  dateMiseEnLigne: Date;
  dateDepot: Date | null;

  // Contenu
  description: string | null;
  sections: SectionDTO[];
  simplifiedVersion: string | null;

  // Métadonnées
  simplificationStatus: "pending" | "completed" | "failed";
  simplifiedAt: Date | null;

  // Relations
  auteur: DeputeDTO;
  coSignataires: DeputeDTO[];
  amendements: AmendementDTO[];

  // Liens
  urlDocument: string;
  urlDossierLegislatif: string | null;
}

interface DeputeDTO {
  nom: string;
  groupePolitique: string;
  groupePolitiqueCode: string;
  photoUrl: string | null;
  urlDepute: string | null;
}

interface SectionDTO {
  type: "expose_motifs" | "articles" | "sommaire" | "autre";
  titre: string;
  texte: string;
  articles: ArticleDTO[];
}

interface ArticleDTO {
  numero: string;
  titre: string | null;
  texte: string;
}

interface AmendementDTO {
  numero: string;
  date: Date;
  auteur: string | null;
  statut: string | null;
  url: string | null;
}
```

---

## Cas d'Usage Frontend

### 1. Application Mobile/Web Citoyenne

**Fonctionnalités :**
- **Accueil** : Dernières propositions avec filtres par groupe politique
- **Détail** : Lecture de proposition avec toggle "Version simplifiée"
- **Recherche** : Moteur de recherche par mots-clés
- **Députés** : Annuaire avec profils et historique
- **Notifications** : Alerte sur nouvelles propositions d'un député suivi

**Endpoints utilisés :**
- `GET /law-proposal/recent`
- `GET /law-proposal/:numero`
- `GET /law-proposal/search`
- `GET /depute`
- `GET /depute/:id/proposals`

---

### 2. Dashboard Analytique Journaliste

**Fonctionnalités :**
- **Statistiques globales** : Nombre de propositions par groupe
- **Timeline** : Activité législative sur 12 mois
- **Comparaison** : Top députés par nombre de propositions
- **Export** : Téléchargement CSV de datasets

**Endpoints utilisés :**
- `GET /law-proposal/stats`
- `GET /groupes-politiques/stats`
- `GET /law-proposal/timeline`
- `GET /law-proposal` (avec filtres)

---

### 3. Outil Pédagogique (Écoles, Universités)

**Fonctionnalités :**
- **Lecture simplifiée** : Versions vulgarisées des propositions
- **Quiz** : Génération de questions/réponses sur une proposition
- **Glossaire** : Définitions des termes juridiques
- **Comparaison** : Afficher plusieurs propositions côte à côte

**Endpoints utilisés :**
- `GET /law-proposal/:numero/simplified`
- `GET /law-proposal/:numero` (texte intégral)
- `GET /law-proposal/recent`

---

### 4. Widget Média Intégrable

**Fonctionnalités :**
- Widget JavaScript embeddable affichant les 5 dernières propositions
- Personnalisable (filtre par groupe, couleurs, taille)
- Click-through vers l'application complète

**Endpoints utilisés :**
- `GET /law-proposal/recent?limit=5`

---

## Considérations Techniques

### 1. Performance et Caching

**Recommandations :**
- ✅ **Cache Redis** pour les endpoints les plus sollicités (`/recent`, `/stats`)
- ✅ **TTL suggéré** : 5 minutes pour les listes, 1 heure pour les détails
- ✅ **Pagination obligatoire** sur les listes pour limiter la charge
- ✅ **Rate limiting** : 100 requêtes/minute par IP pour éviter l'abus

---

### 2. Sécurité et CORS

**Recommandations :**
- ✅ **CORS activé** pour permettre les appels depuis des domaines externes
- ✅ **API Key optionnelle** pour statistiques d'usage (non bloquante)
- ❌ **Pas d'authentification requise** pour les données publiques
- ✅ **Endpoints admin** (`/initialize`, `/process-queue`) protégés par authentification

---

### 3. Versioning de l'API

**Recommandations :**
- ✅ **Versionning dans l'URL** : `/v1/law-proposal`, `/v2/law-proposal`
- ✅ **Rétrocompatibilité** : Maintenir v1 pendant 12 mois après release de v2
- ✅ **Changelog public** : Documentation des breaking changes

---

### 4. Documentation OpenAPI

**À produire :**
- Spécification OpenAPI 3.0 (Swagger)
- Documentation interactive avec Swagger UI
- Exemples de code (cURL, JavaScript, Python)
- Guide de démarrage rapide

---

### 5. Limitations et Quotas

**Propositions :**
- **Pagination max** : 100 éléments par page
- **Recherche** : Max 1000 résultats
- **Rate limit** : 100 req/min sans API key, 1000 req/min avec API key
- **Timeout** : 30 secondes par requête

---

### 6. Métriques et Monitoring

**KPIs à tracker :**
- Nombre de requêtes par endpoint
- Temps de réponse moyen
- Taux d'erreur 5xx
- Endpoints les plus populaires
- Géolocalisation des requêtes

---

## Roadmap Produit

### Phase 1 : MVP Public (Q1 2025)
- ✅ Endpoints de lecture de base (`/recent`, `/:numero`, `/stats`)
- ✅ Documentation OpenAPI
- ✅ CORS activé
- ✅ Cache Redis

### Phase 2 : Enrichissement (Q2 2025)
- 🔄 Recherche textuelle avancée
- 🔄 Filtres multi-critères
- 🔄 Endpoints députés
- 🔄 Timeline et analytics

### Phase 3 : Fonctionnalités Avancées (Q3 2025)
- 🔜 Notifications webhooks
- 🔜 Export CSV/JSON
- 🔜 API GraphQL alternative
- 🔜 Embeddings vectoriels pour recherche sémantique

---

## Contacts et Support

**Questions produit :** À définir
**Questions techniques :** À définir
**Contribuer :** [GitHub Repository]

---

*Document généré le 23 novembre 2025*
*Version : 1.0*
