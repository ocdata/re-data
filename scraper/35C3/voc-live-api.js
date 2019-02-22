const request = require('request-promise');

function parseVocStreams(json, slug, mediaType = 'video', streamType = 'hls') {
  const streams = [];
  const conference = json.find(a => a.slug === slug);
  if (conference) {
    conference.groups.forEach((group) => {
      group.rooms.forEach((room) => {
        room.streams.forEach((stream) => {
          // stream.urls.forEach((streamUrl))
          const streamUrl = stream.urls[streamType];
          if (!streamUrl || stream.type !== mediaType) return;
          streams.push({
            roomSlug: room.slug,
            name: room.schedulename,
            thumbUrl: room.thumb,
            streamUrl: streamUrl.url,
            translated: stream.isTranslated,
          });
        });
      });
    });
  }
  return streams;
}

function enclosureFromVocJson(vocJson, mimeType = 'video/mp4') {
  const poster = vocJson.poster_url;
  const streamUrl = vocJson.recordings.find(r => r.mime_type === mimeType && r.filename.indexOf('slides') === -1);
  if (!streamUrl) return null;
  return {
    url: streamUrl.recording_url,
    mimetype: mimeType,
    type: 'recording',
    thumbnail: poster,
  };
}

// streamType can be hls, webm, dash, mp3, opus
// type can be dash, video or audio
async function vocLiveStreams(slug, mediaType = 'video', streamType = 'hls') {
  const options = {
    uri: 'https://streaming.media.ccc.de/streams/v2.json',
    method: 'GET',
    json: true,
  };
  const conferences = await request(options);
  return parseVocStreams(conferences, mediaType, streamType);
}

async function vocVodSessionVideo(url) {
  const options = {
    uri: url,
    method: 'GET',
    json: true,
    timeout: 5000,
  };
  return request(options);
}

async function vocVodSessionVideos(conferenceJson) {
  const { events } = conferenceJson;
  const eventResults = [];
  // eslint-disable-next-line
  for (const event of events) {
    try {
      // eslint-disable-next-line
      const eventResult = await vocVodSessionVideo(event.url);
      eventResults.push(eventResult);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('could not load', event.url, error.message);
    }
  }

  return eventResults;
}

async function addEnclosuresFromVoc(allSession, vocJson) {
  const videos = await vocVodSessionVideos(vocJson);

  const sessions = allSession.map((session) => {
    const video = videos.find(v => v.link === session.url);
    const enclosure = enclosureFromVocJson(video);
    if (!video || !enclosure) return null;
    session.enclosures.push(enclosure);
    return session;
  });
  return sessions;
}

module.exports = {
  vocLiveStreams,
  parseVocStreams,
  addEnclosuresFromVoc,
  vocVodSessionVideos,
  enclosureFromVocJson,
};

// const options = {
//   uri: 'https://api.media.ccc.de/public/conferences/bub2018',
//   method: 'GET',
//   json: true,
// };
// request(options)
//   .then(result => vocVodSessionVideos(result))
//   .then(vocResult => {
//     console.log(vocResult);
//   });