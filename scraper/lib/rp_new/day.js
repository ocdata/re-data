const moment = require('moment-timezone');

class Day {
  constructor(daydate, name=null) {
    const date = moment(daydate);
    this.date = date;
    this.id = date.format('YYYY-MM-DD');
    this.name = name;
  }

  get JSON() {
    return {
      id: this.id,
      label_de: this.name,
      label_en: this.name,
      date: this.date.format('YYYY-MM-DD'),
    }
  }
}

module.exports = Day;
