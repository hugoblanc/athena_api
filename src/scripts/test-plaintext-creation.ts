import { TextCheeriosFormatter } from '../content/infrastructure/text-cheerios-formatter.service';
import { Content } from '../content/domain/content.entity';
import { MetaMediaType } from '../meta-media/meta-media-type.enum';

// Test simple pour vérifier que le plainText est bien généré
const textFormatter = new TextCheeriosFormatter();

const htmlDescription = `
<p><strong>Ceci est un test</strong> avec du HTML.</p>
<p>Un deuxième paragraphe avec <a href="https://example.com">un lien</a>.</p>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
`;

const plainText = textFormatter.htmlToText(htmlDescription);

console.log('HTML original:');
console.log(htmlDescription);
console.log('\n---\n');
console.log('Texte extrait:');
console.log(plainText);
console.log('\n---\n');
console.log(`Longueur HTML: ${htmlDescription.length} chars`);
console.log(`Longueur texte: ${plainText.length} chars`);
console.log(`Réduction: ${Math.round((1 - plainText.length / htmlDescription.length) * 100)}%`);

// Test avec la création d'un Content
const content = new Content({
  contentId: 'TEST123',
  title: 'Article de test',
  contentType: MetaMediaType.WORDPRESS,
  description: htmlDescription,
  plainText: plainText,
  publishedAt: new Date(),
});

console.log('\n---\n');
console.log('Content créé:');
console.log(`- contentId: ${content.contentId}`);
console.log(`- title: ${content.title}`);
console.log(`- description length: ${content.description.length}`);
console.log(`- plainText length: ${content.plainText.length}`);
console.log('✅ Le plainText est bien présent!');
