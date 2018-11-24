const path = require('path');
const { mkSlug } = require('./utlils');
const { allLanguages, allFormats, allLevels } = require('./baseStructures');
const fs = require('fs-extra');

const EVENT_ID = '35c3';
const HALFNARP_EVENTS_SOURCE_FILE_PATH = path.join(__dirname, 'data_source', 'events-halfnarp.json');
const HALFNARP_CONFIRMED_SOURCE_FILE_PATH = path.join(__dirname, 'data_source', 'halfnarp.json');

function mkId(string) {
  const slug = mkSlug(string);
  return `${EVENT_ID}-${slug}`;
}

function speakersFromHalfnarp(json) {
  // eslint-disable-next-line arrow-body-style
  return json.speakers.map((speaker) => {
    return {
      id: mkId(speaker.id),
      name: speaker.public_name,
    };
  });
}

function levelFromClassifiers(classifiers) {
  if (!classifiers.Foundations) return allLevels.advanced;
  if (classifiers.Foundations > 66) {
    return allLevels.beginner;
  }
  return allLevels.intermediate;
}

// Returns all tracks found in an array of halfnarp events
function tracksFromHalfnarpEvents(events) {
  const tracks = new Map();
  events.forEach((event) => {
    tracks.set(`${event.track_id}`, {
      id: mkId(event.track_id),
      label_de: event.track_name,
      label_en: event.track_name,
    });
  });
  return Array.from(tracks.values());
}

function speakersFromConfirmedEvents(events) {
  const speakers = new Map();
  events.forEach((event) => {
    event.speakers.forEach((speaker) => {
      speakers.set(`${speaker.id}`, {
        name: speaker.full_public_name,
        id: mkId(speaker.id),
        biography: speaker.abstract,
        // eslint-disable-next-line arrow-body-style
        links: speaker.links.map((link) => {
          return {
            url: link.url,
            type: 'speaker-link',
            title: link.title,
            service: 'web',
          };
        }),
      });
    });
  });
  return Array.from(speakers.values());
}

function sessionFromConfirmedEvent(confirmedEvent, halfnarpEvent, sessionFunction) {
  const session = {
    id: mkId(confirmedEvent.id),
    title: confirmedEvent.title,
    subtitle: confirmedEvent.subtitle,
    url: null,
    abstract: confirmedEvent.abstract,
    description: confirmedEvent.description,
    lang: allLanguages[confirmedEvent.language],
    format: allFormats.talk,
    level: levelFromClassifiers(halfnarpEvent.event_classifiers),
    speakers: speakersFromHalfnarp(confirmedEvent),
    track: {
      id: mkId(halfnarpEvent.track_id),
      label_de: halfnarpEvent.track_name,
      label_en: halfnarpEvent.track_name,
    },
    enclosures: [],
    links: [],
    cancelled: false,
    will_be_recorded: !confirmedEvent.do_not_record,
    location: null,
    begin: null,
    end: null,
    duration: null,
    related_sessions: [],
  };
  if (sessionFunction) {
    sessionFunction(session, confirmedEvent, halfnarpEvent);
  }
  return session;
}

// Pass confirmed events (Frab), halfnarp events and an optional
// sessionFunction
function sessionsFromConfirmedAndHalfnarpEvents(
  confirmedEvents,
  halfnarpEvents,
  sessionFunction,
) {
  const sessions = [];
  confirmedEvents.forEach((confirmedEvent) => {
    const halfnarpEvent = halfnarpEvents.find(e => e.event_id === confirmedEvent.id);
    if (!halfnarpEvent) return;

    sessions.push(sessionFromConfirmedEvent(confirmedEvent, halfnarpEvent, sessionFunction));
  });

  return sessions;
}

async function getTracksSpeakersAndSessionsForHalfnarp(confirmedFilePath, eventsFilePath) {
  const confirmedEventsPromise = fs.readJson(confirmedFilePath);
  const eventsPromise = fs.readJson(eventsFilePath);
  
  return Promise.all([confirmedEventsPromise, eventsPromise])
    .then((result) => {
      const [confirmedHalfnarpEvents, eventsDict] = result;
      const confirmedEventIds = confirmedHalfnarpEvents.map(e => e.event_id);
      const { events } = eventsDict;
      const confirmedEvents = events.filter(event => confirmedEventIds.includes(event.id));
  
      const allTracks = tracksFromHalfnarpEvents(confirmedHalfnarpEvents);
      console.log('found', allTracks.length, 'tracks');
      const allSpeakers = speakersFromConfirmedEvents(confirmedEvents);
      console.log('found', allSpeakers.length, 'speakers');
      const allSessions = sessionsFromConfirmedAndHalfnarpEvents(confirmedEvents, confirmedHalfnarpEvents);
      console.log('found', allSessions.length, 'sessions');
      
      return {
        tracks: allTracks,
        speakers: allSpeakers,
        sessions: allSessions,
      };
    });
}

getTracksSpeakersAndSessionsForHalfnarp(
  HALFNARP_CONFIRMED_SOURCE_FILE_PATH,
  HALFNARP_EVENTS_SOURCE_FILE_PATH,
)
  .then((result) => {
    console.log(result);
  })
  // .catch(error => console.error('error', error));
