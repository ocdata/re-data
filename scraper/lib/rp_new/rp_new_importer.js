const Helpers = require('./../helpers');
const Session = require('./session');
const Speaker = require('./speaker');
const Location = require('./location');
const Track = require('./track');
const Event = require('./event');
const { Level, Language, Format } = require('./mappings');

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
    this.source.urlPrefix = options.urlPrefix;
    
    this.tracks = {};
    this.locations = {};
    this.speakers = {};
    this.sessions = {};
    this.days = {};
    this.event = new Event(this.source.event);
    
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
  }

  _processLocations() {
    this.source.sessions.forEach((session) => {
      const roomName = Helpers.nullIfEmpty(session.room);
      if (!roomName) return;
      const locationIndex = this.source.locationIndices.indexOf(roomName);
      const location = new Location(roomName);
      if (locationIndex >= 0) {
        location.locationIndex = locationIndex;
      }
      this.locations[location.id] = location;
    });
  }

  _processSpeakers() {
    this.source.speakers.forEach((speakerJSON) => {
      const speaker = new Speaker(speakerJSON);
      if (speaker.name) {
        this.speakers[speaker.id] = speaker;
      }
    });
  }

  _processSessions() {
    this.source.sessions.forEach((sessionJSON) => {
      let urlFunction;
      if (this.source.urlPrefix) {
        urlFunction = (session) => {
          if (!session.slug) return null;
          return `${this.source.urlPrefix}${session.slug}`;
        };
      }
      const session = new Session(sessionJSON, urlFunction);
      this.sessions[session.id] = session;
    });
  }

  _processRelations() {
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
      const trackId = Helpers.mkId(session.source.topic);
      const track = this.tracks[trackId];
      if (track) {
        session.track = track.miniJSON;
      }
      // TODO: Add days
      // TODO: Add sessions to locations
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
