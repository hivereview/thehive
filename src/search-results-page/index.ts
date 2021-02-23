import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import { flow, pipe } from 'fp-ts/function';
import { renderErrorPage, RenderPage, renderPage } from './render-page';
import { ArticleSearchResult, createRenderSearchResult, GetReviewCount } from './render-search-result';
import { renderSearchResults } from './render-search-results';
import { FindReviewsForArticleDoi, search } from './search';
import { toHtmlFragment } from '../types/html-fragment';

type OriginalSearchResults = {
  items: ReadonlyArray<Omit<Omit<ArticleSearchResult, '_tag'>, 'reviewCount'>>,
  total: number,
};

type FindArticles = (query: string) => TE.TaskEither<'unavailable', OriginalSearchResults>;

type Ports = {
  searchEuropePmc: FindArticles,
  findReviewsForArticleDoi: FindReviewsForArticleDoi,
};

type Params = {
  query?: string,
};

type SearchResultsPage = (params: Params) => ReturnType<RenderPage>;

export const searchResultsPage = (ports: Ports): SearchResultsPage => {
  const getReviewCount: GetReviewCount = (doi) => pipe(
    ports.findReviewsForArticleDoi(doi),
    T.map((list) => list.length),
    TE.rightTask,
  );
  const renderSearchResult = createRenderSearchResult(getReviewCount);

  return (params) => pipe(
    params.query ?? '', // TODO: use Option
    search(ports.searchEuropePmc, ports.findReviewsForArticleDoi),
    TE.chainW(
      flow(
        renderSearchResults(renderSearchResult)(params.query ?? ''),
        TE.rightTask,
      ),
    ),
    TE.map(toHtmlFragment),
    TE.bimap(renderErrorPage, renderPage),
  );
};