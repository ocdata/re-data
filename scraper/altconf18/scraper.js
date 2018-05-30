const events = require('./../config/events');
const path = require('path');
const CSVImporter = require('../lib/altconf_csv/altconf_csv_importer');

const EVENT_ID = 'altconf18';

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);

const importer = new CSVImporter(
  event,
  path.join(__dirname, 'altconf18.csv'),
  {
    dayNames: {
      '2018-06-04': { de: 'Mo', en: 'Mon' },
      '2018-06-05': { de: 'Di', en: 'Tue' },
      '2018-06-06': { de: 'Mi', en: 'Wed' },
      '2018-06-07': { de: 'Do', en: 'Thu' },
      '2018-06-08': { de: 'Fr', en: 'Fri' },
    },
  },
);

exports.scrape = (callback) => {
  callback(importer.JSON);
};
