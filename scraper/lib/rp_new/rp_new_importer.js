const Helpers = require('./../helpers');
const Session = require('./session');
const Speaker = require('./speaker');
const Location = require('./location');
const Track = require('./track');
const Event = require('./event');
const Link = require('./link');
const Enclosure = require('./enclosure');
const { Level, Language, Format } = require('./mappings');
const moment = require('moment-timezone');

class RPNewImporter {
  constructor(
    event,
    sessions,
    speakers,
    options = {},
  ) {
    this.source = {
      event,
      sessions,
      speakers,
    };
    this.source.trackColorMap = options.trackColorMap ? options.trackColorMap : {};
    this.source.locationIndices = options.locationIndices ? options.locationIndices : [];
    this.source.dayNames = options.dayNames ? options.dayNames : {};
    this.source.dayStartHour = options.dayStartHour ? options.dayStartHour : 5;
    this.source.sessionUrlPrefix = options.sessionUrlPrefix;
    this.source.speakerUrlPrefix = options.speakerUrlPrefix;
    this.source.speakerPicturePrefix = options.speakerPicturePrefix;
    this.source.recordedLocationIds = options.recordedLocationIds;
    this.source.locationStreamLinks = options.locationStreamLinks;
    this.source.locationLiveEnclosureUrls = options.locationLiveEnclosureUrls;
    this.source.ytrecordings = options.ytrecordings;

    this.tracks = {};
    this.locations = {};
    this.speakers = {};
    this.sessions = {};
    this.days = {};
    this.event = new Event(this.source.event);
    // TODO: Actually use the info from Event locations here.
    // For this to work we need the session locations to have a event location mapping.
    this.timezone = 'Europe/Berlin';
    moment.tz.setDefault(this.timezone);

    this._processDays();
    this._processTracks();
    this._processLocations();
    this._processSpeakers();
    this._processSessions();
    this._processRelations();
  }

  _processDays() {
    this.event.days(this.source.dayNames).forEach((day) => {
      this.days[day.id] = day;
    });
  }

  _processTracks() {
    this.source.sessions.forEach((session) => {
      if (session.topic === '') return;
      // TODO: Color mapping
      const track = new Track(session.topic);
      const color = this.source.trackColorMap[track.id];
      if (color) {
        track.color = color;
      }
      this.tracks[track.id] = track;
    });

    const otherTrack = new Track('Other', [111, 111, 111, 1]);
    this.tracks[otherTrack.id] = otherTrack;
    this.source.otherTrack = otherTrack;
  }

  _processLocations() {
    this.source.sessions.forEach((session) => {
      const roomName = Helpers.nullIfEmpty(session.room);
      const roomId = Helpers.nullIfEmpty(session.room_nid);
      if (!roomName || !roomId) return;
      let locationIndex = this.source.locationIndices.indexOf(roomName);
      if (locationIndex === -1) {
        locationIndex = this.locations.length + 1;
      }
      const location = new Location(roomName, roomId, locationIndex, (roomName.match(/Stage/i) != null));
      this.locations[location.id] = location;
    });
  }

  _processSpeakers() {
    this.source.speakers.forEach((speakerJSON) => {
      let urlFunction;
      if (this.source.speakerUrlPrefix) {
        urlFunction = (speaker) => {
          if (!speaker.id) return undefined;
          return `${this.source.speakerUrlPrefix}${speaker.id}`;
        };
      }
      let pictureFunction;
      if (this.source.speakerPicturePrefix) {
        pictureFunction = (session) => {
          if (!session.source.picture) return undefined;
          return `${this.source.speakerPicturePrefix}${session.source.picture}`;
        };
      }
      const speaker = new Speaker(
        speakerJSON,
        urlFunction,
        pictureFunction,
      );
      if (speaker.name) {
        this.speakers[speaker.id] = speaker;
      }
    });
  }

