import { URL } from 'url';
import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';
import { FetchDataciteReview } from '../../src/infrastructure/fetch-datacite-review';
import { FetchHypothesisAnnotation } from '../../src/infrastructure/fetch-hypothesis-annotation';
import { createFetchReview } from '../../src/infrastructure/fetch-review';
import { Doi } from '../../src/types/doi';
import { toHtmlFragment } from '../../src/types/html-fragment';
import { HypothesisAnnotationId } from '../../src/types/hypothesis-annotation-id';
import { shouldNotBeCalled } from '../should-not-be-called';

const reviewDoi = new Doi('10.5281/zenodo.3678325');

const fetchedReview = {
  publicationDate: O.some(new Date()),
  fullText: pipe('Very good', toHtmlFragment, O.some),
  url: new URL('https://example.com'),
};

describe('fetch-review', (): void => {
  it('returns a Datacite review when given a DOI', async () => {
    const fetchDataciteReview: FetchDataciteReview = () => T.of(fetchedReview);
    const fetchReview = createFetchReview(fetchDataciteReview, shouldNotBeCalled);
    const review = await fetchReview(reviewDoi)();

    expect(review).toStrictEqual(fetchedReview);
  });

  it('returns a Hypothes.is annotation when given a Hypothes.is id', async () => {
    const fetchHypothesisAnnotation: FetchHypothesisAnnotation = () => T.of(fetchedReview);
    const fetchReview = createFetchReview(shouldNotBeCalled, fetchHypothesisAnnotation);
    const review = await fetchReview(new HypothesisAnnotationId('fhAtGNVDEemkyCM-sRPpVQ'))();

    expect(review).toStrictEqual(fetchedReview);
  });
});
