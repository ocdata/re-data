const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const Session = require('../lib/rp_new/session');
const Speaker = require('../lib/rp_new/speaker');
const Event = require('../lib/rp_new/event');
const RPNewImporter = require('../lib/rp_new/rp_new_importer');
const mocha = require('mocha');
const assert = require("chai").assert;


describe('rp_new', () => {
  const sessionsFixtureJson = require('./fixtures/rp18_sessions_sample.json');
  const speakersFixtureJson = require('./fixtures/rp18_speakers_sample.json');
  const eventFixtureJson = require('./fixtures/rp18_event_sample.json');

  describe('Event', () => {
    const event = new Event(eventFixtureJson);

    it('should parse basic propertis', () => {
      assert.equal(event.id, 'rp18');
      assert.equal(event.label, 're:publica 18');
      assert.equal(event.hashtag, 'rp18');
      assert.equal(event.title, 're:publica 18 POP');
    });

    it('should parse locations', () => {
      assert.equal(event.locations.length, 1);
      
      const [location] = event.locations;
      assert.equal(location.label, 'Station Berlin');
      assert.equal(location.timezone, 'Europe/Berlin');
    });
  });

  describe('Session', () => {
    const [sessionJson] = sessionsFixtureJson;
    const session = new Session(sessionJson);

    it('should parse main text properties', () => {
      assert.equal(session.title, 'Eigene Angebote in Zeiten von Amazon, YouTube und Netflix - Ist es zu spät für Konkurrenz?');
      assert.equal(session.subtitle, null);
      assert.include(session.abstract, 'Immer mehr Zeit wird in geschlossenen Plattformen und Apps');
      assert.include(session.description, 'Medienunternehmen konkurrieren mit den nahezu unlimitierten Ressourcen');
    });

    it('should parse speaker ids and names', () => {
      assert.equal(session.speakers.length, 2);
      const [firstSpeaker, secondSpeaker] = session.speakers;
      assert.equal(firstSpeaker.id, "15861");
      assert.equal(secondSpeaker.id, "15866");
      assert.equal(firstSpeaker.name, "Katharina Köth");
      assert.equal(secondSpeaker.name, "Robert Richter");
    });

    it('should parse mapping types correctly', () => {
      assert.equal(session.language.id, 'de');
      assert.equal(session.format.id, 'discussion');
      assert.equal(session.level.id, 'everyone');
    })
  });

  describe('Speaker', () => {
    const [speakerJson] = speakersFixtureJson;
    const speaker = new Speaker(speakerJson);

    it('should parse main text properties', () => {
      assert.equal(speaker.id, "15866");
      assert.equal(speaker.name, "Robert Richter");
    });
  });

  describe('RPNewImporter Parser', () => {
    const rpnew = new RPNewImporter(eventFixtureJson, sessionsFixtureJson, speakersFixtureJson);

    it('should parse all sessions', () => {
      const sessionIds = Object.keys(rpnew.sessions);
      assert.equal(sessionIds.length, sessionsFixtureJson.length);

      const session = rpnew.sessions['24826'];
      assert.equal(session.id, '24826');
      assert.equal(session.title, 'Tales of Spatial Transformation: Hybrid Design Practices in the Age of Spatial, Cognitive and Physical Computing');
    });

    it('should parse all speakers', () => {
      const speakerIds = Object.keys(rpnew.speakers);
      assert.equal(speakerIds.length, speakersFixtureJson.length);

      const speaker = rpnew.speakers['15837'];
      assert.equal(speaker.id, '15837');
      assert.equal(speaker.name, 'Javier Soto Morras');
    });

    it('should parse all tracks', () => {
      const trackKeys = Object.keys(rpnew.tracks);
      assert.equal(trackKeys.length, 3);
      
      const track = rpnew.tracks['media-convention-berlin'];
      assert.equal(track.name, "MEDIA CONVENTION Berlin");
    });

    it('should parse all locations', () => {
      const locationKeys = Object.keys(rpnew.locations);
      assert.equal(locationKeys.length, 0);
    });

    it('should parse all days', () => {
      // const dayKeys = Object.keys(rpnew.days);
      // assert.equal(dayKeys.length, 3);

      // const day1 = rpnew.days['2018-05-02'];
      // assert.equal(day1.date, moment('2018-05-02'));
    });
  });
});