// HALFNARP - Recomendations

function recommendedSessions(halfnarp, frapSessions) {
  let validSessionIds = [];
  frapSessions.schedule.conference.days.forEach((confDay) => {
    confDay.rooms.forEach((roomName) => {
      const sessions = confDay.rooms[roomName];
      const ids = sessions.map(session => session.id);

      validSessionIds = validSessionIds.concat(ids);
    });
  });

  // Store all classified sessions for each
  const result = {};
  const sessions = halfnarp;

  sessions.forEach((session) => {
    const sessionId = mkID(`${session.event_id}`);
    let recommedations = [];
    for (otherSession of sessions) {
      if (
        session.event_id === otherSession.event_id ||
        validSessionIds.indexOf(otherSession.event_id) === -1
      ) {
        continue;
      }

      const distance = halfnarpEventDistance(session, otherSession);
      if (distance) {
        recommedations.push({
          title: otherSession.title,
          id: mkID(`${otherSession.event_id}`),
          distance,
        });
      }
    }

    recommedations = recommedations
      .sort((a, b) => a.distance - b.distance)
      .filter(a => a.distance < 100)
      .map((a) => ({
          title: a.title,
          id: a.id
        }));

    result[sessionId] = recommedations.slice(0, 5);
  });

  return result;
}

function halfnarpEventDistance(sessionA, sessionB) {
  let distance = 0;
  const aClassifiers = Object.keys(sessionA.event_classifiers);
  if (aClassifiers.length == 0) {
    console.log(sessionA);
    return null;
  }

  for (classifier in sessionA.event_classifiers) {
    const aWeight = sessionA.event_classifiers[classifier];
    let bWeight = sessionB[classifier];
    if (!bWeight) bWeight = -10;

    distance += Math.abs(aWeight - bWeight);
  }

  for (classfier in sessionB.event_classifiers) {
    if (aClassifiers.indexOf(classifier)) {
      continue;
    }

    distance = distance + sessionB.event_classifiers[classifier] + 5;
  }

  if (sessionA.track_id === sessionB.track_id) {
    distance *= 0.95;
  }

  const numberOfClassifiers = Object.keys(sessionA.event_classifiers).length;
  return distance / numberOfClassifiers;
}
