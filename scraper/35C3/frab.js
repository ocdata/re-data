const request = require('request-promise');
const moment = require('moment-timezone');
const { mkSlug, Link } = require('./utlils');
const { allLanguages, allFormats, allLevels } = require('./baseStructures');

function speakerFromJson(speakerJson, eventId, prefix) {
  const biographyParts = [];
  if (speakerJson.abstract && speakerJson.abstract.length > 0) {
    biographyParts.push(speakerJson.abstract);
  }
  if (speakerJson.description && speakerJson.description.length > 0) {
    biographyParts.push(speakerJson.description);
  }

  const links = speakerJson.links.map((link) => {
    const ocLink = new Link(link.url, link.title);
    return ocLink.JSON;
  });
  
  return {
    id: mkSlug(`${eventId}-${prefix}-${speakerJson.id}`),
    event: eventId,
    type: 'speaker',
    name: speakerJson.public_name,
    biography: biographyParts.join('\n\n'),
    links,
    sessions: [],
    photo: undefined,
  };
}

function speakersFromJson(speakersJson, eventId, prefix) {
  const { speakers } = speakersJson.schedule_speakers;
  return speakers.map(s => speakerFromJson(s, eventId, prefix));
}

function locationFromName(name, eventId, prefix) {
  return {
    event: eventId,
    type: 'location',
    id: `${eventId}-${prefix}-${mkSlug(name)}`,
    label_en: name,
    label_de: name,
    is_stage: false,
    floor: 0,
    order_index: 100,
  };
}

function sessionFromFrab(sessionJson, eventId, track, prefix, sessionFunction) {
  const speakers = sessionJson.persons.map((speaker) => {
    return {
      id: `${eventId}-${prefix}-${mkSlug(speaker.id)}`,
      name: speaker.public_name,
    };
  });

  const room = locationFromName(sessionJson.room, eventId, prefix);
  const miniRoom = {
    label_de: room.label_de,
    label_en: room.label_en,
    id: room.id,
  };

  const { date } = sessionJson;

  const beginDate = moment(date);
  const [hours, minutes] = sessionJson.duration.split(':');
  const endDate = moment(beginDate).add(parseInt(hours, 10), 'h').add(parseInt(minutes, 10), 'm');
  const minutesDuration = beginDate.diff(endDate, 'm');
  if (Math.abs(minutesDuration) > 6 * 60) {
    return null;
  }

  const miniTrack = {
    id: track.id,
    label_de: track.label_de,
    label_en: track.label_en,
  };

  let language = allLanguages[sessionJson.language];
  if (!language) language = allLanguages.en;

  let session = {
    id: `${eventId}-${prefix}-${mkSlug(sessionJson.id)}`,
    title: sessionJson.title,
    type: 'session',
    event: eventId,
    subtitle: sessionJson.subtitle,
    abstract: sessionJson.abstract,
    description: sessionJson.description,
    cancelled: false,
    will_be_recorded: sessionJson.do_not_record ? false : undefined,
    track: miniTrack,
    lang: language,
    speakers: speakers.filter(s => s != null && s.name.length > 0),
    enclosures: [],
    links: sessionJson.links.map(l => new Link(l.url, l.title)),
    url: null,
    begin: beginDate.format(),
    end: endDate.format(),
    location: miniRoom,
    level: allLevels.intermediate,
    format: allFormats.talk,
  };
  if (sessionFunction) {
    session = sessionFunction(session, sessionJson);
  }

  return session;
}

function sessionsFromJson(sessionJson, eventId, track, prefix, sessionFunction) {
  const conferenceDays = sessionJson.schedule.conference.days;
  let sessions = [];
  const locations = {};
  conferenceDays.forEach(day => Object.keys(day.rooms).forEach((roomName) => {
    const location = locationFromName(roomName, eventId, prefix);
    locations[location.id] = location;
    const roomContent = day.rooms[roomName];
    const roomSessions = roomContent
      .map(s => sessionFromFrab(s, eventId, track, prefix, sessionFunction));
    sessions = sessions.concat(roomSessions);
  }));
  return { sessions, locations: Object.values(locations) };
}

async function ocdataFromFrab(frabBaseUrl, track, prefix, eventId, roomMapper, sessionFunction) {
  const speakers = request({ uri: `${frabBaseUrl}/speakers.json`, json: true });
  const schedule = request({ uri: `${frabBaseUrl}/schedule.json`, json: true });

  return Promise.all([speakers, schedule])
    .then((result) => {
      const [frabSpeakers, frabSchedule] = result;
      const ocDataSpeakers = speakersFromJson(frabSpeakers, eventId, prefix);
      const { sessions, locations } = sessionsFromJson(frabSchedule, eventId, track, prefix, sessionFunction);
      const filteredSessions = sessions.filter(s => s != null);
      return {
        sessions: filteredSessions,
        speakers: ocDataSpeakers,
        locations,
        tracks: [track],
      };
    });
}

module.exports = ocdataFromFrab;
