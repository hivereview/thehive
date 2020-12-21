import * as O from 'fp-ts/lib/Option';
import * as T from 'fp-ts/lib/Task';
import EditorialCommunityId from '../types/editorial-community-id';
import { HtmlFragment, toHtmlFragment } from '../types/html-fragment';
import { UserId } from '../types/user-id';

export type RenderFollowToggle = (
  userId: O.Option<UserId>,
  editorialCommunityId: EditorialCommunityId
) => Promise<HtmlFragment>;

export type Follows = (userId: UserId, editorialCommunityId: EditorialCommunityId) => T.Task<boolean>;

const renderFollowButton = (editorialCommunityId: EditorialCommunityId): string => `
  <form method="post" action="/follow" class="follow-toggle">
    <input type="hidden" name="editorialcommunityid" value="${editorialCommunityId.value}">
    <button type="submit" class="button button--primary button--small">Follow</button>
  </form>
`;

const renderUnfollowButton = (editorialCommunityId: EditorialCommunityId): string => `
  <form method="post" action="/unfollow" class="follow-toggle">
    <input type="hidden" name="editorialcommunityid" value="${editorialCommunityId.value}">
    <button type="submit" class="button button--small">Unfollow</button>
  </form>
`;

export default (follows: Follows): RenderFollowToggle => (
  async (userId, editorialCommunityId) => {
    const userFollows = await O.fold(
      () => T.of(false),
      (value: UserId) => follows(value, editorialCommunityId),
    )(userId)();

    if (userFollows) {
      return toHtmlFragment(renderUnfollowButton(editorialCommunityId));
    }

    return toHtmlFragment(renderFollowButton(editorialCommunityId));
  }
);
