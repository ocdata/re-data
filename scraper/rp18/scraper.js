const path = require('path');
const fs = require('fs');
const RpNewImporter = require('./../lib/rp_new/rp_new_importer');
const events = require('./../config/events');
const JSONRequester = require('../lib/json_requester');
const trackColors = require('./track_colors');

const EVENT_ID = 'rp18';
const dumpFolder = `${path.resolve(__dirname, '../../web/data/')}/${EVENT_ID}/`;

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);

exports.scrape = (callback) => {
  JSONRequester.get(
    {
      urls: {
        sessions: 'https://18.re-publica.com/files/rest/sessions.json',
        speakers: 'https://18.re-publica.com/files/rest/speakers.json',
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
          speakerPicturePrefix: 'https://re-publica.com',
          dayNames: {
            '2018-05-02': 'Tag 1',
            '2018-05-03': 'Tag 2',
            '2018-05-04': 'Tag 3',
          },
          locationIndices: [
            'Stage 1',
            'Stage 2',
            'Stage 3',
            'Stage 4',
            'Stage 5',
            'Stage 6',
            'Stage 7',
            'Stage 8',
            'Stage 9',
            'Stage T',
            'Stage J',
            'Meet Up 1',
            'Meet Up 2',
            'Meet Up 2',
            'Makerspace indoor',
            'Makerspace outdoor',
            'Kids Space',
            'train2re:publica',
            'POP-up Room',
            'Media Cube',
            'rp:International Space',
            'Xtra - rp18 side events',
          ],
          trackColorMap: trackColors,
          recordedLocationIds: [
            '24458', // 1
            '24459', // 2
            '24460', // 3
            '24461', // 4
            '24462', // 5
            '24465', // 8
            '24462', // 9
            '24466', // T
            '24467', // J
          ],
        },
      );

      // dump source JSONs
      fs.mkdir(dumpFolder, () => {
        fs.writeFileSync(`${dumpFolder}/sessions-source.json`, JSON.stringify(result.sessions, null, '\t'), 'utf8');
        fs.writeFileSync(`${dumpFolder}/speakers-source.json`, JSON.stringify(result.speakers, null, '\t'), 'utf8');
      });
      
      callback(importer.JSON);
    },
  );
};
