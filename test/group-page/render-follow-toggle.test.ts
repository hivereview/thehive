import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import { JSDOM } from 'jsdom';
import { Follows, renderFollowToggle } from '../../src/group-page/render-follow-toggle';
import { GroupId } from '../../src/types/group-id';
import { toUserId } from '../../src/types/user-id';

describe('render-follow-toggle', () => {
  describe('the user is logged in', () => {
    describe('when the community is currently followed', () => {
      it('shows an unfollow button', async () => {
        const userId = toUserId('u1');
        const editorialCommunityId = new GroupId('');

        const follows: Follows = () => T.of(true);

        const rendered = JSDOM.fragment(
          await renderFollowToggle(follows)(O.some(userId), editorialCommunityId)(),
        );

        const button = rendered.querySelector('button');
        const buttonText = button?.textContent;

        expect(buttonText).toBe('Unfollow');
      });
    });

    describe('when the community is not currently followed', () => {
      it('shows a follow button', async () => {
        const userId = toUserId('u1');
        const editorialCommunityId = new GroupId('');

        const follows: Follows = () => T.of(false);

        const rendered = JSDOM.fragment(await renderFollowToggle(follows)(O.some(userId), editorialCommunityId)());

        const button = rendered.querySelector('button');
        const buttonText = button?.textContent;

        expect(buttonText).toBe('Follow');
      });
    });
  });

  describe('the user is not logged in', () => {
    it('shows a follow button', async () => {
      const editorialCommunityId = new GroupId('');

      const follows: Follows = () => T.of(false);

      const rendered = JSDOM.fragment(await renderFollowToggle(follows)(O.none, editorialCommunityId)());

      const button = rendered.querySelector('button');
      const buttonText = button?.textContent;

      expect(buttonText).toBe('Follow');
    });
  });
});