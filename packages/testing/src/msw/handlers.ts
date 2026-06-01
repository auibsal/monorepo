import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';

// A mathematically fixed seed ensures the fake data is identical every time a test runs.
faker.seed(123); 

export const handlers = [
  http.get('*/api/manuscripts', () => {
    return HttpResponse.json({
      data: Array.from({ length: 3 }).map(() => ({
        id: faker.string.uuid(),
        title: faker.lorem.words(4),
        author: faker.person.fullName(),
        status: 'PENDING',
        submittedAt: faker.date.recent().toISOString(),
      })),
    });
  }),

  http.post('*/api/manuscripts/approve', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Manuscript approved and queued for publishing.',
      manuscriptId: (body as Record<string, string>).id,
    });
  }),
];
