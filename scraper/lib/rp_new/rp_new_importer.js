const moment = require('moment');

const Helpers = require('./../helpers');
const Session = require('./session');
const Speaker = require('./speaker');
const Location = require('./location');
const Track = require('./track');
const Event = require('./event');
const { Format, Level } = require('./mappings');

class RPNewImporter {
  constructor(event, sessions, speakers, trackColorMap = {}, locationIndices = [], dayNames = {}, dayStartHour = 5) {
    this.source = { event, sessions, speakers, trackColorMap, locationIndices, dayNames };
    this.tracks = {};
    this.locations = {};
    this.speakers = {};
    this.sessions = {};
    this.days = {};
    this.event = new Event(this.source.event);

    this._processDays();
    this._processTracks();
    this._processLocations();
    this._processSpeakers();
    this._processSessions();
    this._processRelations();
  }

  _processDays() {
    this.event.days(this.source.dayNames).forEach(day => {
      this.days[day.id] = day;
    });
  }

  _processTracks() {
    this.source.sessions.forEach(session => {
      // TODO: Color mapping
      const track = new Track(session.topic);
      const color = this.source.trackColorMap[track.id];
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
  }

  _processSpeakers() {
    this.source.speakers.forEach(speakerJSON => {
      const speaker = new Speaker(speakerJSON);
      this.speakers[speaker.id] = speaker;
    });
  }

  _processSessions() {
    this.source.sessions.forEach(sessionJSON => {
      const session = new Session(sessionJSON);
      this.sessions[session.id] = session;
    });
  }

  _processRelations() {
    Object.keys(this.sessions).forEach(sessionId => {
      const session = this.sessions[sessionId];
      session.speakers.forEach(sessionSpeaker => {
        const speaker = this.speakers[sessionSpeaker.id];
        if (speaker) {
          if (!speaker.sessions.find(speakerSession => speakerSession.id === sessionId)) {
            speaker.sessions.push(session);
          }
        }
      });

      // TODO: Add days 
      // TODO: Add sessions to locations
    });
  }
}

module.exports = RPNewImporter;
