// HALFNARP - Recomendations

function recommendedSessions(halfnarp, frapSessions) {
  let validSessionIds = [];
  for (confDay of frapSessions.schedule.conference.days) {
    for (roomName in confDay.rooms) {
      let sessions = confDay.rooms[roomName];
      let ids = sessions.map(session => session.id);

      validSessionIds = validSessionIds.concat(ids);
    }
  }

  // Store all classified sessions for each
  let result = {};
  let sessions = halfnarp;

  for (session of sessions) {
    let sessionId = mkID(`${session.event_id}`);
    let recommedations = [];
    for (otherSession of sessions) {
      if (
        session.event_id === otherSession.event_id ||
        validSessionIds.indexOf(otherSession.event_id) === -1
      ) {
        continue;
      }

      let distance = halfnarpEventDistance(session, otherSession);
      if (distance) {
        recommedations.push({
          title: otherSession.title,
          id: mkID(`${otherSession.event_id}`),
          distance: distance
        });
      }
    }

    recommedations = recommedations
      .sort((a, b) => {
        return a.distance - b.distance;
      })
      .filter(a => a.distance < 100)
      .map(a => {
        return {
          title: a.title,
          id: a.id
        };
      });

    result[sessionId] = recommedations.slice(0, 5);
  }

  return result;
}

function halfnarpEventDistance(sessionA, sessionB) {
  let distance = 0;
  let aClassifiers = Object.keys(sessionA.event_classifiers);
  if (aClassifiers.length == 0) {
    console.log(sessionA);
    return null;
  }

  for (classifier in sessionA.event_classifiers) {
    let aWeight = sessionA.event_classifiers[classifier];
    let bWeight = sessionB[classifier];
    if (!bWeight) bWeight = -10;

    distance = distance + Math.abs(aWeight - bWeight);
  }

  for (classfier in sessionB.event_classifiers) {
    if (aClassifiers.indexOf(classifier)) {
      continue;
    }

    distance = distance + sessionB.event_classifiers[classifier] + 5;
  }

  if (sessionA.track_id === sessionB.track_id) {
    distance = distance * 0.95;
  }

  let numberOfClassifiers = Object.keys(sessionA.event_classifiers).length;
  return distance / numberOfClassifiers;
}