  _processSessions() {
    this.source.sessions.forEach((sessionJSON) => {
      let urlFunction;
      if (this.source.sessionUrlPrefix) {
        urlFunction = (session) => {
          if (!session.slug) return undefined;
          return `${this.source.sessionUrlPrefix}${session.slug}`;
        };
      }
      const session = new Session(sessionJSON, urlFunction);
      if (session.location && this.source.recordedLocationIds) {
        session.willBeRecorded = this.source.recordedLocationIds.includes(session.location.id);
      }
      // add livestream links (yt, etc.)
      if (session.location && this.source.locationStreamLinks[session.location.id]) {
        const streamLink = this.source.locationStreamLinks[session.location.id];
        if (streamLink) {
          const link = new Link(streamLink.url, 'livestream', session.title);
          session.streamLink = link;
        }
      }

      // add recording from YT
      const ytrecording = this.source.ytrecordings[session.title.toLowerCase()];
      if (ytrecording && ytrecording.match(/v=(.+)$/)) {
        const link = `https://www.youtube.com/v/${RegExp.$1}`
        session.recordingLink = new Link(link, 'recording', session.title);
      }

      // add livestream via HLS
      if (session.location && this.source.locationLiveEnclosureUrls) {
        const streamLink = this.source.locationLiveEnclosureUrls[session.location.id];
        if (streamLink) {
          const enclosure = new Enclosure(
            streamLink.url,
            'livestream',
            session.title,
            'application/x-mpegurl',
            streamLink.thumb,
          );
          session.streamEnclosure = enclosure;
        }
      }

      this.sessions[session.id] = session;
    });
  }

  _processRelations() {
    this._processSessionRelations();
    this._processSpeakerRelations();
  }

  _processSessionRelations() {
    const dayIdForSession = (session, eventTimezone, dayBeginHour) => {
      if (!moment.isMoment(session.begin) && eventTimezone && dayBeginHour) return null;
      let { begin } = session;

      const hour = begin.tz(eventTimezone).hour();
      if (hour < dayBeginHour) {
        begin = begin.subtract(24, 'h');
      }
      
      return begin.format('YYYY-MM-DD');
    };

    Object.keys(this.sessions).forEach((sessionId) => {
      const session = this.sessions[sessionId];
      session.speakers.forEach((sessionSpeaker) => {
        const speaker = this.speakers[sessionSpeaker.id];
        if (speaker && speaker.name) {
          if (!speaker.sessions.find(speakerSession => speakerSession.id === sessionId)) {
            speaker.sessions.push(session);
          }
        }
      });

      // Tracks
      const trackId = Helpers.mkId(session.source.topic);
      const track = this.tracks[trackId];
      if (track) {
        session.track = track.miniJSON;
      } else {
        session.track = this.source.otherTrack.miniJSON;
      }

      // Days
      const dayId = dayIdForSession(session, this.timezone, this.source.dayStartHour);
      if (dayId) {
        const day = this.days[dayId];
        if (day) {
          session.day = day.miniJSON;
        }
      }
      
      // TODO: Add sessions to locations
    });
  }

  _processSpeakerRelations() {
    Object.keys(this.speakers);
  }

  get JSON() {
    const values = obj => Object.keys(obj).map(key => obj[key]);
    
    const addTypeAndEvent = (object, eventId, type) => {
      if (!object) return null;
      const newObject = object;
      newObject.type = type;
      newObject.event = eventId;
      return newObject;
    };

    let result = [];

    const sessions = values(this.sessions)
      .map(object => addTypeAndEvent(object.JSON, this.event.id, 'session'))
      .filter(session => session.track);
    result = result.concat(sessions);

    const speakers = values(this.speakers)
      .map(object => addTypeAndEvent(object.JSON, this.event.id, 'speaker'))
      .filter(speaker => speaker.name);
    result = result.concat(speakers);

    const days = values(this.days)
      .map(object => addTypeAndEvent(object.JSON, this.event.id, 'day'));
    result = result.concat(days);

    const locations = values(this.locations)
      .map(object => addTypeAndEvent(object.JSON, this.event.id, 'location'));
    result = result.concat(locations);

    const tracks = values(this.tracks)
      .map(object => addTypeAndEvent(object.JSON, this.event.id, 'track'));
    result = result.concat(tracks);

    const formats = Object.keys(Format)
      .map(key => addTypeAndEvent(Format[key], this.event.id, 'format'));
    result = result.concat(formats);

    const languages = Object.keys(Language)
      .map(key => addTypeAndEvent(Language[key], this.event.id, 'language'));
    result = result.concat(languages);

    const levels = Object.keys(Level)
      .map(key => addTypeAndEvent(Level[key], this.event.id, 'level'));
    result = result.concat(levels);

    const maps = [];
    result = result.concat(maps);

    const pois = [];
    result = result.concat(pois);

    return result.filter(obj => obj !== null);
  }
}

module.exports = RPNewImporter;
