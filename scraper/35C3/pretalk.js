const request = require('request-promise');
const { mkSlug } = require('./utlils');
const { allLanguages, allFormats, allLevels } = require('./baseStructures');

const PRETALK_BASE_URL = 'https://c3lt.de/api/events/35c3/';

async function allPagesFromPretalk(url, previousResult = []) {
  let result = previousResult;
  let nextPage = url;

  while (nextPage) {
    // eslint-disable-next-line
    let pageResult = await request({ uri: nextPage, json: true }); 
    nextPage = pageResult.next;
    result = result.concat(pageResult.results);
  }
  return result;
}

function pretalkSpeakerToOcSpeaker(pretalkSpeaker, track, eventId) {
  const links = [];
  return {
    id: mkSlug(`${track.id}-${pretalkSpeaker.code}`),
    type: 'speaker',
    event: eventId,
    name: pretalkSpeaker.name,
    biography: pretalkSpeaker.biography,
    links,
    photo: pretalkSpeaker.avatar,
    sessions: [],
  };
}

async function speakersFromPretalk(speakersUrl, track, eventId) {
  const speakers = await allPagesFromPretalk(speakersUrl);
  return speakers.map(speaker => pretalkSpeakerToOcSpeaker(speaker, track, eventId));
}

async function pretalkRoomToOcSpeaker(room, track, eventId, roomMapper) {
  const mappedRoom = roomMapper(room);
  if (mappedRoom) {
    return mappedRoom;
  }

  return {
    id: mkSlug(`${track.id}-${room.id}`),
    type: 'location',
    event: eventId,
    label_en: room.name,
    label_de: room.name,
    is_stage: false,
    floor: 0,
    order_index: room.position,
  };
}

async function locationsFromPretalk(roomsUrl, track, eventId, roomMapper) {
  const rooms = await allPagesFromPretalk(roomsUrl);
  return rooms.map(room => pretalkRoomToOcSpeaker(room, track, eventId, roomIdMapping));
}

function locationFromName(name, track, eventId) {
  return {
    id: mkSlug(`${track.id}-${name.en}`),
    label_en: name.en,
    label_de: name.de,
    is_stage: false,
    floor: 0,
    order_index: 0,
    event: eventId,
  };
}

function locationFromTalk(talk, track, eventId, roomMapper) {
  let room;
  if (talk.slot) {
    if (roomMapper) {
      room = roomMapper(talk.slot.room);
    }
    if (!room) {
      room = locationFromName(talk.slot.room, track, eventId);
    }
  }
  return room;
}

function talksToOcSession(talk, track, eventId, roomMapper, sessionFunction) {
  const speakers = talk.speakers.map((speaker) => {
    return {
      id: mkSlug(`${track.id}-${speaker.code}`),
      name: speaker.name,
    };
  });

  const { start, end } = talk.slot;

  const room = locationFromTalk(talk, track, eventId, roomMapper);
   
  delete room.is_stage;
  delete room.floor;
  delete room.order_index;
  delete room.event;

  let session = {
    event: eventId,
    type: 'session',
    id: mkSlug(`${track.id}-${talk.code}`),
    title: talk.title,
    subtitle: null,
    abstract: talk.abstract,
    description: talk.description,
    cancelled: false,
    will_be_recorded: talk.do_not_record ? false : undefined,
    track,
    lang: allLanguages[talk.content_locale],
    speakers,
    enclosures: [],
    links: [],
    url: null,
    begin: start,
    end,
    location: room,
    level: allLevels.intermediate,
    format: allFormats.talk,
  };
  if (sessionFunction) {
    session = sessionFunction(session, talk);
  }
  return session;
}

async function sessionsFromPretalk(scheduleUrl, track, eventId, roomMapper, sessionFunction) {
  const talks = await allPagesFromPretalk(scheduleUrl);
  const sessions = talks.map(talk => talksToOcSession(talk, track, eventId, roomMapper, sessionFunction));
  const locations = talks.map(talk => locationFromTalk(talk, track, eventId, roomMapper));
  return { sessions, locations };
}

async function ocdataFromPretalk(pretalkBaseUrl, track, eventId, roomMapper, sessionFunction) {
  const { sessions, locations } = await sessionsFromPretalk(`${pretalkBaseUrl}/talks`, track, eventId, roomMapper, sessionFunction);
  const speakers = await speakersFromPretalk(`${pretalkBaseUrl}/speakers`, track, eventId);
  
  // const locations = await locationsFromPretalk(`${pretalkBaseUrl}/rooms/`, track, eventId, roomMapper);
  // const tracks = await tracksFromPretalk(`${pretalkBaseUrl}/track`);
  return {
    speakers,
    sessions,
    tracks: [track],
    locations,
  };
}

// scheduleFromPretalk(SCHEDULE_URL)
// ocdataFromPretalk(PRETALK_BASE_URL, 'lightning', '35c3', pt => pt)
//   .then(result => console.log(result))
//   .catch(error => console.error(error));

module.exports = ocdataFromPretalk;
