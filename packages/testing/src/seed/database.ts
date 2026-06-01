import { faker } from '@faker-js/faker';

/**
 * A highly controlled database seeding utility.
 * In a real execution, you will pass your Drizzle or Prisma client here.
 */
export async function seedDatabase(dbClient: any) {
  console.log('🌱 Initiating deterministic database reset...');
  
  // 1. Wipe existing state completely to prevent test bleeding
  await dbClient.manuscript.deleteMany();
  await dbClient.user.deleteMany();

  // 2. Lock the randomizer
  faker.seed(456);

  // 3. Inject known baseline entities
  const testEditor = await dbClient.user.create({
    data: {
      email: 'editor@auib.edu.iq',
      name: 'Test Editor',
      role: 'ADMIN',
    },
  });

  const testManuscript = await dbClient.manuscript.create({
    data: {
      title: 'The Societal Impact of Brutalist Architecture',
      content: '<p>A preliminary study into concrete environments.</p>',
      status: 'PENDING',
      authorId: testEditor.id,
    },
  });

  console.log('✅ Database seeded for E2E matrix.');
  
  return {
    testEditor,
    testManuscript,
  };
}
