const scrapyard = require('scrapyard');
const moment = require('moment');

const Helpers = require('./helpers');
const Session = require('./drupal_new/session');
const Speaker = require('./drupal_new/speaker');
const Location = require('./drupal_new/location');
const Track = require('./drupal_new/track');
const { Format, Level } = require('./drupal_new/mapping');

// Sessions: https://18.re-publica.com/sessions/rest/json
// Speaker: https://18.re-publica.com/speakers/rest/json

class RPNewImporter {
  constructor(event, sessions, speakers, trackColorMap = {}, locationIndices = []) {
    this.source = { event, sessions, speakers, trackColorMap, locationIndices }
    this.tracks = {}
    this.locations = {}
    this.speakers = {}
    this.sessions = {}

    this._processTracks();
  }

  _processTracks() {
    this.source.sessions.forEach(session => {
      // TODO: Color mapping
      const track = new Track(session.topic);
      const color = this.trackColorMap[track.id];
      if (color) {
        track.color = color;
      }
      this.tracks[track.id] = track;
    });
  }

  _processLocations() {
    this.source.sessions.forEach(session => {
      const roomName = Helpers.nullIfEmpty(session.room);
      if (!roomName) return;
      const locationIndex = this.source.locationIndices.indexOf(roomName);
      const location = new Location(roomName);
      if (locationIndex >= 0) {
        location.locationIndex = locationIndex;
      }
      this.locations[location.id] = location;
    });
    // Do nothing for now
  }

  _processSpeakers() {

  }

  _processSessions() {
   
    // add sessions to speakers
  }
}