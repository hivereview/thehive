import debug from 'debug';
import fetch from '@rdfjs/fetch-lite';
import JsonLdParser from '@rdfjs/parser-jsonld';
import SinkMap from '@rdfjs/sink-map';
import { EventEmitter } from 'events';
import datasetFactory from 'rdf-dataset-indexed';
import { DatasetCore, NamedNode, Stream } from 'rdf-js';

export type FetchDataset = (iri: NamedNode) => Promise<DatasetCore>;

export default (): FetchDataset => {
  const log = debug('app:api:fetch-dataset');
  const factory = { dataset: datasetFactory };
  const parsers = new SinkMap<EventEmitter, Stream>();
  parsers.set('application/vnd.schemaorg.ld+json', new JsonLdParser());
  const fetchOptions = { factory, formats: { parsers } };

  return async (iri: NamedNode): Promise<DatasetCore> => {
    log(`Fetching dataset for ${iri.value}`);
    const response = await fetch<DatasetCore>(iri.value, fetchOptions);

    if (!response.ok) {
      throw new Error(`Received a ${response.status} ${response.statusText} for ${response.url}`);
    }

    return response.dataset();
  };
};
