const moment = require('moment-timezone');
const Helpers = require('./../helpers');
const { Language, Format, Level } = require('./mappings');
const Link = require('./link');

class Session {
  constructor(json, urlFunction = undefined, subconferenceFunction = undefined, timezone = 'Etc/UTC') {
    this.source = json;
    this.urlFunction = urlFunction;
    this.subconferenceFunction = subconferenceFunction;
    this.timezone = timezone;
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
    })
    return result.filter(s => s.id != null && s.name != null);
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
    if (!match) return null;
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
    if (!this.source.datetime_start) return null;
    const [firstDateTime] = this.source.datetime_start.split(',');
    const beginStr = Helpers.nullIfEmpty(firstDateTime);
    if (beginStr) {
      const begin = moment(`${beginStr}Z`, moment.ISO_8601);
      return begin.isValid() ? begin : null;
    }
    return null;
  }

  get end() {
    if (!this.source.datetime_end) return null;
    const [firstDateTime] = this.source.datetime_end.split(',');
    const endStr = Helpers.nullIfEmpty(firstDateTime);
    if (endStr) {
      const end = moment(`${endStr}Z`, moment.ISO_8601);
      return end.isValid() ? end : null;
    }
    return null;
  }

  get location() {
    const room = Helpers.nullIfEmpty(this.source.room);
    const roomId = Helpers.nullIfEmpty(this.source.room_nid);
    if (!room || !roomId) return null;
    return {
      label_de: room,
      label_en: room,
      id: roomId,
    };
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
    if (this.willBeRecorded) {
      json.will_be_recorded = this.willBeRecorded;
    }
    json.related_sessions = [];

    json.links = [];
    if (this.streamLink) {
      json.links.push(this.streamLink.JSON);
    }

    if (this.recordingLink) {
      json.links.push(this.recordingLink.JSON);
    }

    // if (this.source.video) {
    //   const ytregex = /^https?\:\/\/www\.youtube\.com\/watch\?v=(.+)$/i;
    //   const match = this.source.video.match(ytregex);
    //   if (match && match[1]) {
    //     const vid = match[1];
    //     const ytrecording = {
    //       thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
    //       title: json.title,
    //       url: `https://www.youtube.com/v/${vid}`,
    //       service: 'youtube',
    //       type: 'recording',
    //     };
    //     json.links.push(ytrecording);
    //   }
    // }

    // const link = new Link('https://www.twitch.tv/gattaigames', 'recording', 'test 123');
    // json.links.push(link.JSON);
    json.enclosures = [];
    if (this.streamEnclosure) {
      const enclosure = this.streamEnclosure;
      json.enclosures.push(enclosure.JSON);
    }

    json.location = this.location;
    if (this.urlFunction) {
      json.url = this.urlFunction(this);
    }

    if (this.subconferenceFunction) {
      json.subconference = this.subconferenceFunction(this, this.source);
    }
    
    return json;
  }
}

module.exports = Session;
