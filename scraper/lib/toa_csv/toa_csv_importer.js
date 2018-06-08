const fs = require('fs');
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

const parse = require('csv-parse/lib/sync');


class ToaCsvImporter {
  constructor(
    eventJson,
    csvFileSessions,
    options,
  ) {
    this.event = new Event(eventJson);

    this.dayNames = options.dayNames;

    const dataSessions = fs.readFileSync(csvFileSessions);
    const resultSessions = parse(
      dataSessions,
      {
        delimiter: ',',
        trim: true,
        auto_parse: false,
        quote: '"',
        skip_empty_lines: true,
        columns: true,
      },
      null,
    );

    this.dataSessions = resultSessions;
    this.speakers = {};
    this.days = {};
    this.tracks = {};
    this.timezone = this.event.locations[0].timezone;

    this._processDays();
    this._processLocations();
    this._processSpeakers();
    this._processTracks();
    this._processSessions();
    this._processSessionRelations();
  }

  _processDays() {
    this.event.days(this.dayNames).forEach((day) => {
      this.days[day.id] = day;
    });
  }

  _processSessions() {
    const sessions = {};

    this.dataSessions.forEach((row) => {
      const newSession = Session.fromRow(row, Track.toa, null, this.timezone);
      const existingSession = sessions[newSession.id];
      if (!existingSession && newSession.id !== '') {
        sessions[newSession.id] = newSession;
      }
    });

    this.sessions = sessions;
  }

  _processSpeakers() {
    const speakers = {};

    this.dataSessions.forEach((row) => {
      const newSpeaker = Speaker.fromRow(row);
      const existingSpeaker = speakers[newSpeaker.id];
      if (!existingSpeaker && newSpeaker.id !== '') {
        speakers[newSpeaker.id] = newSpeaker;
      }
    });

    this.speakers = speakers;
  }

  _processLocations() {
    const locations = {};

    this.dataSessions.forEach((row, index) => {
      const newLocation = new Location(row, index);
      const location = locations[newLocation.id];
      if (!location && newLocation.id !== '') {
        locations[newLocation.id] = newLocation;
      }
    });

    this.locations = locations;
  }

  _processTracks() {
    this.tracks = Track.all;
  }

  _processSessionRelations() {
    const dayIdForSession = (session, timezone, dayBeginHour) => {
      if (!moment.isMoment(session.begin) && timezone && dayBeginHour) return null;
      let { begin } = session;

      const hour = begin.tz(timezone).hour();
      if (hour < dayBeginHour) {
        begin = begin.subtract(24, 'h');
      }

      return begin.format('YYYY-MM-DD');
    };

    Object.keys(this.sessions).forEach((sessionId) => {
      const session = this.sessions[sessionId];
      const dayId = dayIdForSession(session, this.timezone, this.dayStartHour);
      if (dayId) {
        const day = this.days[dayId];
        if (day) {
          session.day = day.miniJSON;
        }
      }
    });

    this.dataSessions.forEach((row) => {
      const sessionId = Session.sessionIdFromRow(row, this.timezone);
      const session = this.sessions[sessionId];
      if (session) {
        session.addSpeakerFromRow(row);
      }
    });

    Object.keys(this.speakers).forEach((speakerId) => {
      const speaker = this.speakers[speakerId];
      const sessionsBySpeaker = Object.values(this.sessions).filter(s => s.speakers.map(sp => sp.id).includes(speaker.id));
      sessionsBySpeaker.forEach(session => speaker.sessions.push(session));
      this.speakers[speaker.id] = speaker;
    });
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
      .filter(session => session.track && session.location);
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

    // ensure no empty ids get added
    result = result.filter(i => i.id != null && i.id !== '');

    return result;
  }
}

module.exports = ToaCsvImporter;
