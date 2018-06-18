const Event = require('./event');
const Track = require('./track');
const { Level, Language, Format } = require('./mappings');
const Session = require('./session');
const Location = require('./location');
const Speaker = require('./speaker');
const moment = require('moment-timezone');

class ToaJsonImporter {
  constructor(eventJson, sessions, speakers, options) {
    this.event = new Event(eventJson);
    this.stageNameOrder = options.stageNameOrder;
    this.dayNames = options.dayNames;

    this.speakers = {};
    this.sessions = {};
    this.days = {};
    this.locations = {};
    this.tracks = {};

    this._processDays();
    this._processTracks();
    this._processLocations(sessions);
    this._processSessions(sessions);
    this._processSpeakers(speakers);
    this._processSessionRelations(sessions);
    this._fixSpeakerIds(options.oldSpeakerIds);
  }

  get location() {
    const [location] = this.event.locations;
    return location;
  }

  get timezone() {
    return this.location.timezone;
  }

  _processDays() {
    this.event.days(this.dayNames).forEach((day) => {
      this.days[day.id] = day;
    });
  }

  _processLocations(dataSessions) {
    const locations = {};

    dataSessions.forEach((sessionJson, index) => {
      const newLocation = Location.fromSessionJson(sessionJson, index);
      const location = locations[newLocation.id];

      if (!location && newLocation.id !== '') {
        const locationIndex = this.stageNameOrder.indexOf(newLocation.label_en);
        if (locationIndex !== -1) {
          newLocation.orderIndex = locationIndex;
        }
        locations[newLocation.id] = newLocation;
      }
    });

    this.locations = locations;
  }

  _processTracks() {
    this.tracks = Track.all;
  }

  _processSessions(dataSessions) {
    const sessions = {};

    dataSessions.forEach((sessionJson) => {
      const newSession = Session.fromJson(sessionJson, this.timezone);
      const existingSession = sessions[newSession.id];
      if (!existingSession && newSession.id !== '') {
        sessions[newSession.id] = newSession;
      }
    });

    this.sessions = sessions;
  }

  _processSpeakers(dataSpeakers) {
    const speakers = {};

    dataSpeakers.forEach((row) => {
      const newSpeaker = Speaker.fromJson(row);
      const existingSpeaker = speakers[newSpeaker.id];
      if (!existingSpeaker && newSpeaker.id !== '') {
        speakers[newSpeaker.id] = newSpeaker;
      }
    });

    this.speakers = speakers;
  }

  _fixSpeakerIds(oldSpeakerIds) {
    const nameToOldSpeakerId = {};

    oldSpeakerIds.forEach((oldJson) => {
      nameToOldSpeakerId[oldJson.name] = `${oldJson.id}`;
    });

    Object.keys(this.speakers).forEach((speakerId) => {
      const speaker = this.speakers[speakerId];
      const oldId = nameToOldSpeakerId[speaker.name];
      if (oldId) {
        speaker.id = oldId;
        this.speakers[speakerId] = null;
        this.speakers[speaker.id] = speaker;
      }
    });

    Object.keys(this.sessions).forEach((sessionId) => {
      const session = this.sessions[sessionId];

      session.speakers = session.speakers.map((sessionSpeaker) => {
        const speaker = sessionSpeaker;
        const oldId = nameToOldSpeakerId[speaker.name];
        if (oldId) {
          speaker.id = oldId;
        }
        return speaker;
      });

      this.sessions[sessionId] = session;
    });

  }

  _processSessionRelations(dataSessions) {
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

    dataSessions.forEach((sessionJson) => {
      const { id } = sessionJson;
      const session = this.sessions[`${id}`];
      if (session) {
        session.updateSpeakersFromJson(sessionJson);
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
      .filter(s => s != null)
      .map(object => addTypeAndEvent(object.JSON, this.event.id, 'session'))
      .filter(session => session.track && session.location);
    result = result.concat(sessions);

    const speakers = values(this.speakers)
      .filter(s => s != null)
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

module.exports = ToaJsonImporter;
