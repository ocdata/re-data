const path = require('path');
const fs = require('fs');
const request = require('request');
const RpNewImporter = require('./../lib/rp_new/rp_new_importer');
const events = require('./../config/events');
const JSONRequester = require('../lib/json_requester');
const trackColors = require('./track_colors');
const cheerio = require('cheerio');
const youTubeLinks = require('../lib/youtube');

const EVENT_ID = 'rp19';
const SUBCONFERENCES = {
  sideevents: {
    id: `${EVENT_ID}-sideevents`,
    label: 'Side Events',
    type: 'subconference',
    event: EVENT_ID,
  },
  netzfest: {
    id: `${EVENT_ID}-netzfest`,
    label: 'Netzfest',
    type: 'subconference',
    event: EVENT_ID,
  },
  mediaconvention: {
    id: `${EVENT_ID}-mediaconvention`,
    label: 'Media Convention Berlin',
    type: 'subconference',
    event: EVENT_ID,
  },
};
const dumpFolder = `${path.resolve(__dirname, '../../web/data/')}/${EVENT_ID}/`;

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);


function praseData(result, ytrecordings = {}, subconferenceFunction = undefined, callback) {
  const options = {
    sessionUrlPrefix: 'https://19.re-publica.com/en/session/',
    speakerUrlPrefix: 'https://19.re-publica.com/de/member/',
    speakerPicturePrefix: 'https://re-publica.com',
    dayNames: {
      '2019-05-02': { de: 'Tag 1', en: 'Day 1' },
      '2019-05-03': { de: 'Tag 2', en: 'Day 2' },
      '2019-05-04': { de: 'Tag 3', en: 'Day 3' },
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
      'Lab1886 Truck',
      'Speakers; Corner',
      'Technikmuseum',
      'Xtra - rp18 side events',
    ],
    trackColorMap: trackColors,
    recordedLocationIds: [],
    locationStreamLinks: {},
    locationLiveEnclosureUrls: {},
    ytrecordings,
    subconferenceFunction,
  };

  const importer = new RpNewImporter(
    event,
    result.sessions,
    result.speakers,
    options,
  );

  // dump source JSONs
  fs.mkdir(dumpFolder, () => {
    fs.writeFileSync(`${dumpFolder}/sessions-source.json`, JSON.stringify(result.sessions, null, '\t'), 'utf8');
    fs.writeFileSync(`${dumpFolder}/speakers-source.json`, JSON.stringify(result.speakers, null, '\t'), 'utf8');
  });
  
  callback(importer.JSON);
}


async function loadRpData(urls, subconferenceFunction) {
  return new Promise((resolve, reject) => {
    JSONRequester.get(
      { urls },
      (result) => {
        praseData(
          result,
          {},
          subconferenceFunction,
          (json) => {
            if (json) {
              resolve(json);
            } else {
              reject();
            }
          },
        );
      },
    );
  });
}

exports.scrape = (callback) => {
  const filenamesAndSubconfs = [
    {
      sessionsFilename: 'sessions18',
      speakersFilename: 'speakers18',
      subconferenceFunction: (session, json) => {
        if (json.conference === 'Media Convention Berlin 2018') {
          return SUBCONFERENCES.mediaconvention;
        }
        return null;
      },
    },
    {
      sessionsFilename: 'sideevents_sessions',
      speakersFilename: 'sideevents_sessions',
      subconferenceFunction: () => SUBCONFERENCES.sideevents,
    },
  ];
  const promises = filenamesAndSubconfs.map((f) => {
    const promise = loadRpData(
      {
        sessions: `https://re-publica.com/files/rest/${f.sessionsFilename}.json`,
        speakers: `https://re-publica.com/files/rest/${f.speakersFilename}.json`,
      },
      f.subconferenceFunction,
    );
    return promise;
  });

  Promise.all(promises)
    .then((result) => {
      const [firstElement] = result;
      let data = [];
      if (Array.isArray(firstElement)) {
        data = result.reduce((acc, cur) => {
          const res = acc.concat(cur);
          return res;
        }, []);
      } else {
        data = result;
      }
      Object.values(SUBCONFERENCES).forEach(s => data.push(s));
      callback(data);
    })
    .catch(error => console.error(error.title, error.message));
};
