const fs = require('fs');
const path = require('path');
const Session = require('../lib/rp_new/session');
const Speaker = require('../lib/rp_new/speaker');
const RPNewImporter = require('../lib/rp_new/rp_new_importer');
const mocha = require('mocha');
const assert = require("chai").assert;


describe('rp_new', () => {
  const sessionsFixtureJson = require('./fixtures/rp18_sessions_sample.json');
  const speakersFixtureJson = require('./fixtures/rp18_speakers_sample.json');
  const eventFixtureJson = require('./fixtures/rp18_event_sample.json');

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
  });
});