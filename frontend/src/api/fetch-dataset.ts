import { EventEmitter } from 'events';
import rdfFetch from '@rdfjs/fetch-lite';
import JsonLdParser from '@rdfjs/parser-jsonld';
import SinkMap from '@rdfjs/sink-map';
import isomorphicFetch from 'isomorphic-fetch';
import datasetFactory from 'rdf-dataset-indexed';
import { DatasetCore, NamedNode, Stream } from 'rdf-js';
import createLogger from '../logger';

export type FetchDataset = (iri: NamedNode) => Promise<DatasetCore>;

export class FetchDatasetError extends Error {
  toString(): string {
    return `FetchDatasetError: ${this.message}`;
  }
}

export default (fetcher: typeof fetch = isomorphicFetch): FetchDataset => {
  const log = createLogger('api:fetch-dataset');
  const factory = { dataset: datasetFactory };
  const parsers = new SinkMap<EventEmitter, Stream>();
  parsers.set('application/vnd.schemaorg.ld+json', new JsonLdParser());
  const fetchOptions = { factory, fetch: fetcher, formats: { parsers } };

  return async (iri: NamedNode): Promise<DatasetCore> => {
    log(`Fetching dataset for ${iri.value}`);
    const response = await rdfFetch<DatasetCore>(iri.value, fetchOptions);

    if (!response.ok) {
      throw new FetchDatasetError(`Received a ${response.status} ${response.statusText} for ${response.url}`);
    }

    return response.dataset();
  };
};
