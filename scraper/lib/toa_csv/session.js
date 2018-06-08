const moment = require('moment-timezone');
const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');
const Track = require('./track');
const Speaker = require('./speaker');


class Session {

  static sessionIdFromRow(row, timezone) {
    const rowTime = row['Running Order Start Time +AFs-TOA18+AF0-'];
    const rowDate = row['Day of Talk +AFs-TOA18+AF0-'];
    const begin = this.beginDate(rowDate, rowTime, timezone);
    const locationName = row['Stage +AFs-TOA18+AF0-'];
    return `${Helpers.mkId(locationName)}-${begin.format('YYYYMMDDHHmm')}`;
  }

  static beginDate(rowDate, rowBeginTime, timezone) {
    const rowDateAndTime = `${rowDate} ${rowBeginTime}`;
    const dateFormat = 'ddd[,] Do [of] MMMM';
    const timeFormats = ['hh:mmA', 'hh:mm A', 'HH:mm'];

    const parseDate = moment.tz(
      rowDateAndTime,
      timeFormats.map(f => `${dateFormat} ${f}`),
      timezone,
    );
    return parseDate;
  }

  static fromRow(row, track, urlFunction = undefined, timezone = 'Etc/UTC') {
    const title = row['Talk title'];
    const abstract = row['Talk description'];
    const duration = row['Running Order Length (in minutes) +AFs-TOA18+AF0-'];
    const locationName = row['Stage +AFs-TOA18+AF0-'];
    const rowTime = row['Running Order Start Time +AFs-TOA18+AF0-'];
    const rowDate = row['Day of Talk +AFs-TOA18+AF0-'];
    const begin = this.beginDate(rowDate, rowTime, timezone);
    
    const session = new Session(
      this.sessionIdFromRow(row, timezone),
      title,
      begin,
      duration,
      locationName,
      abstract,
      track,
      urlFunction,
      timezone,
    );
    return session;
  }

  addSpeakerFromRow(row) {
    const firstName = row['First Name'];
    const lastName = row['Last Name'];
    const id = row['Contact ID'];
    const name = `${firstName} ${lastName}`.trim();
    const speaker = new Speaker(id, name);
    
    const speakerIds = this.speakers.map(s => s.id);
    if (!speakerIds.includes(speaker.id)) {
      const { speakers } = this;
      speakers.push(speaker);
      this.speakers = speakers;
    }
  }

  constructor(id, title, begin, durationMinutesString, locationName, abstract, track, urlFunction = undefined, timezone = 'Etc/UTC') {
    this.track = track;
    this.begin = begin;
    const durationFloat = parseFloat(durationMinutesString);
    if (this.begin) {
      const end = moment.tz(this.begin, timezone).add(durationFloat, 'm');
      this.end = end;
    }
    this.title = title;
    this.id = id;
    this.urlFunction = urlFunction;
    this.timezone = timezone;
    if (locationName !== '') {
      this.locationName = locationName;
    }
    this.abstract = abstract;
    this.speakers = [];
  }

  get miniJSON() {
    return {
      id: this.id,
      title: this.title,
    };
  }

  get location() {
    if (!this.locationName) return undefined;

    return {
      label_de: this.locationName,
      label_en: this.locationName,
      id: Helpers.mkId(this.locationName),
    };
  }

  get JSON() {
    const json = this.miniJSON;
    if (this.begin) json.begin = this.begin.format();
    if (this.end) json.end = this.end.format();
    json.track = this.track.miniJSON;
    json.format = this.format;
    json.abstract = this.abstract;
    json.description = this.description;
    json.format = Format.Talk;
    json.level = Level.Everyone;
    json.lang = Language.English;
    json.speakers = this.speakers.map(s => s.miniJSON);
    json.cancelled = false;
    json.day = this.day;
    if (this.willBeRecorded) {
      json.will_be_recorded = this.willBeRecorded;
    }
    json.related_sessions = [];
    json.track = this.track;
    json.links = [];
    json.enclosures = [];

    json.location = this.location;
    if (this.urlFunction) {
      json.url = this.urlFunction(this);
    }
    return json;
  }
}

module.exports = Session;
