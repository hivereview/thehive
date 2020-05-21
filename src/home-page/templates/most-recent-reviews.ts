import Doi from '../../data/doi';
import { toDisplayString, toString } from '../../templates/date';
import templateListItems from '../../templates/list-items';

interface Review {
  articleDoi: Doi;
  articleTitle: string;
  editorialCommunityName: string;
  added: Date;
}

const templateReview = (review: Review): string => (`
 <a href="/articles/${review.articleDoi}">${review.articleTitle}</a>
 <div>added by ${review.editorialCommunityName}
 <time datetime="${toString(review.added)}" title="${toDisplayString(review.added)}">recently</time></div>
`);

export default (reviews: Array<Review>): string => (`
  <section>

    <h2>
      Most recent reviews
    </h2>

    <ol class="u-normalised-list">
      ${templateListItems(reviews.map(templateReview))}
    </ol>

  </section>
`);
