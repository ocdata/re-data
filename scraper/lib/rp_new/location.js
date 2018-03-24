const Helpers = require('./../helpers');

class Location {
  constructor(name, orderIndex=1000, isStage=false) {
    this.is_stage = isStage;
    this.label_de = name;
    this.label_en = name;
    this.id = Helpers.mkId(name);
  }

  get miniJSON() {
    return {
      id: this.id,
      label_de: this.label_de,
      label_en: this.label_en,
    }
  }
}

module.exports = Location;
