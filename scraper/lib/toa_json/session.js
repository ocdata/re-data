const moment = require('moment-timezone');
const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');
const Track = require('./track');
const Speaker = require('./speaker');


class Session {
  static fromJson(json, timezone) {
    const { data, date, id } = json;
    const begin = moment.tz(date.startDate, 'YYYY-MM-DD HH:mm:ss', timezone);
    const {
      duration,
      title,
      url,
      description,
      stage,
    } = data;
    const [firstStage] = stage;
    const locationName = firstStage.name;
    return new Session(
      `${id}`,
      Helpers.dehtml(title),
      begin,
      duration,
      locationName,
      Helpers.dehtml(description),
      Track.toa,
      () => url,
      timezone,
    );
  }

  updateSpeakersFromJson(json) {
    const { data } = json;
    const { speakers } = data;

    this.speakers = speakers
      .filter(s => s != null)
      .map(speakerJson => new Speaker(speakerJson.ID, speakerJson.post_title));
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
