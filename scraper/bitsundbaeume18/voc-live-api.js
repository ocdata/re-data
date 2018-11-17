const request = require('request-promise');

function parseVocStreams(json, slug, mediaType = 'video', streamType = 'hls') {
  const streams = [];
  const conference = json.find(a => a.slug === slug);
  if (conference) {
    console.log(conference);
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

vocLiveStreams('bub2018')
  .then((s) => {
    console.log(s);
  });

module.exports = { vocLiveStreams, parseVocStreams };
