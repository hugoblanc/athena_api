# Spécification Technique - Module Law Proposal

## 1. Architecture Globale

### 1.1 Structure du Module
```
src/law-proposal/
├── domain/
│   ├── law-proposal.entity.ts
│   ├── depute.entity.ts
│   ├── section.entity.ts
│   ├── article.entity.ts
│   └── amendement.entity.ts
├── application/
│   ├── law-proposal.service.ts
│   ├── law-scraping.service.ts
│   └── law-simplification.service.ts
├── infrastructure/
│   ├── law-proposal.module.ts
│   ├── law-proposal.controller.ts
│   └── law-scraping-cron.service.ts
└── scrapers/ (code migré depuis src/lawscrapper)
    ├── assemblee-nationale-scraper.ts
    ├── proposition-scraper.ts
    ├── depute-scraper.ts
    └── types.ts
```

### 1.2 Flow de Données

**Initialisation manuelle** (endpoint)
```
POST /law-proposal/initialize?limit=50
  ↓
LawProposalController
  ↓
LawScrapingService.initializeProposals(limit)
  ↓
[Scrape liste] → [Pour chaque: vérifier doublons] → [Scrape détails] → [Save en DB avec status='pending']
  ↓
[Background Job] → LawSimplificationService.processQueue()
  ↓
[Génération LLM] → [Update status='completed' + simplifiedVersion]
  ↓
Retour JSON: { created: X, skipped: Y, status: 'processing' }
```

**Scraping quotidien** (cron - désactivé initialement)
```
@Cron('0 0 2 * * *') // Commenté par défaut
  ↓
LawScrapingCronService.dailyScraping()
  ↓
Appelle LawScrapingService.scrapNewProposals()
  ↓
[Même logique que l'initialisation avec limit par défaut]
```

## 2. Entités TypeORM (Relationnelles)

### 2.1 LawProposal (entité principale)
```typescript
@Entity()
export class LawProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column({ length: 500 })
  titre: string;

  @Column()
  legislature: string;

  @Column()
  typeProposition: string; // 'ordinaire' | 'constitutionnelle'

  @Column({ type: 'date' })
  dateMiseEnLigne: Date;

  @Column({ type: 'date', nullable: true })
  dateDepot: Date;

  @ManyToOne(() => Depute)
  auteur: Depute;

  @ManyToMany(() => Depute)
  @JoinTable()
  coSignataires: Depute[];

  @OneToMany(() => Section, section => section.lawProposal, { cascade: true })
  sections: Section[];

  @OneToMany(() => Amendement, amendement => amendement.lawProposal, { cascade: true })
  amendements: Amendement[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  urlDocument: string;

  @Column({ nullable: true })
  urlDossierLegislatif: string;

  @Column({ type: 'timestamp' })
  dateScraping: Date;

  @Column({ default: '1.0' })
  version: string;

  // Champs pour la version simplifiée générée par IA
  @Column({ type: 'text', nullable: true })
  simplifiedVersion: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  })
  simplificationStatus: string;

  @Column({ type: 'timestamp', nullable: true })
  simplifiedAt: Date;
}
```

### 2.2 Depute
```typescript
@Entity()
@Index(['nom', 'groupePolitiqueCode']) // Fallback pour recherche
export class Depute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  groupePolitique: string;

  @Column({ type: 'enum', enum: GroupePolitiqueCode })
  groupePolitiqueCode: GroupePolitiqueCode;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ nullable: true })
  urlDepute: string;

  @Column({ unique: true, nullable: true })
  acteurRef: string; // Clé primaire métier (ex: PA123456) - UNIQUE et solide

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Stratégie de déduplication** :
- **Clé primaire métier** : `acteurRef` (format `PA######` de l'API Assemblée Nationale)
- C'est un identifiant unique et stable fourni par l'API officielle
- Si `acteurRef` est présent → déduplication garantie à 100%
- Si `acteurRef` est absent (scraping HTML fallback) → on utilise `nom + groupePolitiqueCode` comme fallback
- **Mise à jour** : Si un député existe déjà, on met à jour ses infos (groupe politique peut changer, photo peut être enrichie)

### 2.3 Section
```typescript
@Entity()
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['expose_motifs', 'articles', 'sommaire', 'autre'] })
  type: string;

  @Column()
  titre: string;

  @Column({ type: 'text' })
  texte: string;

  @ManyToOne(() => LawProposal, proposal => proposal.sections)
  lawProposal: LawProposal;

  @OneToMany(() => Article, article => article.section, { cascade: true })
  articles: Article[];
}
```

