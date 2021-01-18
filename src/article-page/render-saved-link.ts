import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import * as B from 'fp-ts/boolean';
import { constant, pipe } from 'fp-ts/function';
import { HtmlFragment, toHtmlFragment } from '../types/html-fragment';
import { UserId } from '../types/user-id';

// TODO overload to prevent hasUserSavedArticle being true and userId being O.none
type RenderSavedLink = (hasUserSavedArticle: boolean, userId: O.Option<UserId>) => T.Task<HtmlFragment>;

const templateSavedLink = (userId: UserId): string => `
  <a class="saved-to-list" href="/users/${userId}#saved-articles">
    <img src="/static/images/playlist_add_check-24px.svg" alt="" class="saved-to-list__icon">
    Saved to my list
  </a>
`;

export const renderSavedLink: RenderSavedLink = (hasUserSavedArticle, userId) => pipe(
  userId,
  O.fold(
    constant(T.of('')),
    (u) => pipe(
      T.of(hasUserSavedArticle),
      T.map(B.fold(
        constant(''),
        () => templateSavedLink(u),
      )),
    ),
  ),
  T.map(toHtmlFragment),
);
