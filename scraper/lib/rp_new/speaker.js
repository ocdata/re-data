const Helpers = require('./../helpers');
const Link = require('./link');

class Speaker {
  constructor(json, urlFunction = null, pictureFunction = null) {
    this.source = Helpers.deleteEmptyStringValues(json);
    this.sessions = [];
    this.urlFunction = urlFunction;
    this.pictureFunction = pictureFunction;
  }

  get id() {
    return this.source.uid;
  }

  get name() {
    return Helpers.dehtml(this.source.name);
  }

  get organization() {
    return Helpers.dehtml(this.source.organization);
  }

  get position() {
    return this.source.position.length > 0 ? this.source.position : null;
  }

  get biography() {
    return this.source.bio;
  }

  get JSON() {
    const result = {
      id: this.id,
      name: this.name,
      sessions: [],
      links: [],
    };
    if (this.urlFunction) {
      result.url = this.urlFunction(this);
    }
    if (this.sessions) {
      result.sessions = this.sessions.map(session => session.miniJSON);
    }
    if (this.pictureFunction) {
      result.photo = this.pictureFunction(this);
    }
    result.biography = Helpers.dehtml(this.source.bio);
    result.position = Helpers.dehtml(this.source.position);
    result.organization = Helpers.dehtml(this.source.organization);

    if (this.source.links) {
      const allLinks = this.source.links.split(', ');
      result.links = allLinks.map((linkStr) => {
        if (linkStr.match(/^<a href="(https?:\/\/.+)">(.+)<\/a>$/i) && RegExp.$1) {
          return new Link(
            RegExp.$1,
            'speaker-link',
            RegExp.$2,
          ).JSON;
        }
        return null;
      }).filter(link => link);
    }
    return result;
  }

  get miniJSON() {
    return {
      id: this.id,
      name: this.name,
    };
  }
}

module.exports = Speaker;