### 2.4 Article
```typescript
@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numero: string;

  @Column({ nullable: true })
  titre: string;

  @Column({ type: 'text' })
  texte: string;

  @ManyToOne(() => Section, section => section.articles)
  section: Section;
}
```

### 2.5 Amendement
```typescript
@Entity()
export class Amendement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numero: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  auteur: string;

  @Column({ nullable: true })
  statut: string;

  @Column({ nullable: true })
  url: string;

  @ManyToOne(() => LawProposal, proposal => proposal.amendements)
  lawProposal: LawProposal;
}
```

## 3. Services Applicatifs

### 3.1 LawScrapingService
**Responsabilité** : Orchestration du scraping et persistance

**Méthodes principales** :
```typescript
@Injectable()
export class LawScrapingService {
  constructor(
    @InjectRepository(LawProposal) private lawProposalRepo: Repository<LawProposal>,
    @InjectRepository(Depute) private deputeRepo: Repository<Depute>,
    private assembleeNationaleScraper: AssembleeNationaleScraper,
    private propositionScraper: PropositionScraper,
    private logger: Logger,
  ) {}

  // Pour endpoint d'initialisation
  async initializeProposals(limit: number): Promise<{ created: number; skipped: number }>;

  // Pour cron quotidien
  async scrapNewProposals(limit: number = 20): Promise<{ created: number; skipped: number }>;

  // Logique commune partagée par les deux méthodes ci-dessus
  private async scrapAndPersist(limit: number): Promise<{ created: number; skipped: number }>;

  // Vérifie si une proposition existe déjà
  private async propositionExists(numero: string): Promise<boolean>;

  // Sauvegarde une proposition complète avec toutes ses relations
  private async saveProposition(data: PropositionLoi): Promise<LawProposal>;

  // DÉDUPLICATION DES DÉPUTÉS
  // Récupère ou crée un député (évite les doublons)
  private async findOrCreateDepute(deputeData: Depute): Promise<Depute>;
}
```

**Logique de déduplication des députés** :
```typescript
private async findOrCreateDepute(deputeData: Depute): Promise<Depute> {
  let depute: Depute;

  // 1. Chercher d'abord par acteurRef (clé métier forte)
  if (deputeData.acteurRef) {
    depute = await this.deputeRepo.findOne({
      where: { acteurRef: deputeData.acteurRef }
    });
    if (depute) {
      // Mettre à jour les infos si nécessaire (photo, groupe politique)
      depute.photoUrl = deputeData.photoUrl || depute.photoUrl;
      depute.groupePolitique = deputeData.groupePolitique;
      depute.groupePolitiqueCode = deputeData.groupePolitiqueCode;
      return await this.deputeRepo.save(depute);
    }
  }

  // 2. Sinon chercher par nom + groupe politique
  depute = await this.deputeRepo.findOne({
    where: {
      nom: deputeData.nom,
      groupePolitiqueCode: deputeData.groupePolitiqueCode,
    },
  });

  if (depute) {
    // Enrichir avec acteurRef si on ne l'avait pas
    if (deputeData.acteurRef && !depute.acteurRef) {
      depute.acteurRef = deputeData.acteurRef;
    }
    return await this.deputeRepo.save(depute);
  }

  // 3. Sinon créer un nouveau député
  return await this.deputeRepo.save(deputeData);
}
```

### 3.2 LawSimplificationService
**Responsabilité** : Génération asynchrone des versions simplifiées via OpenAI

**Méthodes principales** :
```typescript
@Injectable()
export class LawSimplificationService {
  constructor(
    @InjectRepository(LawProposal) private lawProposalRepo: Repository<LawProposal>,
    private httpService: HttpService,
    private logger: Logger,
  ) {}

  // Traite les propositions en attente de simplification
  async processQueue(batchSize: number = 5): Promise<void>;

  // Génère la version simplifiée pour une proposition donnée
  async generateSimplifiedVersion(lawProposal: LawProposal): Promise<string>;

  // Formate la proposition pour le prompt OpenAI
  private formatProposalForLLM(lawProposal: LawProposal): string;

  // Construit le prompt système pour OpenAI
  private buildSystemPrompt(): string;
}
```

**Prompt OpenAI** :
```typescript
private buildSystemPrompt(): string {
  return `Tu es un expert en droit législatif français.
