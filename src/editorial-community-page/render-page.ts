import { sequenceS } from 'fp-ts/lib/Apply';
import * as O from 'fp-ts/lib/Option';
import * as T from 'fp-ts/lib/Task';
import { pipe } from 'fp-ts/lib/function';
import { isHttpError } from 'http-errors';
import { NOT_FOUND } from 'http-status-codes';
import { Result } from 'true-myth';
import { EditorialCommunity } from '../types/editorial-community';
import EditorialCommunityId from '../types/editorial-community-id';
import { HtmlFragment, toHtmlFragment } from '../types/html-fragment';
import { RenderPageError } from '../types/render-page-error';
import { UserId } from '../types/user-id';

type Component = (editorialCommunityId: EditorialCommunityId, userId: O.Option<UserId>) => T.Task<string>;

export type RenderPage = (
  editorialCommunity: EditorialCommunity,
  userId: O.Option<UserId>
) => T.Task<Result<{
  title: string,
  content: HtmlFragment
}, RenderPageError>>;

type RenderPageHeader = (editorialCommunity: EditorialCommunity) => HtmlFragment;

type RenderDescription = (editorialCommunity: EditorialCommunity) => T.Task<HtmlFragment>;

type Components = {
  header: HtmlFragment,
  description: HtmlFragment,
  feed: string,
  followers: HtmlFragment,
};

const render = (components: Components): string => `
  <div class="sciety-grid sciety-grid--editorial-community">
    ${components.header}
    <div class="editorial-community-page-description">
    ${components.description}
    </div>
    <div class="editorial-community-page-side-bar">
      ${components.followers}
      ${components.feed}
    </div>
  </div>
`;

export default (
  renderPageHeader: RenderPageHeader,
  renderDescription: RenderDescription,
  renderFeed: Component,
  renderFollowers: (editorialCommunityId: EditorialCommunityId) => T.Task<HtmlFragment>,
): RenderPage => (
  (editorialCommunity, userId) => async () => {
    try {
      return Result.ok({
        title: editorialCommunity.name,
        content: await pipe(
          {
            header: T.of(renderPageHeader(editorialCommunity)),
            description: renderDescription(editorialCommunity),
            followers: renderFollowers(editorialCommunity.id),
            feed: renderFeed(editorialCommunity.id, userId),
          },
          sequenceS(T.task),
          T.map(render),
          T.map(toHtmlFragment),
        )(),
      });
    // TODO: push Results further down
    } catch (error: unknown) {
      if (isHttpError(error) && error.status === NOT_FOUND) {
        return Result.err({
          type: 'not-found',
          message: toHtmlFragment(`Editorial community id '${editorialCommunity.id.value}' not found`),
        });
      }

      return Result.err({
        type: 'unavailable',
        message: toHtmlFragment(`Editorial community id '${editorialCommunity.id.value}' unavailable`),
      });
    }
  }
);
