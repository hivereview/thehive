import { performance } from 'perf_hooks';
import * as T from 'fp-ts/Task';
import { recentActivity } from '../../../src/group-page/recent-activity/recent-activity';
import { editorialCommunityReviewedArticle } from '../../../src/types/domain-events';
import { arbitraryDate, arbitraryWord } from '../../helpers';
import { shouldNotBeCalled } from '../../should-not-be-called';
import { arbitraryDoi } from '../../types/doi.helper';
import { arbitraryGroupId } from '../../types/group-id.helper';
import { arbitraryReviewId } from '../../types/review-id.helper';

const numberOfEvents = 1000;

const events = (
  [...Array(numberOfEvents)].map(() => editorialCommunityReviewedArticle(
    arbitraryGroupId(),
    arbitraryDoi(),
    arbitraryReviewId(),
    arbitraryDate(),
  ))
);

describe('recent-activity', () => {
  describe('given a large set of events', () => {
    it('performs acceptably', async () => {
      const ports = {
        fetchArticle: shouldNotBeCalled,
        findVersionsForArticleDoi: shouldNotBeCalled,
        getAllEvents: T.of(events),
      };
      const group = {
        id: arbitraryGroupId(),
        name: arbitraryWord(),
        avatarPath: arbitraryWord(),
        descriptionPath: arbitraryWord(),
        shortDescription: arbitraryWord(),
      };
      const startTime = performance.now();
      await recentActivity(ports)(group)();
      const endTime = performance.now();
      const runtime = endTime - startTime;

      expect(runtime).toBeLessThan(1000);
    });
  });
});