const Helpers = require('./../helpers');

class Speaker {
  static fromJson(json, urlFunction = null, pictureFunction = null) {
    const { id, data, media } = json;
    const {
      title,
      description,
      company,
      position,
      url,
    } = data;
    const { files } = media[0];
    const [pictureUrl] = files.default;

    return new Speaker(`${id}`, title, description, position, company, () => url, () => pictureUrl);
  }

  constructor(id, name, biography, position, organization, urlFunction = null, pictureFunction = null) {
    this.id = id;
    this.name = name;
    this.biography = biography || '';
    this.position = position;
    this.organization = organization;
    this.sessions = [];
    this.urlFunction = urlFunction;
    this.pictureFunction = pictureFunction;
  }

  get JSON() {
    const result = {
      id: this.id,
      name: this.name,
      sessions: [],
      links: [],
      biography: this.biography,
      organization: this.organization,
      position: this.position,
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
