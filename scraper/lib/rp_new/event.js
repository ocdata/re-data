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
    this.begin = moment(json.date[0]);
    this.end = moment(json.date[1]);
    this.locations = json.locations.map(locationJSON => new EventLocation(locationJSON));
  }

  days(names = {}) {
    let days = [];
    let day = this.begin;
    do {
      const name = names[day.format('YYYY-MM-DD')];
      const rpday = new Day(day, name);
      days.push(rpday);
      day = day.add(1, 'd');
    } while (!day.isAfter(this.end));
    return days;
  }
}

module.exports = Event;
