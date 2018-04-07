const moment = require('moment-timezone');
const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');
const Link = require('./link');

class Session {
  constructor(json, urlFunction = undefined) {
    this.source = json;
    this.urlFunction = urlFunction;
  }

  get id() {
    return this.source.nid;
  }
  
  get title() {
    return Helpers.dehtml(this.source.title);
  }

  get abstract() {
    return Helpers.dehtml(this.source.short_thesis);
  }

  get description() {
    return Helpers.dehtml(this.source.description);
  }

  get speakers() {
    const names = this.source.speaker.split(', ');
    const ids = this.source.speaker_uid.split(', ');

    const result = [];
    names.forEach((name, index) => {
      const id = ids[index];
      result.push({ id, name });
    });
    return result;
  }

  get moderators() {
    const names = this.source.moderator.split(', ');
    const ids = this.source.moderator_uid.split(', ');

    const result = [];
    names.forEach((name, index) => {
      const id = ids[index];
      result.push({ id, name });
    });
    return result;
  }

  get videoUrl() {
    return Helpers.nullIfEmpty(this.source.video);
  }

  get language() {
    const language = Helpers.nullIfEmpty(this.source.language);
    if (language) {
      const result = Language[language];
      if (result) return result;
    }
    return Language.German;
  }

  get format() {
    const format = Helpers.nullIfEmpty(this.source.format);
    if (format) {
      const result = Format[format];
      if (result) return result;
    }
    return Format.Talk;
  }

  get level() {
    const level = Helpers.nullIfEmpty(this.source.experience);
    if (level) {
      const result = Level[level];
      if (result) return result;
    }
    // default to eveyone
    return Level.Everyone;
  }

  get slug() {
    const slugRegex = /\/session\/(.+)" href/i;
    const match = this.source.title.match(slugRegex);
    const slug = match[1];
    return slug;
  }

  get grouping() {
    return Helpers.dehtml(this.source.track);
  }

  get miniJSON() {
    return {
      id: this.id,
      title: this.title,
    };
  }

  get begin() {
    const beginStr = Helpers.nullIfEmpty(this.source.datetime_start);
    if (beginStr) {
      return moment(beginStr);
    }
    return null;
  }

  get end() {
    const endStr = Helpers.nullIfEmpty(this.source.datetime_end);
    if (endStr) {
      return moment(endStr);
    }
    return null;
  }

  get JSON() {
    const json = this.miniJSON;
    if (this.begin) json.begin = this.begin.format();
    if (this.end) json.end = this.end.format();
    json.track = this.track;
    json.format = this.format;
    json.abstract = Helpers.dehtml(this.source.short_thesis);
    json.description = Helpers.dehtml(this.source.description);
    json.format = this.format;
    json.level = this.level;
    json.lang = this.language;
    json.speakers = this.speakers;
    if (this.source.status) {
      json.cancelled = this.source.status.toLowerCase() === 'cancelled';
    } else {
      json.cancelled = false;
    }
    json.day = this.day;
    json.will_be_recorded = false;
    json.related_sessions = [];
    json.links = [];
    json.enclosures = [];
    if (this.urlFunction) {
      json.url = this.urlFunction(this);
    }
    return json;
  }
}

module.exports = Session;
