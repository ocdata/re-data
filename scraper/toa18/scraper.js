const events = require('./../config/events');
const path = require('path');
const CSVImporter = require('../lib/toa_csv/toa_csv_importer');

const EVENT_ID = 'toa18';

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);

const importer = new CSVImporter(
  event,
  path.join(__dirname, 'toa18.csv'),
  {
    dayNames: {
      '2018-06-20': { de: 'Day 1', en: 'Day 1' },
      '2018-06-21': { de: 'Day 2', en: 'Day 2' },
    },
  },
);

exports.scrape = (callback) => {
  callback(importer.JSON);
};
