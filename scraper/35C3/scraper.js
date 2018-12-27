const fs = require('fs');
const path = require('path');
const ent = require('ent');
const sanitizeHtml = require('sanitize-html');
const icalendar = require('icalendar');
const request = require('request-promise');
const moment = require('moment-timezone');
const {
  toArray,
  mkSlug,
  clone,
  frabImageUrl,
  Link,
} = require('./utlils');
const halfnarpLoader = require('./halfnarp-schedule');
const colors = require('./colors');
const importPretalk = require('./pretalk');
const importFrab = require('./frab');

const log = require('../../api/lib/log.js');
const {
  parseVocStreams,
  vocVodSessionVideos,
  enclosureFromVocJson,
} = require('./voc-live-api');
const { allLanguages, allFormats, allLevels } = require('./baseStructures');

const EVENT_ID = '35c3';
const SCHEDULE_URL = 'https://fahrplan.events.ccc.de/congress/2018/Fahrplan/schedule.json';
const SPEAKERS_URL = 'https://fahrplan.events.ccc.de/congress/2018/Fahrplan/speakers.json';

const HALFNARP_ENABLED = false;
const HALFNARP_EVENTS_SOURCE_FILE_PATH = path.join(
  __dirname,
  'data_source',
  'events-halfnarp.json',
);
const HALFNARP_CONFIRMED_SOURCE_FILE_PATH = path.join(
  __dirname,
  'data_source',
  'halfnarp.json',
);

const VOC_EVENT_ID = '35c3';
const VOC_LIVE_API_URL = 'https://streaming.media.ccc.de/streams/v2.json?forceopen=yes';
const VOC_VOD_CONFERENCE_API_URL = `https://api.media.ccc.de/public/conferences/${VOC_EVENT_ID}`;

// for debugging we can just pretend rp14 was today
const originalStartDate = new Date(Date.UTC(2015, 11, 27, 10, 0, 0, 0));
const fakeDate = originalStartDate; // new Date(Date.UTC(2015, 11, 23, 16, 0, 0, 0));
const sessionStartDateOffsetMilliSecs =
  fakeDate.getTime() - originalStartDate.getTime();

const dayYearChange = 0;
const dayMonthChange = 0;
const dayDayChange = 0;

function mkID(string) {
  return `${EVENT_ID}-${mkSlug(string)}`;
}

const sortOrderOfLocations = [
  mkID('Adams'),
  mkID('Borg'),
  mkID('Clarke'),
  mkID('Dijkstra'),
  mkID('Eliza'),
  '35c3-lineup-discodrama',
  '35c3-lineup-shutter-island',
  '35c3-lineup-compeiler',
  '35c3-lineup-uptime-bar',
  '35c3-chaoswest-chaos-west-stage',
  '35c3-chaoszone-chaoszone-stage-35c3',
  '35c3-sendezentrum-b-hne',
  '35c3-sendezentrum-sendetisch',
  '35c3-wikipaka-wikipakawg-esszimmer',
  '35c3-wikipaka-wikipakawg-k-che',
  '35c3-komona-dome-1-talks',
  '35c3-komona-dome-3-workshops-talks',
  '35c3-komona-dome-4-workshops-handson',
  '35c3-open-infrastructure-oio-lecture-arena',
  '35c3-open-infrastructure-oio-presentation-desk-1',
  '35c3-open-infrastructure-oio-presentation-desk-2',
  '35c3-open-infrastructure-oio-presentation-desk-3',
  '35c3-open-infrastructure-oio-presentation-desk-4',
  '35c3-open-infrastructure-oio-presentation-desk-6',
  '35c3-open-infrastructure-oio-solder-area',
  '35c3-open-infrastructure-oio-workshop-domo',
];

// to map VOC API output to our rooms
const vocSlugToLocatonID = {
  halla: '35c3-adams',
  hallb: '35c3-borg',
  hallc: '35c3-clarke',
  halld: '35c3-dijkstra',
  halle: '35c3-eliza',
  oio: '35c3-open-infrastructure-oio-lecture-arena',
  wikipakawg: '35c3-wikipaka-wikipakawg-esszimmer',
  chaoswest: '35c3-chaoswest-chaos-west-stage',
};


const locationNameChanges = {};

const additionalLocations = [];

const additionalLinks = {};

const additionalEnclosures = {
  '34c3-workshop-e7d29e30-123b-4840-a2fc-e6674ad6c455': {
    url: 'https://ccc.cdn.as250.net/34c3/Markus_Drenger_beA.mp4',
    mimetype: 'video/mp4',
    type: 'recording',
    thumbnail: 'https://img.youtube.com/vi/Od5WAah-ktk/hqdefault.jpg',
  },
};

// Livestream test
const streamURLs = {};

const testVideoURLs = {
  // '35c3-9985': 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
};

