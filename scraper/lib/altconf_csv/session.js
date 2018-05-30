const moment = require('moment-timezone');
const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');
const Track = require('./track');

class Session {
  constructor(row, urlFunction = undefined, timezone = 'Etc/UTC') {
    const [title, startdate, enddate, times, location, content] = row;

    const [startTime, endTime] = times.split('-');

    const start = `${startdate} ${startTime}`;
    const end = `${enddate} ${endTime}`;

    this.begin = moment.tz(start, timezone);
    this.end = moment.tz(end, timezone);
    this.title = title;
    this.id = Helpers.mkId(title);
    this.urlFunction = urlFunction;
    this.timezone = timezone;
    this.locationName = location;
    this.content = content;
    this._processContent();
  }

  _processContent() {
    const regex = /<div .+>(.+)<\/div>/;

    const match = this.content.match(regex);
    if (!match || match.length < 2) {
      return;
    }
    const afterMatch = this.content.replace(match[0], '');
    const speakerList = match[1];
    const speakerNames = speakerList.split(/ ?[&,] /);
    
    this.speakers = speakerNames.map((name) => {
      return {
        name,
        id: Helpers.mkId(name),
      };
    });
    this.description = null;
    this.abstract = afterMatch.trim();
  }

  get miniJSON() {
    return {
      id: this.id,
      title: this.title,
    };
  }

  get location() {
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
    json.track = this.track;
    json.format = this.format;
    json.abstract = this.abstract;
    json.description = this.description;
    json.format = Format.Talk;
    json.level = Level.Everyone;
    json.lang = Language.English;
    json.speakers = this.speakers;
    json.cancelled = false;
    json.day = this.day;
    json.track = Track.altConf.miniJSON;
    if (this.willBeRecorded) {
      json.will_be_recorded = this.willBeRecorded;
    }
    json.related_sessions = [];
    json.track = Track.altConf.miniJSON;
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
