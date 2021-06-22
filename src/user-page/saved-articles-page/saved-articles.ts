import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { flow } from 'fp-ts/function';
import {
  FindReviewsForArticleDoi, populateArticleViewModel,
} from './populate-article-view-model';
import { GetAllEvents, projectSavedArticleDois } from './project-saved-article-dois';
import { renderSavedArticles } from './render-saved-articles';
import { FindVersionsForArticleDoi, getLatestArticleVersionDate } from '../../shared-components/article-card/get-latest-article-version-date';
import { ArticleServer } from '../../types/article-server';
import { Doi } from '../../types/doi';
import { HtmlFragment, toHtmlFragment } from '../../types/html-fragment';
import { SanitisedHtmlFragment } from '../../types/sanitised-html-fragment';
import { UserId } from '../../types/user-id';

type FetchArticle = (doi: Doi) => TE.TaskEither<unknown, {
  doi: Doi,
  server: ArticleServer,
  title: SanitisedHtmlFragment,
  authors: ReadonlyArray<string>,
}>;

export type Ports = {
  getAllEvents: GetAllEvents,
  fetchArticle: FetchArticle,
  findReviewsForArticleDoi: FindReviewsForArticleDoi,
  findVersionsForArticleDoi: FindVersionsForArticleDoi,
};

const renderUnavailable = () => toHtmlFragment('<p>We couldn\'t find this information; please try again later.</p>');

type SavedArticles = (ports: Ports) => (u: UserId) => TE.TaskEither<never, HtmlFragment>;

export const savedArticles: SavedArticles = (ports) => flow(
  projectSavedArticleDois(ports.getAllEvents),
  T.chain(TE.traverseArray(ports.fetchArticle)),
  TE.chainTaskK(T.traverseArray(populateArticleViewModel({
    findReviewsForArticleDoi: ports.findReviewsForArticleDoi,
    getLatestArticleVersionDate: getLatestArticleVersionDate(ports.findVersionsForArticleDoi),
  }))),
  T.map(E.fold(renderUnavailable, renderSavedArticles)),
  TE.rightTask,
);