const Helpers = require('./../helpers');

class Track {
  constructor(name, color = [0.0, 0.0, 0.0, 1.0]) {
    this.id = Helpers.mkId(name);
    this.name = name;
    this.color = color;
  }

  get label_de() {
    return this.name;
  }

  get label_en() {
    return this.name;
  }
}

module.exports = Track;