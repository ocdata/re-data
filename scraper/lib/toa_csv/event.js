const moment = require('moment-timezone');
const Day = require('./day');

class EventLocation {
  constructor(json) {
    this.label = json.label;
    this.timezone = json.timezone;
    if (json.coords) {
      [this.lat, this.lng] = json.coords;
    }
  }
}

class Event {
  constructor(json) {
    this.id = json.id;
    this.label = json.label;
    this.title = json.title;
    this.url = json.url;
    this.hashtag = json.hashtag;
    this.locations = json.locations.map(locationJSON => new EventLocation(locationJSON));
    this.timezone = this.locations[0].timezone;
    this.begin = moment.tz(json.date[0], this.timezone);
    this.end = moment.tz(json.date[1], this.timezone);
  }

  days(dayNames = {}) {
    const days = [];
    const day = moment.tz(this.begin, this.timezone);
    const endDay = moment.tz(this.end, this.timezone);
    endDay.add(1, 'd');
    do {
      const names = dayNames[day.format('YYYY-MM-DD')];
      const rpday = new Day(day, names);
      days.push(rpday);
      day.add(1, 'd');
    } while (!day.isAfter(endDay));
    return days;
  }
}

module.exports = Event;
