import { JSDOM } from 'jsdom';
import request, { Response } from 'supertest';
import createServer from './server';

describe('page-handler', (): void => {
  describe('article page', () => {
    it('sets the og meta tags to the article details', async () => {
      const { server } = await createServer();
      const response: Response = await request(server).get('/articles/10.1101/646810');
      const html = response.text;
      const rendered = JSDOM.fragment(html);
      const ogTitle = rendered.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const ogDescription = rendered.querySelector('meta[property="og:description"]')?.getAttribute('content');

      expect(ogTitle).toBe('Article title');
      expect(ogDescription).toBe('Article abstract.');
    });
  });

  it.todo('renders the description of an error');
});
