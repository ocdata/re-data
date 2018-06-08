const Helpers = require('./../helpers');

class Track {
  constructor(name, id = null, color = [0.0, 0.0, 0.0, 1.0]) {
    this.id = id || Helpers.mkId(name);
    this.name = Helpers.dehtml(name);
    this.color = color;
  }

  get JSON() {
    return {
      id: this.id,
      label_de: this.name,
      label_en: this.name,
      color: this.color,
    };
  }

  get miniJSON() {
    return {
      id: this.id,
      label_de: this.name,
      label_en: this.name,
    };
  }

  static get toa() {
    return new Track('Tech Open Air', 'toa');
  }

  static get all() {
    const all = {};
    all[Track.toa.id] = Track.toa;
    return all;
  }
}

module.exports = Track;
