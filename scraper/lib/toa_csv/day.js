const moment = require('moment-timezone');

class Day {
  constructor(daydate, names = null) {
    const date = moment(daydate);
    this.date = date;
    this.id = date.format('YYYY-MM-DD');
    this.names = names;
    if (!this.names) {
      this.names = { de: this.date, en: this.date };
    }
  }

  get JSON() {
    return {
      id: this.id,
      label_de: this.names.de,
      label_en: this.names.en,
      date: this.date.format('YYYY-MM-DD'),
    };
  }

  get miniJSON() {
    return this.JSON;
  }
}

module.exports = Day;
