const Helpers = require('./../helpers');

class Location {
  constructor(row, orderIndex = 1000, isStage = false) {
    const [, , , , location] = row;

    this.isStage = isStage;

    this.label_de = location;
    this.label_en = location;
    this.id = Helpers.mkId(location);
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
