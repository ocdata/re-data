
const path = require('path');
const nanoLib = require('nano');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  COUCH_USER,
  COUCH_PASS,
  COUCH_DBNAME,
} = process.env;


// node-couchdb instance with default options
const nano = nanoLib(`http://${COUCH_USER}:${COUCH_PASS}@localhost:5984/`);
const ocData = nano.db.use(COUCH_DBNAME);

const EVENT_ID = '35c3';
const TRACK_ID2SUBCONF = {
  '35c3-chaoswest':     {
    id: '35c3-chaoswest',
    label: 'Chaos West @ 35C3',
    type: 'subconference',
  },
  '35c3-chaoszone': {
    id: '35c3-chaoszone',
    label: 'Chaoszone @ 35C3',
    type: 'subconference',
  },
  '35c3-komona': {
    id: '35c3-komona',
    label: 'Komona @ 35C3',
    type: 'subconference',
  },
  '35c3-open-infrastructure': {
    id: '35c3-oio',
    label: 'Open Infrastructure Orbit @ 35C3',
    type: 'subconference',
  },
  '35c3-self-organized-sessons': {
    id: '35c3-self-organized-sessions',
    label: 'Self-Organized Sessions',
    type: 'subconference',
  },
  '35c3-sendezentrum': {
    id: '35c3-sendezentrum',
    label: 'Sendezentrum',
    type: 'subconference',
  },
  '35c3-wikipaka': {
    id: '35c3-wikipaka',
    label: 'Wikipaka @ 35C3',
    type: 'subconference',
  },
};

async function findOrCreate(event, object, type) {
  return new Promise(async (resolve, reject) => {
    const mutableObject = object;
    mutableObject.event = event;
    try {
      const found = await findObject(event, object.id, type);
      if (found) {
        resolve(found);
        return;
      } else {
        const result = await ocData.insert(object);
        resolve(object);
      }
    } catch (error) {
      reject(error);
    }
  });
  
}

async function findObject(event, objectId, type) {
  return new Promise((resolve, reject) => {
    ocData.view(
      'data', 
      type,
      { 
        include_docs: true,
        key: [event, objectId],
      }).then(body => {
        const [firstRow] = body.rows;
        if (firstRow) {
          resolve(firstRow.doc);
        } else {
          resolve(null);
        }
      }).catch(error => {
        reject(error);
      });  
  });
}

async function allObjectsOfType(event, type) {
  return new Promise((resolve, reject) => {
    ocData.view(
      'data', 
      type,
      { 
        include_docs: true,
        start_key: [event], end_key: [event, {}],
      }).then(body => {
        resolve(body.rows.map(row => row.doc));
      }).catch(error => {
        reject(error);
      });  
  });
  
}

// processItem(EVENT_ID, 'sessions', (session) => {

// });

const subconferences = Object.values(TRACK_ID2SUBCONF).map(subconference => {
  return findOrCreate(EVENT_ID, subconference, 'subconferences').then(result => {
    console.info('Found or created', subconference.label);
  }).catch(error => {
    console.error(error);
  })
});

Promise.all(subconferences).then(async () => {
  const items = await allObjectsOfType(EVENT_ID, 'sessions');
  let updatedItems = items.filter(session => {
    if (!session.track) return false;
    const subconf = TRACK_ID2SUBCONF[session.track.id];
    if (!subconf) return false;
    if (session.subconference && session.subconference.id === subconf.id) return false;
    return true;
  }).map(item => {
    const updatedItem = item;
    updatedItem.subconference = TRACK_ID2SUBCONF[item.track.id];
    return updatedItem;
  });
  
  console.log('updating items:', updatedItems.length);
  const [firstItem] = updatedItems;
  console.log('Example', firstItem.id);

  if (updatedItems.length > 0) return ocData.bulk({docs: updatedItems});
}).then(result => {
  console.log('Update documents')
})