Ta mission est de simplifier des propositions de loi pour les rendre compréhensibles en 30-60 secondes de lecture.

Règles :
- Conserve la structure originale (Exposé des motifs, puis Articles)
- Résume chaque section de manière claire et concise
- Utilise un français accessible, évite le jargon juridique complexe
- Respecte la forme initiale mais condense le contenu
- Maximum 300-400 mots au total`;
}
```

### 3.3 LawProposalService
**Responsabilité** : Opérations CRUD et queries (pour future API)

```typescript
@Injectable()
export class LawProposalService {
  constructor(
    @InjectRepository(LawProposal) private lawProposalRepo: Repository<LawProposal>,
  ) {}

  async findAll(page: number, limit: number): Promise<LawProposal[]>;
  async findByNumero(numero: string): Promise<LawProposal>;
  async findRecent(limit: number): Promise<LawProposal[]>;
  async getStats(): Promise<{ total: number; pending: number; completed: number }>;
}
```

## 4. Infrastructure

### 4.1 Controller
```typescript
@Controller('law-proposal')
export class LawProposalController {
  constructor(
    private lawScrapingService: LawScrapingService,
    private lawSimplificationService: LawSimplificationService,
    private logger: Logger,
  ) {}

  @Post('initialize')
  async initialize(@Query('limit') limit: string = '50') {
    const limitNum = parseInt(limit, 10);
    this.logger.log(`Initializing law proposals (limit: ${limitNum})`);

    const result = await this.lawScrapingService.initializeProposals(limitNum);

    // Lancer le traitement asynchrone
    this.lawSimplificationService.processQueue().catch(err =>
      this.logger.error('Simplification queue error', err)
    );

    return {
      message: 'Scraping completed, simplification in progress',
      ...result,
    };
  }

  // Endpoint pour forcer le traitement de la queue de simplification
  @Post('process-simplification-queue')
  async processQueue() {
    await this.lawSimplificationService.processQueue();
    return { message: 'Queue processed' };
  }
}
```

### 4.2 Cron Service (désactivé initialement)
```typescript
@Injectable()
export class LawScrapingCronService {
  constructor(
    private lawScrapingService: LawScrapingService,
    private lawSimplificationService: LawSimplificationService,
    private logger: Logger,
  ) {}

  // @Cron('0 0 2 * * *') // Tous les jours à 2h du matin - DÉSACTIVÉ POUR L'INSTANT
  async dailyScraping() {
    this.logger.log('Starting daily law proposal scraping');

    const result = await this.lawScrapingService.scrapNewProposals(20);
    this.logger.log(`Daily scraping completed: ${JSON.stringify(result)}`);

    // Lancer la simplification asynchrone
    await this.lawSimplificationService.processQueue();
  }
}
```

