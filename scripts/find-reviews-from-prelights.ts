import axios from 'axios';
import parser from 'fast-xml-parser';
import * as E from 'fp-ts/Either';
import * as RA from 'fp-ts/ReadonlyArray';
import { constant, pipe } from 'fp-ts/function';
import * as t from 'io-ts';
import * as tt from 'io-ts-types';
import * as PR from 'io-ts/PathReporter';

const key = process.env.PRELIGHTS_FEED_KEY ?? '';

const prelightsFeedCodec = t.type({
  rss: t.type({
    channel: t.type({
      item: t.array(t.type({
        pubDate: tt.DateFromISOString,
        guid: t.string,
        preprints: t.union([t.type({
          preprint: t.type({
            preprinturl: t.string,
          }),
        }),
        t.array(t.type({
          preprinturl: t.string,
        }))]),
      })),
    }),
  }),
});

const toDoi = (url: string) => {
  const doiRegex = '(10\\.[0-9]{4,}(?:\\.[1-9][0-9]*)*/(?:[^%"#?\\s])+)';
  const matches = new RegExp(`https?://(?:www.)?biorxiv.org/content/${doiRegex}v[0-9]+$`).exec(url);
  if (matches === null) {
    const msg = `WARNING: Cannot parse url to DOI: ${url}\n`;
    process.stderr.write(msg);
    return E.left(msg);
  }
  return E.right(matches[1]);
};

type Prelight = {
  guid: string,
  pubDate: Date,
  preprintUrl: string,
};

void (async (): Promise<void> => {
  pipe(
    await axios.get<string>(`https://prelights.biologists.com/feed/sciety/?key=${key}`, {
      headers: {
        'User-Agent': 'Sciety (http://sciety.org; mailto:team@sciety.org)',
      },
    }),
    (response) => response.data,
    (responseBody) => parser.parse(responseBody) as JSON,
    prelightsFeedCodec.decode,
    E.map((feed) => pipe(
      feed.rss.channel.item,
      RA.chain((item): Array<Prelight> => {
        if (item.preprints instanceof Array) {
          return item.preprints.map((preprintItem) => ({
            ...item,
            preprintUrl: preprintItem.preprinturl,
          }));
        }
        return [{
          ...item,
          preprintUrl: item.preprints.preprint.preprinturl,
        }];
      }),
      RA.map((item) => pipe(
        toDoi(item.preprintUrl),
        E.map((articleDoi) => ({
          date: item.pubDate.toISOString(),
          articleDoi,
          evaluationLocator: `prelights:${item.guid.replace('&#038;', '&')}`,
        })),
      )),
      RA.rights,
    )),
    E.bimap(
      (errors) => process.stderr.write(PR.failure(errors).join('\n')),
      RA.map(({ date, articleDoi, evaluationLocator }) => process.stdout.write(`${date},${articleDoi},${evaluationLocator}\n`)),
    ),
    E.fold(constant(1), constant(0)),
    (exitStatus) => process.exit(exitStatus),
  );
})();
