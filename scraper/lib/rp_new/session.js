const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');

class Session {

  constructor(json) {
    this.source = json;
  }

  get id() {
    return this.source.nid;
  }
  
  get title() {
    return Helpers.dehtml(this.source.title);
  }
 
  get subtitle() {
    return null;
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

    let result = [];
    names.forEach((name, index) => {
      const id = ids[index];
      result.push({id, name});
    });
    return result;
  }

  get moderators() {
    const names = this.source.moderator.split(', ');
    const ids = this.source.moderator_uid.split(', ');

    let result = [];
    names.forEach((name, index) => {
      const id = ids[index];
      result.push({id, name});
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
    } else {
      return null;
    }
  }

  get format() {
    const format = Helpers.nullIfEmpty(this.source.format);
    if (format) {
      return Format[format];
    } else {
      return null;
    }
  }

  get level() {
    const level = Helpers.nullIfEmpty(this.source.experience);
    if (level) {
      return Level[level];
    } else {
      return null;
    }
  }
}

module.exports = Session;