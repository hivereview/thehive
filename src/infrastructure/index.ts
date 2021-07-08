import * as A from 'fp-ts/Array';
import * as I from 'fp-ts/Identity';
import { Json } from 'fp-ts/Json';
import * as O from 'fp-ts/Option';
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { identity, pipe } from 'fp-ts/function';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { Adapters } from './adapters';
import { biorxivCache } from './biorxiv-cache';
import { commitEvents } from './commit-events';
import { createEventSourceFollowListRepository } from './event-sourced-follow-list-repository';
import { fetchCrossrefArticle } from './fetch-crossref-article';
import { fetchDataciteReview } from './fetch-datacite-review';
import { fetchDataset } from './fetch-dataset';
import { fetchHypothesisAnnotation } from './fetch-hypothesis-annotation';
import { fetchNcrcReview } from './fetch-ncrc-review';
import { fetchPrelightsHighlight } from './fetch-prelights-highlight';
import { fetchRapidReview } from './fetch-rapid-review';
import { fetchReview } from './fetch-review';
import { fetchStaticFile } from './fetch-static-file';
import { fetchData } from './fetchers';
import { findGroups } from './find-groups';
import { findReviewsForArticleDoi } from './find-reviews-for-article-doi';
import { follows } from './follows';
import { getArticleVersionEventsFromBiorxiv } from './get-article-version-events-from-biorxiv';
import { getEventsFromDataFiles } from './get-events-from-data-files';
import { getEventsFromDatabase } from './get-events-from-database';
import { getHtml } from './get-html';
import { getTwitterResponse } from './get-twitter-response';
import { getTwitterUserDetails } from './get-twitter-user-details';
import { getTwitterUserId } from './get-twitter-user-id';
import { getXmlFromCrossrefRestApi } from './get-xml-from-crossref-rest-api';
import { inMemoryGroupRepository } from './in-memory-groups';
import { inMemoryResponseCache } from './in-memory-response-cache';
import {
  jsonSerializer, loggerIO, rTracerLogger, streamLogger,
} from './logger';
import { redisCache } from './redis-cache';
import { searchEuropePmc } from './search-europe-pmc';
import { bootstrapGroups } from '../data/bootstrap-groups';
import * as DomainEvent from '../types/domain-events';

type Dependencies = {
  prettyLog: boolean,
  logLevel: string, // TODO: Make this a level name
  crossrefApiBearerToken: O.Option<string>,
  twitterApiBearerToken: string,
};

export const createInfrastructure = (dependencies: Dependencies): TE.TaskEither<unknown, Adapters> => pipe(
  I.Do,
  I.apS('logger', pipe(
    dependencies.prettyLog,
    jsonSerializer,
    (serializer) => streamLogger(process.stdout, serializer, dependencies.logLevel),
    rTracerLogger,
  )),
  I.apS('pool', new Pool()),
  TE.right,
  TE.chainFirst(({ pool }) => TE.tryCatch(
    async () => pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id uuid,
        type varchar,
        date timestamp,
        payload jsonb,
        PRIMARY KEY (id)
      );
    `),
    identity,
  )),
  TE.bindW('eventsFromDatabase', ({ pool, logger }) => getEventsFromDatabase(pool, loggerIO(logger))),
  TE.apSW('eventsFromDataFiles', pipe(
    bootstrapGroups,
    RNEA.map(({ id }) => id),
    getEventsFromDataFiles,
  )),
  TE.bindW('events', ({ eventsFromDataFiles, eventsFromDatabase }) => pipe(
    eventsFromDataFiles.concat(eventsFromDatabase),
    A.sort(DomainEvent.byDate),
    TE.right,
  )),
  TE.chain((adapters) => TE.tryCatch(
    async () => {
      const { events, logger, pool } = adapters;

      const getJson = async (uri: string) => {
        const response = await fetchData(logger)<Json>(uri);
        return response.data;
      };

      const groups = inMemoryGroupRepository(bootstrapGroups);
      const getAllEvents = T.of(events);
      const getFollowList = createEventSourceFollowListRepository(getAllEvents);
      const fetchFile = (f: string) => fetchStaticFile(f)(loggerIO(logger));
      const fetchers = {
        doi: fetchDataciteReview(fetchDataset(logger), logger),
        hypothesis: fetchHypothesisAnnotation(getJson, logger),
        ncrc: fetchNcrcReview(logger),
        prelights: fetchPrelightsHighlight(getHtml(logger)),
        rapidreviews: fetchRapidReview(logger, getHtml(logger)),
      };

      const crossrefCache = (process.env.APP_CACHE ?? 'in-memory') === 'redis'
        ? redisCache(
          new Redis({ host: process.env.REDIS_HOST ?? 'localhost' }),
          getXmlFromCrossrefRestApi(
            logger,
            dependencies.crossrefApiBearerToken,
          ),
          logger,
        )
        : inMemoryResponseCache(
          getXmlFromCrossrefRestApi(
            logger,
            dependencies.crossrefApiBearerToken,
          ),
          logger,
        );

      return {
        fetchArticle: fetchCrossrefArticle(crossrefCache, logger),
        fetchReview: fetchReview(fetchers),
        fetchStaticFile: fetchFile,
        findGroups: findGroups(fetchFile, bootstrapGroups),
        searchEuropePmc: (...params) => (...args) => (
          searchEuropePmc(...params)(...args)({ getJson, logger })
        ),
        getGroup: groups.lookup,
        getAllGroups: groups.all,
        findReviewsForArticleDoi: (...args) => findReviewsForArticleDoi(...args)(getAllEvents),
        getAllEvents,
        commitEvents: (...args) => commitEvents(...args)({ inMemoryEvents: events, pool, logger: loggerIO(logger) }),
        getFollowList,
        getUserDetails: getTwitterUserDetails(
          getTwitterResponse(dependencies.twitterApiBearerToken, logger),
          logger,
        ),
        getUserId: getTwitterUserId(
          getTwitterResponse(dependencies.twitterApiBearerToken, logger),
          logger,
        ),
        follows: (...args) => follows(...args)(getAllEvents),
        findVersionsForArticleDoi: biorxivCache(
          (...args) => getArticleVersionEventsFromBiorxiv(...args)({ getJson, logger: loggerIO(logger) }),
          logger,
        ),
        ...adapters,
      };
    },
    identity,
  )),
);
