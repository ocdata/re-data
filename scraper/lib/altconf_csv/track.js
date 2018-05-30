const Helpers = require('./../helpers');

class Track {
  constructor(name, color = [0.0, 0.0, 0.0, 1.0]) {
    this.id = Helpers.mkId(name);
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

  static get altConf() {
    return new Track('AltConf', [0, 255, 0, 1]);
  }
}

module.exports = Track;
