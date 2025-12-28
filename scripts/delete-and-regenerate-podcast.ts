import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const contentId = 102;

  try {
    console.log(`Deleting podcast for content ID ${contentId}...`);

    const deleted = await prisma.podcast.deleteMany({
      where: { contentId },
    });

    console.log(`Successfully deleted ${deleted.count} podcast(s) for content ID ${contentId}`);

    if (deleted.count > 0) {
      console.log('Podcast has been deleted. You can now call POST /podcast/102 to regenerate it.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
