const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to delete podcast for content ID 102...');
    const result = await prisma.podcast.deleteMany({
      where: { contentId: 102 }
    });
    console.log(`Successfully deleted ${result.count} podcast records`);
  } catch (error) {
    console.error('Error deleting podcast:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
