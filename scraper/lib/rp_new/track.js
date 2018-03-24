const Helpers = require('./../helpers');

class Track {
  constructor(name, color = [0.0, 0.0, 0.0, 1.0]) {
    this.id = Helpers.mkId(name);
    this.name = name;
    this.color = color;
  }

  get json() {
    return {
      id: this.id,
      label_de: this.name,
      label_en: this.name,
      color: this.color,
    }
  }
}

module.exports = Track;