### 4.3 Module
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LawProposal,
      Depute,
      Section,
      Article,
      Amendement,
    ]),
    HttpModule,
  ],
  controllers: [LawProposalController],
  providers: [
    LawProposalService,
    LawScrapingService,
    LawSimplificationService,
    LawScrapingCronService,
    AssembleeNationaleScraper,
    PropositionScraper,
    DeputeScraper,
  ],
  exports: [LawProposalService],
})
export class LawProposalModule {}
```

## 5. Migration du Code Scrapper

### 5.1 Adaptation du code existant
- Copier `src/lawscrapper/src/*` vers `src/law-proposal/scrapers/`
- Ajouter `@Injectable()` aux classes de scraping
- Adapter les imports pour TypeScript strict mode (retirer `.js` des imports)
- Conserver toute la logique métier du scraping existante

### 5.2 Gestion des dépendances
- `axios` et `cheerio` déjà présents dans le projet principal
- Supprimer le `package.json` du sous-projet lawscrapper

## 6. Configuration Environnement

Variables à ajouter dans `.env` :
```bash
# OpenAI (déjà configuré)
OPENAI_API_KEY=sk-xxx

# Law Proposal Module
ENABLE_LAW_SCRAPING_CRON=false  # Pour activer plus tard
LAW_SCRAPING_BATCH_SIZE=20
LAW_SIMPLIFICATION_MODEL=gpt-4o-mini
```

## 7. Intégration dans AppModule

```typescript
// src/app.module.ts
@Module({
  imports: [
    // ... autres modules
    LawProposalModule,
  ],
})
export class AppModule {}
```

## 8. Logique Commune (DRY Principle)

La méthode privée `scrapAndPersist()` dans `LawScrapingService` sera utilisée par :
- `initializeProposals()` - appelée par l'endpoint
- `scrapNewProposals()` - appelée par le cron

Cela garantit que la logique de scraping, vérification doublons et persistance est identique dans les deux cas.

## 9. Mécanisme de Déduplication des Députés

### 9.1 Problématique
Lors du scraping de multiples propositions de loi, le même député peut apparaître comme auteur ou co-signataire de plusieurs propositions. Il faut éviter de créer des entrées en double dans la table `depute`.

### 9.2 Solution : `acteurRef` comme clé primaire métier

L'API de l'Assemblée Nationale fournit `acteurRef` (ex: `PA123456`) - un identifiant unique et stable pour chaque député.

**Avantages** :
- Identifiant officiel et pérenne
- Permet de retrouver le député même si son groupe politique change
- Permet de retrouver le député même si son nom est écrit différemment

### 9.3 Implémentation de `findOrCreateDepute()`

```typescript
private async findOrCreateDepute(deputeData: Depute): Promise<Depute> {
  // 1. PRIORITÉ : Recherche par acteurRef (clé métier forte)
  if (deputeData.acteurRef) {
    let depute = await this.deputeRepo.findOne({
      where: { acteurRef: deputeData.acteurRef }
    });

    if (depute) {
      // Député trouvé → Mise à jour des infos (groupe politique, photo)
      depute.groupePolitique = deputeData.groupePolitique;
      depute.groupePolitiqueCode = deputeData.groupePolitiqueCode;
      depute.photoUrl = deputeData.photoUrl || depute.photoUrl;
      depute.urlDepute = deputeData.urlDepute || depute.urlDepute;
      return await this.deputeRepo.save(depute);
    }
  }

  // 2. FALLBACK : Si pas d'acteurRef (scraping HTML), chercher par nom + groupe
  const depute = await this.deputeRepo.findOne({
    where: {
      nom: deputeData.nom,
      groupePolitiqueCode: deputeData.groupePolitiqueCode,
    },
  });

  if (depute) {
    // Enrichir avec acteurRef si on ne l'avait pas avant
    if (deputeData.acteurRef && !depute.acteurRef) {
      depute.acteurRef = deputeData.acteurRef;
    }
    depute.photoUrl = deputeData.photoUrl || depute.photoUrl;
    return await this.deputeRepo.save(depute);
  }

  // 3. Aucun doublon trouvé → Créer un nouveau député
  return await this.deputeRepo.save(this.deputeRepo.create(deputeData));
}
```

### 9.4 Utilisation dans `saveProposition()`

```typescript
private async saveProposition(data: PropositionLoi): Promise<LawProposal> {
  // Déduplication de l'auteur principal
  const auteur = await this.findOrCreateDepute(data.auteur);

  // Déduplication des co-signataires
  const coSignataires: Depute[] = [];
  if (data.coSignataires) {
    for (const cosig of data.coSignataires) {
      const deputeEntity = await this.findOrCreateDepute(cosig);
      coSignataires.push(deputeEntity);
    }
  }

  // Créer la proposition avec les députés dédupliqués
  const lawProposal = this.lawProposalRepo.create({
    ...data,
    auteur,
    coSignataires,
    dateScraping: new Date(),
    simplificationStatus: 'pending',
  });

  return await this.lawProposalRepo.save(lawProposal);
}
```

### 9.5 Cas d'usage

**Cas 1** : Député jamais vu
- `acteurRef: PA123456` n'existe pas en base
- → Création d'un nouveau député

**Cas 2** : Député déjà existant (même acteurRef)
- Proposition A : Marine Dupont (EPR) avec `acteurRef: PA123456`
- Proposition B : Marine Dupont (EPR) avec `acteurRef: PA123456`
- → Réutilisation du même député, mise à jour des infos

**Cas 3** : Député change de groupe politique
- Proposition A (2023) : Jean Martin (DEM)
- Proposition B (2024) : Jean Martin (EPR) - même `acteurRef`
- → Mise à jour du groupe politique sur l'entité existante

**Cas 4** : Fallback sans acteurRef (scraping HTML échoué)
- Données partielles : `{ nom: "Sophie Leroy", groupePolitiqueCode: "RN" }`
- → Recherche par nom + groupe
- → Si trouvé : réutilisation, sinon création
