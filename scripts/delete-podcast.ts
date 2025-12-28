import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Delete the podcast for content ID 102
    const deleted = await prisma.podcast.deleteMany({
      where: { contentId: 102 },
    });

    console.log(`Deleted ${deleted.count} podcast(s) for content ID 102`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
