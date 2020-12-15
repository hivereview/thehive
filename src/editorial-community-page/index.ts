import { URL } from 'url';
import * as O from 'fp-ts/lib/Option';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import { NotFound } from 'http-errors';
import { Remarkable } from 'remarkable';
import { Maybe, Result } from 'true-myth';
import createGetFollowersFromIds, { UserDetails } from './get-followers-from-ids';
import createGetMostRecentEvents, { GetAllEvents } from './get-most-recent-events';
import createProjectFollowerIds from './project-follower-ids';
import createRenderDescription, { GetEditorialCommunityDescription, RenderDescription } from './render-description';
import createRenderFeed, { RenderFeed } from './render-feed';
import createRenderFollowToggle, { Follows } from './render-follow-toggle';
import createRenderFollowers from './render-followers';
import createRenderPage, { RenderPage } from './render-page';
import createRenderPageHeader, { GetEditorialCommunity, RenderPageHeader } from './render-page-header';
import createRenderSummaryFeedItem, { GetActor } from '../shared-components/render-summary-feed-item';
import createRenderSummaryFeedList from '../shared-components/render-summary-feed-list';
import EditorialCommunityId from '../types/editorial-community-id';
import { FetchExternalArticle } from '../types/fetch-external-article';
import { User } from '../types/user';
import { UserId } from '../types/user-id';

type FetchStaticFile = (filename: string) => Promise<string>;

type FetchEditorialCommunity = (editorialCommunityId: EditorialCommunityId) => Promise<Maybe<{
  name: string;
  avatar: URL;
  descriptionPath: string;
}>>;

type GetUserDetails = (userId: UserId) => TE.TaskEither<'not-found' | 'unavailable', UserDetails>;
interface Ports {
  fetchArticle: FetchExternalArticle;
  fetchStaticFile: FetchStaticFile;
  getEditorialCommunity: FetchEditorialCommunity;
  getAllEvents: GetAllEvents;
  follows: Follows,
  getUserDetails: GetUserDetails,
}

const buildRenderPageHeader = (ports: Ports): RenderPageHeader => {
  const getEditorialCommunity: GetEditorialCommunity = async (editorialCommunityId) => {
    const editorialCommunity = (await ports.getEditorialCommunity(editorialCommunityId))
      .unwrapOrElse(() => {
        throw new NotFound(`${editorialCommunityId.value} not found`);
      });
    return editorialCommunity;
  };
  return createRenderPageHeader(getEditorialCommunity);
};

const buildRenderDescription = (ports: Ports): RenderDescription => {
  const converter = new Remarkable({ html: true });
  const getEditorialCommunityDescription: GetEditorialCommunityDescription = async (editorialCommunityId) => {
    const editorialCommunity = (await ports.getEditorialCommunity(editorialCommunityId))
      .unwrapOrElse(() => {
        throw new NotFound(`${editorialCommunityId.value} not found`);
      });
    const markdown = await ports.fetchStaticFile(`editorial-communities/${editorialCommunity.descriptionPath}`);
    return converter.render(markdown);
  };
  return createRenderDescription(getEditorialCommunityDescription);
};

const buildRenderFeed = (ports: Ports): RenderFeed => {
  const getActorAdapter: GetActor = async (id) => {
    const editorialCommunity = (await ports.getEditorialCommunity(id)).unsafelyUnwrap();
    return {
      name: editorialCommunity.name,
      imageUrl: editorialCommunity.avatar.toString(),
      url: `/editorial-communities/${id.value}`,
    };
  };
  const getEventsAdapter = createGetMostRecentEvents(ports.getAllEvents, 20);
  const renderSummaryFeedItem = createRenderSummaryFeedItem(getActorAdapter, ports.fetchArticle);
  const renderFollowToggle = createRenderFollowToggle(ports.follows);
  return createRenderFeed(
    getEventsAdapter,
    createRenderSummaryFeedList(renderSummaryFeedItem),
    renderFollowToggle,
  );
};

export interface Params {
  id?: string;
  user: Maybe<User>;
}

type EditorialCommunityPage = (params: Params) => ReturnType<RenderPage>;

export default (ports: Ports): EditorialCommunityPage => {
  const renderPageHeader = buildRenderPageHeader(ports);
  const renderDescription = buildRenderDescription(ports);
  const renderFeed = buildRenderFeed(ports);
  const wrapGetUserDetails = async (userId: UserId): Promise<Result<UserDetails, 'not-found' | 'unavailable'>> => (
    pipe(
      userId,
      ports.getUserDetails,
      TE.fold(
        (error) => T.of(Result.err<UserDetails, 'not-found' | 'unavailable'>(error)),
        (userDetails) => T.of(Result.ok<UserDetails, 'not-found' | 'unavailable'>(userDetails)),
      ),
    )()
  );
  const getFollowers = createGetFollowersFromIds(createProjectFollowerIds(ports.getAllEvents), wrapGetUserDetails);
  const renderFollowers = createRenderFollowers(getFollowers);

  const renderPage = createRenderPage(
    renderPageHeader,
    renderDescription,
    renderFeed,
    renderFollowers,
    // TODO: do not unsafelyUnwrap()
    async (id) => (await ports.getEditorialCommunity(id)).unwrapOrElse(() => {
      throw new NotFound(`${id.value} not found`);
    }).name,
  );
  return async (params) => {
    const editorialCommunityId = new EditorialCommunityId(params.id ?? '');
    const userId = pipe(
      params.user.mapOr(O.none, (v) => O.some(v)),
      O.map((user) => user.id),
    );
    return renderPage(editorialCommunityId, userId);
  };
};
