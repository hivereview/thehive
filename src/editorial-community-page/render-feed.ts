import { Maybe } from 'true-myth';
import { RenderFollowToggle } from './render-follow-toggle';
import EditorialCommunityId from '../types/editorial-community-id';
import { HtmlFragment, toHtmlFragment } from '../types/html-fragment';
import { UserId } from '../types/user-id';

export type RenderFeed = (editorialCommunityId: EditorialCommunityId, userId: Maybe<UserId>) => Promise<HtmlFragment>;

export type GetEvents<T> = (editorialCommunityId: EditorialCommunityId) => Promise<Array<T>>;

type RenderSummaryFeedList<T> = (events: ReadonlyArray<T>) => Promise<Maybe<string>>;

const emptyFeed = toHtmlFragment(`
  <p>
    It looks like this community hasn’t evaluated any articles yet. Try coming back later!
  </p>
`);

export default <T>(
  getEvents: GetEvents<T>,
  renderSummaryFeedList: RenderSummaryFeedList<T>,
  renderFollowToggle: RenderFollowToggle,
): RenderFeed => async (editorialCommunityId, userId) => {
  const events = await getEvents(editorialCommunityId);
  return toHtmlFragment(`
      <section>
        <h2>
          Feed
        </h2>
        ${await renderFollowToggle(userId, editorialCommunityId)}
        ${(await renderSummaryFeedList(events)).unwrapOr(emptyFeed)}
      </section>
    `);
};
