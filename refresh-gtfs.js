import { importGtfs } from 'gtfs';
import { readFile } from 'fs';

readFile('./config.json', (err, config) => {
  importGtfs(JSON.parse(config));
});