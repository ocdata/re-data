const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');

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
      return Language[language];
    } 
    return null;
  }

  get format() {
    const format = Helpers.nullIfEmpty(this.source.format);
    if (format) {
      return Format[format];
    } 
    return null;
  }

  get level() {
    const level = Helpers.nullIfEmpty(this.source.experience);
    if (level) {
      return Level[level];
    }
    return null;
  }

  get slug() {
    return Helpers.slug(this.title);
  }

  get miniJSON() {
    return {
      id: this.id,
      title: this.title,
    };
  }

  get JSON() {
    const json = this.miniJSON;
    json.track = this.track;
    json.format = this.format;
    json.abstract = Helpers.dehtml(this.source.short_thesis);
    json.description = Helpers.dehtml(this.source.description);
    json.format = this.format;
    json.level = this.level;
    json.lang = this.language;
    json.speakers = this.speakers;
    json.cancelled = this.source.status === 'Cancelled';
    json.will_be_recorded = false;
    json.related_sessions = [];
    json.links = [];
    if (this.urlFunction) {
      json.url = this.urlFunction(this);
    }
    return json;
  }
}

module.exports = Session;