const trackColors = {};
trackColors[mkID('Security')] = colors.darkBlue; // security
trackColors[mkID('Ethics, Society & Politics')] = colors.red; // ethics-society-politics
trackColors[mkID('Science')] = colors.green; // science
trackColors[mkID('Hardware & Making')] = colors.violett; // hardware-making
trackColors[mkID('Art & Culture')] = colors.yellow; // art-culture
trackColors[mkID('Resilience')] = colors.blue;
// trackColors[eventId + "-failosophy"] = yellow;
trackColors[mkID('CCC')] = colors.turquise; // ccc
trackColors[mkID('Entertainment')] = colors.turquise; // entertainment
// trackColors[eventId + "-self-organized-sessions"] = grey;
// trackColors[eventId + "-podcast"] = red;
// trackColors[eventId + "-sendezentrum"] = red;
trackColors.other = colors.grey;

const allMaps = {};
const data = [];
const allDays = {};
const allRooms = {};
const allSpeakers = {};
const allTracks = {};

function addEntry(type, obj) {
  const object = obj;
  object.event = EVENT_ID;
  object.type = type;
  data.push(object);
}

function alsoAdd(type, list) {
  Object.keys(list).forEach((key) => {
    const obj = clone(list[key]);
    obj.event = EVENT_ID;
    obj.type = type;
    data.push(obj);
  });
}

function parseDay(dayXML) {
  const { date } = dayXML;
  // console.log('parsing: ', dayXML);

  const dayDate = new Date(date);
  dayDate.setUTCFullYear(dayDate.getUTCFullYear() + dayYearChange);
  dayDate.setUTCMonth(dayDate.getUTCMonth() + dayMonthChange);
  dayDate.setUTCDate(dayDate.getUTCDate() + dayDayChange);

  let dateLabelDe = date;
  let dateLabelEn = date;

  let index = 0;
  const monthDay = dayDate.getUTCDate();
  switch (monthDay) {
    case 27:
      index = 1;
      dateLabelDe = 'Tag 1';
      dateLabelEn = 'Day 1';
      break;
    case 28:
      index = 2;
      dateLabelDe = 'Tag 2';
      dateLabelEn = 'Day 2';
      break;
    case 29:
      index = 3;
      dateLabelDe = 'Tag 3';
      dateLabelEn = 'Day 3';
      break;
    case 30:
      index = 4;
      dateLabelDe = 'Tag 4';
      dateLabelEn = 'Day 4';
      break;
    default:
      return null;
  }

  const id = mkID(index);

  return {
    id,
    event: EVENT_ID,
    type: 'day',
    label_en: dateLabelEn,
    label_de: dateLabelDe,
    date,
  };
}

