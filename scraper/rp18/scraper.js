const path = require('path');
const fs = require('fs');
const request = require('request');
const RpNewImporter = require('./../lib/rp_new/rp_new_importer');
const events = require('./../config/events');
const JSONRequester = require('../lib/json_requester');
const trackColors = require('./track_colors');
const cheerio = require('cheerio');
const youTubeLinks = require('../lib/youtube');

const EVENT_ID = 'rp18';
const dumpFolder = `${path.resolve(__dirname, '../../web/data/')}/${EVENT_ID}/`;

const event = events.find(eventJson => eventJson.id === EVENT_ID);
if (!event) throw new Error(`Could not find event ${EVENT_ID}`);


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
          url: 'https://www.youtube.com/v/F_ACezLru_U',
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
      
      const rpvideosPop = youTubeLinks('https://www.youtube.com/watch?v=Rl9JX5jmY0M&list=PLAR_6-tD7IZWKEZImhoGQEsNZmBgFpfle');
      const rpvideosCancelAppocalypse = youTubeLinks('https://www.youtube.com/watch?v=oUExsJ1XavE&list=PLAR_6-tD7IZXmGQsMyPe01D0BygzBvivq');
      const rpvideosFemaleFootprint = youTubeLinks('https://www.youtube.com/watch?v=BC8IznMVGs4&list=PLAR_6-tD7IZUsRa06XaiuvCRa6PusSa34');
      const rpvideosFintech = youTubeLinks('https://www.youtube.com/watch?v=zlmgR0e-nAQ&list=PLAR_6-tD7IZWSEMVR5-qTiBpZ3eTK4lBc');
      const rpvideosImmersive = youTubeLinks('https://www.youtube.com/watch?v=EYzKOjyV-h4&list=PLAR_6-tD7IZXOdP1rfCdH89hgfd3YoPHq');
      const rpvideosLawlabs = youTubeLinks('https://www.youtube.com/watch?v=Aku0Bo5wcVo&list=PLAR_6-tD7IZVKYvtjgKmOxBkl9oexroXN');
      const rpvideosMusic = youTubeLinks('https://www.youtube.com/watch?v=6ywZQ8QlmQY&list=PLAR_6-tD7IZUowDKMFWR8jS7_EYtDS3jn');
      const rpvideosRehealth = youTubeLinks('https://www.youtube.com/watch?v=wcSRCPpnt34&list=PLAR_6-tD7IZU24HcE0NV1ZWo3tv6WdpDd');
      const rpvideosRelearn = youTubeLinks('https://www.youtube.com/watch?v=WtWMVyn2K4I&list=PLAR_6-tD7IZWuWKuWg9VxyqHhge9ikk5N');
      const rpvideosSmartCities = youTubeLinks('https://www.youtube.com/watch?v=4tvRgDtzBak&list=PLAR_6-tD7IZXdGQ3F9872k-RRL_JwthcT');

      const mcbvideos = youTubeLinks(
        'https://www.youtube.com/playlist?list=PLQOns7rQTDGN7hkQfBfMFFT8Z5m_Bs81z',
        null,
        ' | Media Convention 2018',
      );

      Promise.all([
        rpvideosPop,
        rpvideosCancelAppocalypse,
        rpvideosFemaleFootprint,
        rpvideosFintech,
        rpvideosImmersive,
        rpvideosLawlabs,
        rpvideosMusic,
        rpvideosRehealth,
        rpvideosRelearn,
        rpvideosSmartCities,
        mcbvideos,
      ])
        .then((videos) => {
          const ytmap = {};

          videos.forEach((res) => {
            Object.entries(res).forEach(([k, v]) => { ytmap[k] = v; });
          });
          
          praseData(result, ytmap, callback);
        })
        .catch(() => praseData(result, {}, callback));
    },
  );
};
