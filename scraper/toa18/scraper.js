const events = require('./../config/events');
const oldSpeakerIds = require('./speaker_id_mapping');
const JSONRequester = require('../lib/json_requester');
const ToaImporter = require('../lib/toa_json/toa_json_importer');

const EVENT_ID = 'toa18';

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);

// const importer = new CSVImporter(
//   event,
//   path.join(__dirname, 'toa18.csv'),
  
// );

const { data } = oldSpeakerIds;

exports.scrape = (callback) => {
  JSONRequester.get(
    {
      urls: {
        speakers1: 'https://toa.berlin/wp-json/wp/v2/festivality/speakers?posts_per_page=100&page=1',
        speakers2: 'https://toa.berlin/wp-json/wp/v2/festivality/speakers?posts_per_page=100&page=2',
        sessions1: 'https://toa.berlin/wp-json/wp/v2/festivality/talks?posts_per_page=100&page=1',
        sessions2: 'https://toa.berlin/wp-json/wp/v2/festivality/talks?posts_per_page=100&page=2',
        sessions3: 'https://toa.berlin/wp-json/wp/v2/festivality/talks?posts_per_page=100&page=3',
      },
    },
    (result) => {
      const {
        speakers1,
        speakers2,
        sessions1,
        sessions2,
        sessions3,
      } = result;

      const speakers = speakers1.concat(speakers2);
      let sessions = sessions1.concat(sessions2);
      sessions = sessions.concat(sessions3);

      const importer = new ToaImporter(
        event,
        sessions,
        speakers,
        {
          dayNames: {
            '2018-06-20': { de: 'Day 1', en: 'Day 1' },
            '2018-06-21': { de: 'Day 2', en: 'Day 2' },
          },
          stageNameOrder: [
            'Studio 1',
            'Studio 2',
            'Studio 3',
            'Forrest Stage',
          ],
          oldSpeakerIds: data,
          liveStreams: {
            'studio-1': {
              service: 'youtube',
              url: 'https://www.youtube.com/watch?v=r5y9SeGqa-4',
            },
          },
          allowedLocationIds: ['studio-1', 'studio-2', 'studio-3', 'forest-stage'],
        },
      );

      callback(importer.JSON);
    },
  );
};
