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


class AltconfCsvImporter {
  constructor(
    eventJson,
    csvFile,
    options,
  ) {
    this.event = new Event(eventJson);
    this.csvFile = csvFile;
    this.dayNames = options.dayNames;

    const data = fs.readFileSync(csvFile);
    const result = parse(
      data,
      {
        delimiter: ',',
        auto_parse: false,
        skip_empty_lines: true,
      },
      null,
    );
    // no need for the frist two lines
    result.shift();
    result.shift();

    this.data = result;
    this.speakers = {};
    this.days = {};
    this.tracks = {};
    this.timezone = this.event.locations[0].timezone;

    this._processSessions();
    this._processDays();
    this._processTracks();
    this._processLocations();
    this._processSessionRelations();
  }

  _processDays() {
    this.event.days(this.dayNames).forEach((day) => {
      this.days[day.id] = day;
    });
  }

  _processSessions() {
    const sessions = {};

    this.data.forEach((row) => {
      const session = new Session(row, null, this.event.locations[0].timezone);

      sessions[session.id] = session;
    });

    this.sessions = sessions;
  }

  _processLocations() {
    const locations = {};

    this.data.forEach((row, index) => {
      const location = new Location(row, index);

      locations[location.id] = location;
    });

    this.locations = locations;
  }

  _processTracks() {
    this.tracks[Track.altConf.id] = Track.altConf;
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

    return result;
  }
}

module.exports = AltconfCsvImporter;
