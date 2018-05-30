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
    this.begin = moment.tz(json.date[0], this.locations[0].timezone);
    this.end = moment.tz(json.date[1], this.locations[0].timezone);
  }

  days(dayNames = {}) {
    const days = [];
    let day = this.begin;
    do {
      const names = dayNames[day.format('YYYY-MM-DD')];
      const rpday = new Day(day, names);
      days.push(rpday);
      day = day.add(1, 'd');
    } while (!day.isAfter(this.end));
    return days;
  }
}

module.exports = Event;
