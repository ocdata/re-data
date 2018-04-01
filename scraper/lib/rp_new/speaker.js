const Helpers = require('./../helpers');

class Speaker {
  constructor(json) {
    this.source = json;
    this.sessions = [];
  }

  get id() {
    return this.source.uid;
  }

  get name() {
    return this.source.name;
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
    };
    if (this.sessions) {
      result.sessions = this.sessions.map(session => session.miniJSON);
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
