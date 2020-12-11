import * as O from 'fp-ts/lib/Option';
import EditorialCommunityId from '../types/editorial-community-id';
import { HtmlFragment, toHtmlFragment } from '../types/html-fragment';
import { UserId } from '../types/user-id';

export type RenderFollowToggle = (
  userId: O.Option<UserId>,
  editorialCommunityId: EditorialCommunityId
) => Promise<HtmlFragment>;

export type Follows = (userId: UserId, editorialCommunityId: EditorialCommunityId) => Promise<boolean>;

export default (follows: Follows): RenderFollowToggle => (
  async (userId, editorialCommunityId) => {
    const userFollows = await O.fold(
      async () => false,
      async (value: UserId) => follows(value, editorialCommunityId),
    )(userId);

    if (userFollows) {
      return toHtmlFragment(`
        <form method="post" action="/unfollow" class="follow-toggle">
          <input type="hidden" name="editorialcommunityid" value="${editorialCommunityId.value}">
          <button type="submit" class="button button--small">Unfollow</button>
        </form>
      `);
    }

    return toHtmlFragment(`
      <form method="post" action="/follow" class="follow-toggle">
        <input type="hidden" name="editorialcommunityid" value="${editorialCommunityId.value}">
        <button type="submit" class="button button--primary button--small">Follow</button>
      </form>
    `);
  }
);