function parseSpeaker(speakerJSON, imageURLPrefix) {
  let bio = '';
  if (speakerJSON.abstract) {
    bio = speakerJSON.abstract;
  }
  if (speakerJSON.description) {
    bio = `${bio} \n\n${speakerJSON.description}`;
  }

  const links = [];

  if (speakerJSON.links) {
    speakerJSON.links.forEach((link) => {
      let { url } = link;
      if (url.indexOf('http') === -1) {
        url = `http://${url}`;
      }
      
      links.push((new Link(url, 'speaker-link', link.title)).JSON);
    });
  }

  const result = {
    id: mkID(speakerJSON.id),
    type: 'speaker',
    event: EVENT_ID,
    name: speakerJSON.full_public_name,
    biography: bio,
    links,
    sessions: [],
  };

  // de-htmlize
  // console.log(bio);
  // $ = cheerio.load(bio);
  result.biography = sanitizeHtml(bio, { allowedTags: [] });

  // sys.puts(sys.inspect(handler.dom, false, null));

  const imageHost = imageURLPrefix;
  if (speakerJSON.photo) {
    result.photo = speakerJSON.photo;
  }
  if (speakerJSON.image) {
    let imagePath = speakerJSON.image;
    imagePath = imagePath.replace(/\/medium\//, '/large/');
    imagePath = imagePath.replace(/\/original\//, '/large/');
    result.photo = imageHost + imagePath;
  }
  return result;
}

function parseRoom(roomName, index, namePrefix) {
  let finalRoomName = roomName;
  if (namePrefix != null) {
    finalRoomName = namePrefix + roomName;
  }

  const id = mkID(finalRoomName);

  // change some names
  const newName = locationNameChanges[id];
  if (newName) {
    finalRoomName = newName;
  }

  return {
    id,
    label_en: finalRoomName,
    label_de: finalRoomName,
    is_stage: roomName.toString().match(/Stage/i) != null,
    floor: 0,
    order_index: index,
    event: EVENT_ID,
    type: 'location',
  };
}

function generateIcalData(allSessions) {
  const ical = new icalendar.iCalendar();

  allSessions.forEach((session) => {
    const event = new icalendar.VEvent(session.id);
    event.TZID = 'Europe/Berlin';
    let summary = session.title;
    if (session.subtitle) {
      summary = `${summary} – ${session.subtitle}`;
    }
    event.setSummary(summary);

    let description = '';
    if (session.abstract && session.description) {
      description = `${session.abstract}\n\n${session.description}`;
    } else if (session.abstract) {
      description = session.abstract;
    } else if (session.description) {
      // eslint-disable-next-line prefer-destructuring
      description = session.description;
    }
    event.setDescription(description);

    if (session.location) {
      event.setLocation(session.location.label_en);
    }
    event.setDate(session.begin, session.end);

    ical.addComponent(event);
  });

  let filepath = path.join(
    __dirname,
    '/../../web/data/',
    EVENT_ID,
    '/sessions.ics',
  );
  filepath = path.normalize(filepath);
  fs.writeFile(filepath, ical.toString(), () => {});
}

function parseDate(dateString) {
  const date = new Date(dateString);
  const newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
  date.setTime(newMillis);

  return date;
}

function parseEnd(dateString, durationString) {
  const dayChange = 4;
  const eventDate = new Date(dateString);
  const time = eventDate.getTime() / 1000;
  const match = durationString.toString().match(/(\d?\d):(\d\d)/);
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = time + minutes * 60.0 + hours * 60.0 * 60.0;
  const date = new Date(seconds * 1000);
  const newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
  date.setTime(newMillis);

  if (date.getTime() <= eventDate.getTime()) {
    date.setTime(eventDate.getTime() + 1000 * 3600);
  }

  // if the event starts on day 1 but ends on day 2 after day change,
  // cap it to day change
  if (
    eventDate.getUTCDate() < date.getUTCDate() &&
    date.getUTCHours() > dayChange
  ) {
    date.setUTCHours(dayChange - 1);
    date.setUTCDate(eventDate.getUTCDate() + 1);
  }

  // if the event starts before day change but ends after, normalize it's end
  // to day change
  if (eventDate.getUTCHours() <= dayChange && date.getUTCHours() > dayChange) {
    date.setUTCHours(dayChange - 1);
  }

  return date;
}

function parseTrackFromEvent(eventXML, defaultTrack) {
  let trackName = eventXML.track;
  // id is done without decoding ent
  const id = mkID(trackName);
  trackName = ent.decode(trackName);
  // if no track name is given we just return the default
  if (trackName == null) {
    return defaultTrack;
  }
  // console.log(trackName);

  let color = trackColors[id];
  if (!color) {
    color = colors.grey;
  }

  return {
    id,
    color,
    label_en: trackName,
    label_de: trackName,
  };
}

function normalizeXMLDayDateKey(date, begin) {
  const theDate = new Date(date);
  theDate.setUTCFullYear(theDate.getUTCFullYear() + dayYearChange);
  theDate.setUTCMonth(theDate.getUTCMonth() + dayMonthChange);
  theDate.setUTCDate(theDate.getUTCDate() + dayDayChange);

  return `${theDate.getUTCFullYear()}-${theDate.getUTCMonth() +
    1}-${theDate.getUTCDate()}`;
}

function parseEvent(
  event,
  eventDay,
  room,
  locationNamePrefix,
  trackJSON,
  enclosureFunction = () => [],
  idPrefix,
  linkMakerFunction,
  idFieldValue
) {
  const links = [];
  let idField = idFieldValue;
  if (idField == null) {
    idField = 'id';
  }
  let id = mkID(event[idField]);
  if (typeof idPrefix === 'string') {
    id = mkID(event[idField], idPrefix);
  }
  let linkFunction = linkMakerFunction;
  if (linkFunction == null) {
    linkFunction = () => {
      if (!event[idField]) {
        return 'https://fahrplan.events.ccc.de/congress/2018/Fahrplan/';
      }
      return `https://fahrplan.events.ccc.de/congress/2018/Fahrplan/events/${event[idField]}.html`;
    };
  }

  event.links.forEach((link) => {
    let url = null;
    let title = null;
    if (typeof link === 'string') {
      url = link;
      title = link;
    } else if (typeof link === 'object' && link.title && link.url) {
      // eslint-disable-next-line prefer-destructuring
      title = link.title;
      // eslint-disable-next-line prefer-destructuring
      url = link.url;
    }
    if (typeof url === 'string' && url.indexOf('//') === 0) {
      url = `http:${url}`;
    }
    if (
      typeof url === 'string' &&
      !(url.indexOf('http://') === 0) &&
      !(url.indexOf('https://') === 0)
    ) {
      url = `http://${url}`;
    }

    links.push((new Link(url, 'session-link', title)).JSON);
  });

  const link = additionalLinks[id];
  if (link) {
    links.push(link);
  }

  const begin = parseDate(event.date);

  // Make sure day change is at 5 in the morning

  const time = new Date(2018, 11, 27);
  if (begin.getTime() < time.getTime()) {
    log.error('No valid begin: ', begin);
    return null;
  }

  const dayKey = normalizeXMLDayDateKey(eventDay.date, begin);
  const eventTypeId = event.type.toString();
  let format = allFormats.talk;
  if (eventTypeId === 'lecture') {
    format = allFormats.talk;
  } else if (eventTypeId === 'other') {
    format = allFormats.talk;
  } else if (eventTypeId === 'meeting') {
    format = allFormats.workshop;
  } else if (eventTypeId === 'performance') {
    format = allFormats.workshop;
  } else if (eventTypeId === 'film') {
    format = allFormats.talk;
  } else if (eventTypeId === 'podium') {
    format = allFormats.discussion;
  } else {
    log.error('unknown event type', eventTypeId);
  }

  const day = allDays[dayKey];

  if (!day) {
    log.info('No valid day for', event.title.toString(), dayKey);
    return null;
  }

  let { track } = event;
  if (track == null) track = 'Other';

  let abstract = sanitizeHtml(event.abstract.toString(), { allowedTags: [] });
  abstract = ent.decode(abstract);

  let description = sanitizeHtml(event.description.toString(), {
    allowedTags: [],
  });
  description = ent.decode(description);

  const session = {
    id, // Do not use GUID so we keep in line with Halfnarp IDs
    title: event.title.toString(),
    abstract,
    description,
    begin,
    end: parseEnd(event.date, event.duration),
    track: {
      id: trackJSON.id,
      label_de: trackJSON.label_de,
      label_en: trackJSON.label_en,
    },
    day,
    format,
    level: allLevels.advanced,
    lang:
      allLanguages[
        event.language.toString() != null ? event.language.toString() : 'en'
      ],
    speakers: [], // fill me later
    enclosures: [], // fill me later
    links,
  };

  if (
    session.title.match(/\bcancelled\b/i) ||
    session.title.match(/\babgesagt\b/i)
  ) {
    session.cancelled = true;
  } else {
    session.cancelled = false;
  }

  if (allRooms[room.id] && allRooms[room.id].id !== mkID('')) {
    session.location = {
      id: allRooms[room.id].id,
      label_de: allRooms[room.id].label_de,
      label_en: allRooms[room.id].label_en,
    };

    const locationId = session.location.id;
    let willBeRecorded;
    if (event.do_not_record) {
      willBeRecorded = false;
    } else if (toArray(vocSlugToLocatonID).indexOf(locationId) !== -1) {
      willBeRecorded = true;
    }

    session.will_be_recorded = willBeRecorded;
  }

  if (!session.format) {
    log.warn('Session ', session.id, ' (', session.title, ') has no format');
    session.format = allFormats.talk;
  }

  if (!session.lang) {
    session.lang = allLanguages.en;
  }

  if (event.subtitle.toString() !== '') {
    session.subtitle = event.subtitle.toString();
  }

  // HACK: Fake one video for App Review
  const testVideoURL = testVideoURLs[session.id];
  if (testVideoURL) {
    session.enclosures.push({
      url: testVideoURL,
      mimetype: 'video/mp4',
      type: 'recording',
      thumbnail:
        'https://static.media.ccc.de/media/conferences/rustfest/2018-2/5-hd_preview.jpg',
    });
  }

  const additionalEnclosure = additionalEnclosures[session.id];
  if (additionalEnclosure) {
    session.enclosures.push(additionalEnclosure);
  }

  if (session.location) {
    const streamURL = streamURLs[session.location.id];
    if (streamURL) {
      session.enclosures.push({
        url: streamURL,
        mimetype: 'video/mp4',
        type: 'livestream',
      });
    }
  }

  session.url = linkFunction(session, event);

  if (enclosureFunction) {
    const enclosures = enclosureFunction(session);
    if (Array.isArray(enclosures)) {
      enclosures.forEach(enclosure => session.enclosures.push(enclosure));
    }
  }

  return session;
}

function handleResult(
  events,
  resultSpeakers,
  eventRecordings,
  locationNamePrefix,
  defaultTrack,
  speakerImageURLPrefix,
  enclosureFunction,
  idPrefix,
  linkMakerFunction,
  idField,
  sessonValidatorFunction,
) {
  let speakers = resultSpeakers;
  if (!speakers) {
    speakers = [];
  }
  speakers.forEach((speaker) => {
    const speakerJSON = parseSpeaker(speaker, speakerImageURLPrefix);

    if (allSpeakers[speakerJSON.id]) {
      const theSpeker = allSpeakers[speakerJSON.id];
      ['biography', 'photo'].forEach((item) => {
        // if the old thing has be
        if (
          theSpeker[item] &&
          speakerJSON[item] &&
          theSpeker[item].length > speakerJSON[item].length
        ) {
          speakerJSON[item] = theSpeker[item];
        } else {
          theSpeker[item] = speakerJSON[item];
        }
      });
    }

    allSpeakers[speakerJSON.id] = speakerJSON;
  });

  events.schedule.conference.days.forEach((confDay) => {
    // Day
    // ---
    const dayJSON = parseDay(confDay);
    if (dayJSON) {
      const key = normalizeXMLDayDateKey(dayJSON.date);
      allDays[key] = dayJSON;
    }
  });
  events.schedule.conference.days.forEach((conferenceDay) => {
    let roomIndex = 0;
    const { rooms } = conferenceDay;
    Object.keys(rooms).forEach((roomLabel) => {
      // Room
      // ----
      const roomJSON = parseRoom(roomLabel, roomIndex, locationNamePrefix);
      allRooms[roomJSON.id] = roomJSON;
      roomIndex += 1;

      additionalLocations.forEach((locationJSON) => {
        allRooms[locationJSON.id] = locationJSON;
      });

      const eventsFromRoom = rooms[roomLabel];
      eventsFromRoom.forEach((event) => {
        // Track
        // -----
        const trackJSON = parseTrackFromEvent(event, defaultTrack);
        if (parseTrackFromEvent.id === trackJSON.id) {
          log.warn(`!!!! DEFAULT TRACK FOR ${event.title}`);
        }
        allTracks[trackJSON.id] = trackJSON;
        // Event
        // -----
        const eventJSON = parseEvent(
          event,
          conferenceDay,
          roomJSON,
          locationNamePrefix,
          trackJSON,
          enclosureFunction,
          idPrefix,
          (session, sourceJSON) =>
            `https://fahrplan.events.ccc.de/congress/2018/Fahrplan/events/${sourceJSON.id}.html`,
          idField,
        );
        // if event could not be parse skip it
        if (eventJSON == null) return;

        // Event Speakers
        // --------------
        event.persons.forEach((person) => {
          const publicName = person.public_name;
          if (!publicName) return;

          const personID = mkID(person.id);
          const speaker = allSpeakers[personID];

          if (speaker) {
            speaker.sessions.push({
              id: eventJSON.id,
              title: eventJSON.title,
            });

            const personJson = {
              id: personID,
              name: speaker.name,
            };
            eventJSON.speakers.push(personJson);
          }
        });

        // Videos
        // ------
        let recordingJSON = null;

        eventRecordings.forEach((element) => {
          if (eventJSON && element && eventJSON.title == element.title) {
            recordingJSON = element;
          }
        });
        if (recordingJSON && recordingJSON.recording) {
          eventJSON.enclosures.push({
            url: recordingJSON.recording.recording_url,
            mimetype: 'video/mp4',
            type: 'recording',
            thumbnail: recordingJSON.thumb,
          });
        }

        if (eventJSON != null) {
          if (sessonValidatorFunction && sessonValidatorFunction(eventJSON)) {
            addEntry('session', eventJSON);
          } else if (!sessonValidatorFunction) {
            addEntry('session', eventJSON);
          }
        }
      });
    });
  });
}

exports.scrape = (callback) => {
  console.log('scrape');

  const results = async () => {
    // Main Events
    let speakers = null;
    let schedule = null;
    
    try {
      log.info('Importing Fahrplan data');
      // eslint-disable-next-line
      schedule = await request({ uri: SCHEDULE_URL, json: true });

      const speakersResult = await request({ uri: SPEAKERS_URL, json: true });
      // eslint-disable-next-line
      speakers = speakersResult.schedule_speakers.speakers;
    } catch (error) {
      log.error('Could not load frab data:', error);
    }
    
    // Halfnarp
    let halfnarp = null;
    if (HALFNARP_ENABLED) {
      log.info('Importing Halfnarp data');
      halfnarp = await halfnarpLoader(
        HALFNARP_CONFIRMED_SOURCE_FILE_PATH,
        HALFNARP_EVENTS_SOURCE_FILE_PATH,
        null,
        (speaker, source) => {
          if (source.image) {
            // eslint-disable-next-line no-param-reassign
            speaker.photo = `https://frab.cccv.de${frabImageUrl(source.image)}`;
          }
        },
      );
    }

    // VOC Live
    const vocLiveStreams = await request({ uri: VOC_LIVE_API_URL, json: true, timeout: 5000 });
    let liveStreams = [];
    if (vocLiveStreams) {
      liveStreams = parseVocStreams(vocLiveStreams, VOC_EVENT_ID);
    }

    // VOC VOD
    const vocVodConference = null;

    const defaultTrack = {
      id: mkID('other'),
      color: [97.0, 97.0, 97.0, 1.0], // grey
      label_de: 'Other',
      label_en: 'Other',
    };

    // Import Halfnarp
    if (halfnarp) {
      halfnarp.tracks.forEach((_track) => {
        const track = _track;
        let trackColor = trackColors[track.id];
        if (!trackColor) trackColor = trackColors.other;
        track.color = trackColor;
        addEntry('track', track);
      });
      halfnarp.speakers.forEach(speaker => addEntry('speaker', speaker));
      halfnarp.sessions.forEach(session => addEntry('session', session));
    }
    // VOD Handling for Frap
    let vodJsons;
    try {
      if (vocVodConference) {
        vodJsons = await vocVodSessionVideos(vocVodConference);
      }
    } catch (error) {
      log.error('Could not fetch voc jsons', error);
    }
    if (!vodJsons) vodJsons = {};

    // Generates enclosures from a parse session
    const enclosureFunction = (session) => {
      const enclosures = [];

      // find live streams
      const streamInfo = liveStreams.find((stream) => {
        const locationId = vocSlugToLocatonID[stream.roomSlug];
        return session.location.id === locationId;
      });
      if (streamInfo) {
        const livestream = {
          url: streamInfo.streamUrl,
          mimetype: 'video/mp4',
          type: 'livestream',
        };
        enclosures.push(livestream);
      }

      // find recording for this session
      if (Array.isArray(vodJsons)) {
        const vodJson = vodJsons.find(vocVideo => vocVideo.link === session.url);
        if (vodJson) {
          const enclosure = enclosureFromVocJson(vodJson);
          if (enclosure) {
            enclosures.push(enclosure);
          }
        }
      }
      return enclosures;
    };

    const INVALID_SESSION_NAMES = ['Pause', 'Mittagessen', 'Abendessen'];

    if (schedule && speakers) {
      // Frab
      handleResult(
        schedule,
        speakers,
        [],
        '',
        defaultTrack,
        'https://fahrplan.events.ccc.de/congress/2018/Fahrplan',
        enclosureFunction,
        null,
        null,
        null,
        session => !INVALID_SESSION_NAMES.includes(session.title),
      );
    }

    
    const dayKeyAndBeginEndTimeFromBeginDateString = (beginDateString) => {
      const beginDate = moment(beginDateString);
      let day;
      if (beginDate.hour() < 9) {
        day = beginDate.date() - 1;
      } else {
        day = beginDate.date();
      }
      const dayString = day < 10 ? `0${day}` : `${day}`;
      const dayKey = `${beginDate.format('YYYY-MM-')}${dayString}`;
      return { dayKey };
    };

    const loadingPromises = [];

    // Lounge
    log.info('Importing Lounge data');
    const LOUNGE_BASE_URL = 'https://fahrplan.events.ccc.de/congress/2018/Lineup';
    const LOUNGE_SHARE_PREFIX = 'https://fahrplan.events.ccc.de/congress/2018/Lineup/events/';
    const LOUNGE_PREFIX = 'lineup';
    const LOUNGE_TRACK = {
      id: '35c3-lineup',
      label_de: 'Lineup',
      label_en: 'Lineup',
      color: [173, 173, 173, 1],
    };
    const loungePromise = importFrab(
      LOUNGE_BASE_URL,
      LOUNGE_TRACK,
      LOUNGE_PREFIX,
      EVENT_ID,
      null,
      (session, talk) => {
        if (INVALID_SESSION_NAMES.find(name => session.title.match(new RegExp(name)))) {
          return null;
        }
        const mutableSession = session;
        mutableSession.url = `${LOUNGE_SHARE_PREFIX}/${talk.id}.html`;
        
        if (session.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }
        return mutableSession;
      },
    );
    loadingPromises.push(loungePromise);

    // Chaos West
    log.info('Importing Chaos West data');
    const CHAOSWEST_PRETALK_API = 'https://fahrplan.chaos-west.de/api/events/35c3chaoswest';
    const CHAOSWEST_PRETALK_SHARE = 'https://fahrplan.chaos-west.de/35c3chaoswest/talk';
    const CHAOSWEST_TRACK = {
      id: mkID('chaoswest'),
      label_de: 'Chaos West',
      label_en: 'Chaos West',
      color: [63.0, 164.0, 125.0, 1.0],
    };
    
    const chaosWestPromise = importPretalk(
      CHAOSWEST_PRETALK_API,
      CHAOSWEST_TRACK,
      EVENT_ID,
      null,
      (session, talk) => {
        if (INVALID_SESSION_NAMES.find(name => session.title.match(new RegExp(name)))) {
          return null;
        }
        const mutableSession = session;
        mutableSession.url = `${CHAOSWEST_PRETALK_SHARE}/${talk.code}/`;
        
        if (session.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }

        const liveStream = liveStreams.find(stream => session.location.id === vocSlugToLocatonID[stream.roomSlug]);
        if (liveStream) {
          const enclosure = {
            url: liveStream.streamUrl,
            mimetype: 'video/mp4',
            type: 'livestream',
          };
          mutableSession.enclosures.push(enclosure);
        }
        return mutableSession;
      },
    );
    loadingPromises.push(chaosWestPromise);
    
    // Freifunk
    log.info('Importing Freifunk data');
    const OPEN_INFRA_PRETALK_API = 'https://pretalx.35c3oio.freifunk.space/api/events/35c3oio';
    const OPEN_INFRA_PRETALK_SHARE = 'https://pretalx.35c3oio.freifunk.space/35c3oio/talk';
    const OPEN_INFRA_TRACK = {
      id: mkID('Open Infrastructure'),
      label_de: 'Open Infrastructure',
      label_en: 'Open Infrastructure',
      color: [218.0, 16.0, 104.0, 1.0],
    };

    const openInfraPromise = importPretalk(
      OPEN_INFRA_PRETALK_API,
      OPEN_INFRA_TRACK,
      EVENT_ID,
      null,
      (session, talk) => {
        if (INVALID_SESSION_NAMES.find(name => session.title.match(new RegExp(name)))) {
          return null;
        }
        if (session.location.label_de.match(/(Thementisch|presentation desk)/i)) {
          return null;
        }
        const mutableSession = session;
        mutableSession.url = `${OPEN_INFRA_PRETALK_SHARE}/${talk.code}/`;
        
        if (mutableSession.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }
        const liveStream = liveStreams.find(stream => session.location.id === vocSlugToLocatonID[stream.roomSlug]);
        if (liveStream) {
          const enclosure = {
            url: liveStream.streamUrl,
            mimetype: 'video/mp4',
            type: 'livestream',
          };
          mutableSession.enclosures.push(enclosure);
        }
        return mutableSession;
      },
    );
    loadingPromises.push(openInfraPromise);

    // Sendezentrum
    log.info('Importing Sendezentrum data');
    const SENDEZENTRUM_PRETALK_API = 'https://35c3.studio-link.de/api/events/35c3';
    const SENDEZENTRUM_PRETALK_SHARE = 'https://35c3.studio-link.de/35c3/talk';
    const SENDEZENTRUM_TRACK = {
      id: mkID('Sendezentrum'),
      label_de: 'Sendezentrum',
      label_en: 'Sendezentrum',
      color: [159.0, 75.0, 208.0, 1.0],
    };

    // MP3 stream urls added to sendezentrum
    const SENDEZENTRUM_STREAM_URLS = {
      '35c3-sendezentrum-b-hne': 'https://stream-master.studio-link.de/35c3buehne.mp3',
      '35c3-sendezentrum-sendetisch': 'https://stream-master.studio-link.de/35c3sendetisch.mp3',
    };


    const sendezentrumPromise = importPretalk(
      SENDEZENTRUM_PRETALK_API,
      SENDEZENTRUM_TRACK,
      EVENT_ID,
      null,
      (session, talk) => {
        const mutableSession = session;
        mutableSession.url = `${SENDEZENTRUM_PRETALK_SHARE}/${talk.code}/`;
        
        if (mutableSession.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }

        // Sendezentrum audio only streams
        const mp3StreamUrl = SENDEZENTRUM_STREAM_URLS[session.location.id];
        if (mp3StreamUrl) {
          const enclosure = {
            url: mp3StreamUrl,
            mimetype: 'audio/mp3',
            type: 'livestream',
          };
          mutableSession.enclosures.push(enclosure);
        }

        return mutableSession;
      },
    );
    loadingPromises.push(sendezentrumPromise);

    // WikiPaka
    log.info('Importing WikiPaka data');
    const WIKIPAKA_PRETALK_API = 'https://cfp.verschwoerhaus.de/api/events/35c3';
    const WIKIPAKA_PRETALK_SHARE = 'https://cfp.verschwoerhaus.de/35c3/talk';
    const WIKIPAKA_TRACK = {
      id: mkID('WikiPaka'),
      label_de: 'WikiPaka',
      label_en: 'WikiPaka',
      color: [71.0, 105.0, 140.0, 1.0],
    };

    const wikipakaPromise = importPretalk(
      WIKIPAKA_PRETALK_API,
      WIKIPAKA_TRACK,
      EVENT_ID,
      null,
      (session, talk) => {
        if (INVALID_SESSION_NAMES.find(name => session.title.match(new RegExp(name)))) {
          return null;
        }
        const mutableSession = session;
        mutableSession.url = `${WIKIPAKA_PRETALK_SHARE}/${talk.code}/`;

        if (mutableSession.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }
        const liveStream = liveStreams.find(stream => session.location.id === vocSlugToLocatonID[stream.roomSlug]);
        if (liveStream) {
          const enclosure = {
            url: liveStream.streamUrl,
            mimetype: 'video/mp4',
            type: 'livestream',
          };
          mutableSession.enclosures.push(enclosure);
        }
        return mutableSession;
      },
    );
    loadingPromises.push(wikipakaPromise);

    // ChaosZone
    log.info('Importing ChaosZone data');
    const CHAOSZONE_PRETALK_API = 'https://cfp.chaoszone.cz/api/events/35c3';
    const CHAOSZONE_PRETALK_SHARE = 'https://cfp.chaoszone.cz/35c3/talk';
    const CHAOSZONE_TRACK = {
      id: mkID('ChaosZone'),
      label_de: 'ChaosZone',
      label_en: 'ChaosZone',
      color: [153, 49, 41, 1],
    };

    const chaoszonePromise = importPretalk(
      CHAOSZONE_PRETALK_API,
      CHAOSZONE_TRACK,
      EVENT_ID,
      null,
      (session, talk) => {
        if (INVALID_SESSION_NAMES.find(name => session.title.match(new RegExp(name)))) {
          return null;
        }
        const mutableSession = session;
        mutableSession.url = `${CHAOSZONE_PRETALK_SHARE}/${talk.code}/`;

        if (mutableSession.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }
        const liveStream = liveStreams.find(stream => session.location.id === vocSlugToLocatonID[stream.roomSlug]);
        if (liveStream) {
          const enclosure = {
            url: liveStream.streamUrl,
            mimetype: 'video/mp4',
            type: 'livestream',
          };
          mutableSession.enclosures.push(enclosure);
        }
        return mutableSession;
      },
    );
    loadingPromises.push(chaoszonePromise);

    log.info('Importing KOMONA data');
    const KOMONA_PRETALK_API = 'https://talks.komona.org/api/events/35c3';
    const KOMONA_PRETALK_SHARE = 'https://talks.komona.org/35c3/talk';
    const KOMONA_TRACK = {
      id: mkID('Komona'),
      label_de: 'Komona',
      label_en: 'Komona',
      color: [128, 72, 230, 1],
    };
    const komonaPromise = importPretalk(
      KOMONA_PRETALK_API,
      KOMONA_TRACK,
      EVENT_ID,
      null,
      (session, talk) => {
        if (INVALID_SESSION_NAMES.find(name => session.title.match(new RegExp(name)))) {
          return null;
        }
        const mutableSession = session;
        mutableSession.url = `${KOMONA_PRETALK_SHARE}/${talk.code}/`;

        if (mutableSession.begin) {
          const { dayKey } = dayKeyAndBeginEndTimeFromBeginDateString(mutableSession.begin, mutableSession.end);
          mutableSession.day = allDays[dayKey];
        }
        const liveStream = liveStreams.find(stream => session.location.id === vocSlugToLocatonID[stream.roomSlug]);
        if (liveStream) {
          const enclosure = {
            url: liveStream.streamUrl,
            mimetype: 'video/mp4',
            type: 'livestream',
          };
          mutableSession.enclosures.push(enclosure);
        }
        return mutableSession;
      },
    );
    loadingPromises.push(komonaPromise);

    // Load all the things
    const result = await Promise.all(loadingPromises);
    const [lounge, chaosWest, openInfra, sendezentrum, wikipaka, chaoszone, komona] = result;

    lounge.sessions.filter(s => s !== null).forEach(session => addEntry('session', session));
    lounge.speakers.forEach(speaker => addEntry('speaker', speaker));
    lounge.locations.forEach((location) => {
      if (!allRooms[location.id]) allRooms[location.id] = location;
    });
    lounge.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });

    chaosWest.sessions.filter(s => s !== null).forEach(session => addEntry('session', session));
    chaosWest.speakers.forEach(speaker => addEntry('speaker', speaker));
    chaosWest.locations.forEach((location) => {
      if (!allRooms[location.id]) allRooms[location.id] = location;
    });
    chaosWest.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });

    openInfra.sessions.filter(s => s !== null).forEach(session => addEntry('session', session));
    openInfra.speakers.forEach(speaker => addEntry('speaker', speaker));
    openInfra.locations.forEach((location) => {
      if (!allRooms[location.id]) allRooms[location.id] = location;
    });
    openInfra.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });

    sendezentrum.sessions.filter(s => s !== null).forEach((session) => {
      const sendezentrumSession = session;
      if (sendezentrumSession.location && sendezentrumSession.location.id === '35c3-sendezentrum-b-hne') {
        sendezentrumSession.location.label_de = 'Sendezentrum';
        sendezentrumSession.location.label_en = sendezentrumSession.location.label_de;
      }
      addEntry('session', sendezentrumSession);
    });
    sendezentrum.speakers.forEach(speaker => addEntry('speaker', speaker));
    sendezentrum.locations.forEach((location) => {
      const sendezentrumLocation = location;
      if (sendezentrumLocation.id === '35c3-sendezentrum-b-hne') {
        sendezentrumLocation.label_de = 'Sendezentrum';
        sendezentrumLocation.label_en = sendezentrumLocation.label_de;
      }
      if (!allRooms[sendezentrumLocation.id]) {
        allRooms[sendezentrumLocation.id] = sendezentrumLocation;
      }
    });
    sendezentrum.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });

    wikipaka.sessions.filter(s => s !== null).forEach(session => addEntry('session', session));
    wikipaka.speakers.forEach(speaker => addEntry('speaker', speaker));
    wikipaka.locations.forEach((location) => {
      if (!allRooms[location.id]) allRooms[location.id] = location;
    });
    wikipaka.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });    

    chaoszone.sessions.filter(s => s !== null).forEach(session => addEntry('session', session));
    chaoszone.speakers.forEach(speaker => addEntry('speaker', speaker));
    chaoszone.locations.forEach((location) => {
      if (!allRooms[location.id]) allRooms[location.id] = location;
    });
    chaoszone.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });

    komona.sessions.filter(s => s !== null).forEach(session => addEntry('session', session));
    komona.speakers.forEach(speaker => addEntry('speaker', speaker));
    komona.locations.forEach((location) => {
      if (!allRooms[location.id]) allRooms[location.id] = location;
    });
    komona.tracks.forEach((track) => {
      if (!allTracks[track.id]) allTracks[track.id] = track;
    });

    // Final processing
    const allSessions = data.filter(i => i.type === 'session');

    // Generate iCal Feeds
    generateIcalData(allSessions);

    alsoAdd('speaker', allSpeakers);
    alsoAdd('day', allDays);
    // console.log(allRooms);

    let moreIDs = sortOrderOfLocations.length;
    toArray(allRooms)
      .sort()
      .forEach((item) => {
        if (sortOrderOfLocations.indexOf(item.id) >= 0) {
          item.order_index = sortOrderOfLocations.indexOf(item.id);
        } else {
          item.order_index = moreIDs;
          moreIDs += 1;
        }
      });

    alsoAdd('location', allRooms);
    alsoAdd('map', allMaps);
    alsoAdd('track', allTracks);
    alsoAdd('format', allFormats);
    alsoAdd('language', allLanguages);

    log.info('Importing', data.length, 'entries');
    return data;
  }; // json get result

  results()
    .then(resultData => callback(resultData));
}; // scrape
