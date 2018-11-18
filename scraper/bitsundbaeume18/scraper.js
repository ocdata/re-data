const fs = require('fs');
const path = require('path');
const ent = require('ent');
const sanitizeHtml = require('sanitize-html');
const icalendar = require('icalendar');

const log = require('../../api/lib/log.js');
const jsonRequester = require('../lib/json_requester');
const { parseVocStreams, vocVodSessionVideos, enclosureFromVocJson } = require('./voc-live-api');

const EVENT_ID = 'bitsundbaeume18';
const SCHEDULE_URL = 'https://fahrplan.bits-und-baeume.org/schedule.json';
const SPEAKERS_URL = 'https://fahrplan.bits-und-baeume.org/speakers.json';

const VOC_LIVE_API_URL = 'https://streaming.media.ccc.de/streams/v2.json';
const VOC_EVENT_ID = 'bub2018';
const VOC_VOD_CONFERENCE_API_URL = `https://api.media.ccc.de/public/conferences/${VOC_EVENT_ID}`;

// for debugging we can just pretend rp14 was today
const originalStartDate = new Date(Date.UTC(2015, 11, 27, 10, 0, 0, 0));
const fakeDate = originalStartDate; // new Date(Date.UTC(2015, 11, 23, 16, 0, 0, 0));
const sessionStartDateOffsetMilliSecs =
  fakeDate.getTime() - originalStartDate.getTime();

const dayYearChange = 0;
const dayMonthChange = 0;
const dayDayChange = 0;

function toArray(obj) {
  return Object.keys(obj).map(key => obj[key]);
}

function clone(obj) {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[key] = obj[key];
  });
  return newObj;
}

function mkID(string) {
  const slug = string
    .toString()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .toLowerCase();
  return `${EVENT_ID}-${slug}`;
}

const sortOrderOfLocations = [
  mkID('ADA'),
  mkID('BASH'),
  mkID('CLOJURE'),
  mkID('DELPHI'),
  mkID('EMACS'),
  mkID('ahorn'),
  mkID('birke'),
  mkID('cocos'),
  mkID('durian'),
  mkID('erle'),
  mkID('fichte'),
  mkID('gingko'),
  mkID('Chatraum'),
  mkID('JugendForum'),
  mkID('Forum'),
  mkID('Glasraum'),
];

// to map VOC API output to our rooms
const vocSlugToLocatonID = {};

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

const testVideoURLs = {};

const blue = [80.0, 87.0, 175.0, 1.0];
const violett = [125.0, 136.0, 242.0, 1.0];
const turquise = [219.0, 196.0, 251.0, 1.0];
const orange = [239.0, 155.0, 74.0, 1.0];
const yellow = [237.0, 243.0, 87.0, 1.0];
const green = [169.0, 198.0, 100.0, 1.0];
const red = [118.0, 26.0, 61.0, 1.0];

// non-official
const grey = [110.0, 110.0, 110.0, 1.0];

const colors = {};
colors[mkID('Alternatives Wirtschaften')] = orange;
colors[mkID('Daten & Umwelt')] = green;
colors[mkID('Die ganz großen Fragen')] = turquise;
colors[mkID('Die materielle Basis')] = yellow;
colors[mkID('Digitaler Kapitalismus')] = red;
colors[mkID('Stadt – Land – Smart')] = grey;
colors[mkID('Zivilgesellschaft & Communities')] = violett;

// not used anymore
colors[mkID('Reclaim Smart City!')] = blue;
colors[mkID('Bits & Bäume')] = green;

colors[mkID('Other')] = grey;

const allFormats = {
  discussion: { id: 'discussion', label_en: 'Discussion' },
  talk: { id: 'talk', label_en: 'Talk' },
  workshop: { id: 'workshop', label_en: 'Workshop' },
};

const allLevels = {
  beginner: { id: 'beginner', label_en: 'Beginner' },
  intermediate: { id: 'intermediate', label_en: 'Intermediate' },
  advanced: { id: 'advanced', label_en: 'Advanced' },
};

