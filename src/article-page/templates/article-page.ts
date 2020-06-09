import addReviewForm from './add-review-form';
import EditorialCommunityRepository from '../../types/editorial-community-repository';
import createRenderArticleAbstract, { GetArticleAbstract } from '../render-article-abstract';
import createRenderPageHeader, { GetArticleDetails } from '../render-page-header';
import createRenderReviewSummaries, { GetArticleReviewSummaries } from '../render-review-summaries';
import { ArticlePageViewModel } from '../types/article-page-view-model';

export default async (
  { article, reviews }: ArticlePageViewModel,
  editorialCommunities: EditorialCommunityRepository,
): Promise<string> => {
  const getArticleDetailsAdapter: GetArticleDetails = async () => article;
  const abstractAdapter: GetArticleAbstract = async () => ({ content: article.abstract });
  const reviewsAdapter: GetArticleReviewSummaries = async () => reviews;
  const renderPageHeader = createRenderPageHeader(getArticleDetailsAdapter);
  const renderArticleAbstract = createRenderArticleAbstract(abstractAdapter);
  const renderReviewSummaries = createRenderReviewSummaries(reviewsAdapter);
  const renderAddReviewForm = (): string => `
    <div class="add-review__form">
      <h2 class="ui header"> Add a review<br/>to this article </h2>
      ${addReviewForm(article.doi, editorialCommunities)}
    </div>
  `;
  return `<article>
    ${await renderPageHeader(article.doi)}
    <div class="content">
      ${await renderArticleAbstract(article.doi)}
      <section class="review-summary-list">
        ${await renderReviewSummaries()}
      </section>
    </div>
    <aside>
      ${renderAddReviewForm()}
    </aside>
  </article>`;
};
