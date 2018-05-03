const path = require('path');
const fs = require('fs');
const request = require('request');
const RpNewImporter = require('./../lib/rp_new/rp_new_importer');
const events = require('./../config/events');
const JSONRequester = require('../lib/json_requester');
const trackColors = require('./track_colors');
const cheerio = require("cheerio");
const EVENT_ID = 'rp18';
const dumpFolder = `${path.resolve(__dirname, '../../web/data/')}/${EVENT_ID}/`;

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);

async function updateSessionsWithYoutubeVideosByTitle(userId, prefix = 're:publica 2018 – ') {
  const url = `https://www.youtube.com/user/${userId}/videos`;

  const promise = new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) { reject(error); return; }

      const $ = cheerio.load(body);
      
      const links = {};
      $('a').each((i, link) => {
        const a = $(link);
        const href = a.attr('href');
        const text = a.text().trim();

        if (text.startsWith(prefix)) {
          const textTitle = text.replace(prefix, '').toLowerCase();
          links[textTitle] = `https://www.youtube.com${href}`;
        }
      });
      console.log('found videos: ', Object.keys(links).length);
      resolve(links);
    });
  });
  return promise;
}

function praseData(result, ytrecordings = {}, callback) {
  const importer = new RpNewImporter(
    event,
    result.sessions,
    result.speakers,
    {
      sessionUrlPrefix: 'https://18.re-publica.com/en/session/',
      speakerUrlPrefix: 'https://18.re-publica.com/de/member/',
      speakerPicturePrefix: 'https://re-publica.com',
      dayNames: {
        '2018-05-02': { de: 'Tag 1', en: 'Day 1' },
        '2018-05-03': { de: 'Tag 2', en: 'Day 2' },
        '2018-05-04': { de: 'Tag 3', en: 'Day 3' },
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
        'Speakers&#039; Corner',
        'Technikmuseum',
        'Xtra - rp18 side events',
      ],
      trackColorMap: trackColors,
      recordedLocationIds: [
        '24458', // 1
        '24459', // 2
        '24460', // 3
        '24461', // 4
        '24462', // 5
        '24463', // 6
        '24464', // 7
        '24465', // 8
        '24462', // 9
        '24466', // T
        '24467', // J
      ],
      locationStreamLinks: {
        24458: {
          url: 'https://www.twitch.tv/re_publica',
          service: 'twitch',
        },
        24459: {
          url: 'https://www.youtube.com/watch?v=F_ACezLru_U',
          service: 'youtube',
        },
      },
      locationLiveEnclosureUrls: {
        24464: {
          url: 'https://alex-front.rosebud-media.de/live/smil:alexlivetv.smil/playlist.m3u8',
          thumb: 'https://www.alex-berlin.de/files/theme/img/livestream/tvlivestream.jpg',
        },
        24463: {
          url: 'https://alex-front.rosebud-media.de/event/smil:alexevent.smil/playlist.m3u8',
          thumb: 'https://www.alex-berlin.de/files/theme/img/livestream/tvlivestream.jpg',
        },
      },
      ytrecordings,
    },
  );

  // dump source JSONs
  fs.mkdir(dumpFolder, () => {
    fs.writeFileSync(`${dumpFolder}/sessions-source.json`, JSON.stringify(result.sessions, null, '\t'), 'utf8');
    fs.writeFileSync(`${dumpFolder}/speakers-source.json`, JSON.stringify(result.speakers, null, '\t'), 'utf8');
  });
  
  callback(importer.JSON);
}

exports.scrape = (callback) => {
  JSONRequester.get(
    {
      urls: {
        sessions: 'https://18.re-publica.com/files/rest/sessions.json',
        speakers: 'https://18.re-publica.com/files/rest/speakers.json',
      },
    },
    (result) => {
      updateSessionsWithYoutubeVideosByTitle('republica2010')
        .then(ytmap => praseData(result, ytmap, callback))
        .catch(() => praseData(result, {}, callback));
    },
  );
};