const allLanguages = {
  en: { id: 'en', label_en: 'English' },
  de: { id: 'de', label_en: 'German' },
};

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

  const parseDate = new Date(date);
  parseDate.setUTCFullYear(parseDate.getUTCFullYear() + dayYearChange);
  parseDate.setUTCMonth(parseDate.getUTCMonth() + dayMonthChange);
  parseDate.setUTCDate(parseDate.getUTCDate() + dayDayChange);

  let dateLabelDe = date;
  let dateLabelEn = date;

  let index = 0;
  const monthDay = parseDate.getUTCDate();
  switch (monthDay) {
    case 17:
      index = 1;
      dateLabelDe = 'Tag 1';
      dateLabelEn = 'Day 1';
      break;
    case 18:
      index = 2;
      dateLabelDe = 'Tag 2';
      dateLabelEn = 'Day 2';
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
      if (url.indexOf('http') !== 0) {
        url = `http://${url}`;
      }
      links.push({
        url,
        title: link.title,
        service: 'web',
        type: 'speaker-link',
      });
    });
  }

  const result = {
    id: mkID(speakerJSON.full_public_name),
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
    is_stage: roomName.toString().match(/Stage/i) ? true : false,
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
      description = session.description;
    }
    event.setDescription(description);

    if (session.location) {
      event.setLocation(session.location.label_en);
    }
    event.setDate(session.begin, session.end);

    ical.addComponent(event);
  });

  let filepath = __dirname + '/../../web/data/' + EVENT_ID + '/sessions.ics';
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
  const seconds = time + (minutes * 60.0) + (hours * 60.0 * 60.0);
  const date = new Date(seconds * 1000);
  const newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
  date.setTime(newMillis);

  if (date.getTime() <= eventDate.getTime()) {
    date.setTime(eventDate.getTime() + (1000 * 3600));
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
  
  let color = colors[id];
  if (!color) {
    color = [109.0, 109.0, 109.0, 1.0]; // grey by default
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

  // if this is for a session we sanatize the date in case of strange input
  if (begin) {
    // if (begin.getUTCDate() != parseDate.getUTCDate() ||
    //     begin.getUTCMonth() != parseDate.getUTCMonth() ||
    //     begin.getUTCDate() != parseDate.getUTCDate())
    // {
    // TODO: get day begin as input
    if (begin.getHours() >= 9) {
      // this is ok only if the session is very early, so we return the date from begin
      const realBegin =
        '' +
        begin.getUTCFullYear() +
        '-' +
        (begin.getUTCMonth() + 1) +
        '-' +
        begin.getUTCDate();

      // log.warn('Given 'day' date and 'begin' date of the session don't match and this is not an early morning session! date says:', parseDate, ' vs begin:', begin, ' returning ', realBegin);

      return realBegin;
    } else if (begin.getHours() >= 5) {
      // this is ok only if the session is very early, so we return the date from begin
      const realBegin =
        '' +
        begin.getUTCFullYear() +
        '-' +
        (begin.getUTCMonth() + 1) +
        '-' +
        (begin.getUTCDate() - 1);

      log.warn(
        'Session is to early, returning ',
        realBegin,
        ' as begin date instead of ',
        theDate,
        ' begin: ',
        begin
      );

      return realBegin;
    }
    // }
  }

  // console.log('normalized ' + date );
  date =
    '' +
    theDate.getUTCFullYear() +
    '-' +
    (theDate.getUTCMonth() + 1) +
    '-' +
    theDate.getUTCDate();
  // console.log('to ' + date );

  return date;
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
  idField,
) {
  const links = [];
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
        return 'https://fahrplan.events.ccc.de/congress/2017/Fahrplan/';
      }
      return `https://fahrplan.events.ccc.de/congress/2017/Fahrplan/events/${event[idField]}.html`;
    };
  }

  event.links.forEach((link) => {
    let url = null;
    let title = null;
    if (typeof link === 'string') {
      url = link;
      title = link;
    } else if (typeof link === 'object' && link.title && link.url) {
      title = link.title;
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

    links.push({
      title,
      url,
      type: 'session-link',
    });
  });

  const link = additionalLinks[id];
  if (link) {
    links.push(link);
  }

  const begin = parseDate(event.date);

  // Make sure day change is at 5 in the morning
  
  const time = new Date(2017, 11, 27);
  if (begin.getTime() < time.getTime()) {
    console.log('No valid begin: ', begin);
    return null;
  }

  const dayKey = normalizeXMLDayDateKey(eventDay.date, begin);
  let eventTypeId = event.type.toString();
  if (eventTypeId === 'lecture') {
    eventTypeId = 'talk';
  } else if (eventTypeId === 'other') {
    eventTypeId = 'talk';
  } else if (eventTypeId === 'meeting') {
    eventTypeId = 'workshop';
  }

  const day = allDays[dayKey];

  if (!day) {
    console.log('No valid day for', event.title.toString(), dayKey);
    return null;
  }

  let { track } = event;
  if (track == null) track = 'Other';

  let abstract = sanitizeHtml(event.abstract.toString(), { allowedTags: [] });
  abstract = ent.decode(abstract);

  let description = sanitizeHtml(event.description.toString(), { allowedTags: [] });
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
    format: allFormats[eventTypeId],
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
        'http://static.media.ccc.de/media/congress/2013/5490-h264-iprod_preview.jpg'
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
          (session, sourceJSON) => `https://fahrplan.bits-und-baeume.org/events/${sourceJSON.id}.html`,
          idField,
        );
        // if event could not be parse skip it
        if (eventJSON == null) return;

        // Event Speakers
        // --------------
        event.persons.forEach((person) => {
          const publicName = person.public_name;
          if (!publicName) return;

          const personID = mkID(publicName);
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

  jsonRequester.get(
    {
      urls: {
        speakers: SPEAKERS_URL,
        schedule: SCHEDULE_URL,
        vocLiveStreams: VOC_LIVE_API_URL,
        vocVodConference: VOC_VOD_CONFERENCE_API_URL,
      },
    },
    async (result) => {
      // Main Events
      const { speakers } = result.speakers.schedule_speakers;
      const { schedule } = result;

      // VOC Live
      const { vocLiveStreams } = result;
      const liveStreams = parseVocStreams(vocLiveStreams, VOC_EVENT_ID);

      // VOC VOD
      const { vocVodConference } = result;

      const defaultTrack = {
        id: mkID('other'),
        color: [97.0, 97.0, 97.0, 1.0], // grey
        label_de: 'Other',
        label_en: 'Other',
      };

      const vodJsons = await vocVodSessionVideos(vocVodConference);

      // Generates enclosures from a parse session
      const enclosureFunction = (session) => {
        const enclosures = [];

        // find live streams
        const streamInfo = liveStreams.find((stream) => {
          return stream.name.toLowerCase() === session.location.label_en.toLowerCase()
            && !stream.translated;
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
        const vodJson = vodJsons.find(vocVideo => vocVideo.link === session.url);
        if (vodJson) {
          const enclosure = enclosureFromVocJson(vodJson);
          if (enclosure) {
            enclosures.push(enclosure);
          }
        }
        return enclosures;
      };

      const INVALID_SESSION_NAMES = ['Pause', 'Mittagessen', 'Abendessen'];

      // Frap
      handleResult(
        schedule,
        speakers,
        [],
        '',
        defaultTrack,
        'https://fahrplan.bits-und-baeume.org',
        enclosureFunction,
        null,
        null,
        null,
        session => !INVALID_SESSION_NAMES.includes(session.title),
      );

      const allSessions = data.filter(i => i.type === 'session');

      // Generate iCal Feeds
      generateIcalData(allSessions);

      alsoAdd('speaker', allSpeakers);
      alsoAdd('day', allDays);
      // console.log(allRooms);

      const moreIDs = sortOrderOfLocations.length;
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

      callback(data);
    }, // json get result
  ); // json get
}; // scrape

