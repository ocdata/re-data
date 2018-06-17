const Helpers = require('./../helpers');

class Location {
  static fromSessionJson(json, orderIndex = 1000, isStage = true) {
    const { data } = json;
    const { stage } = data;
    const { name, slug } = stage;
    return new Location(slug, name, orderIndex, isStage);
  }

  constructor(id, name, orderIndex = 1000, isStage = true) {
    this.isStage = isStage;

    this.label_de = name;
    this.label_en = name;
    this.id = id;
    this.orderIndex = orderIndex;
  }

  get miniJSON() {
    return {
      id: this.id,
      label_de: this.label_de,
      label_en: this.label_en,
    };
  }

  get JSON() {
    const result = this.miniJSON;
    result.order_index = this.orderIndex;
    result.floor = 0;
    result.is_stage = this.isStage;
    return result;
  }
}

module.exports = Location;
