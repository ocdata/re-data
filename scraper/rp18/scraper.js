const RpNewImporter = require('./../lib/rp_new/rp_new_importer');
const events = require('./../config/events');
const JSONRequester = require('../lib/json_requester');

const EVENT_ID = 'rp18';

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);

exports.scrape = (callback) => {
  JSONRequester.get(
    {
      urls: {
        sessions: 'https://re-publica.com/files/rest/sessions.json',
        speakers: 'https://re-publica.com/files/rest/speakers.json',
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
