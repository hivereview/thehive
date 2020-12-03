import { Maybe, Result } from 'true-myth';
import toUserId from '../../src/types/user-id';
import createRenderPage from '../../src/user-page/render-page';

describe('render-page', () => {
  describe('when the user display name is found', () => {
    it('is used as the page title', async () => {
      const renderPage = createRenderPage(
        async () => Result.ok(''),
        async () => Result.ok(''),
        async () => 'someone',
      );

      const result = await renderPage(toUserId('1234'), Maybe.nothing());

      expect(result.unsafelyUnwrap().title).toStrictEqual('someone');
    });
  });

  describe('when the user display name is not found', () => {
    it.todo('returns a not-found error page');
  });

  describe('when the user display name is unavailable', () => {
    it.todo('returns an unavailable error page');
  });
});
