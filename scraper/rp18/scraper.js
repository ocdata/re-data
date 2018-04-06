const RpNewImporter = require('./../lib/rp_new/rp_new_importer');
const events = require('./../config/events');
const path = require('path');
const json_requester = require('../lib/json_requester');
const EVENT_ID = 'rp18';

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw `Could not find event ${EVENT_ID}`;

exports.scrape = (callback) => {
  json_requester.get(
    {
      urls: {
        sessions: 'https://18.re-publica.com/sessions/rest/json',
        speakers: 'https://18.re-publica.com/speakers/rest/json',
      },
    },
    (result) => {
      const importer = new RpNewImporter(
        event,
        result.sessions,
        result.speakers,
        {
          sessionUrlPrefix: 'https://18.re-publica.com/en/session/',
          speakerUrlPrefix: 'https://18.re-publica.com/de/member/',
        },
      );

      callback(importer.JSON);
    },
  );
};
