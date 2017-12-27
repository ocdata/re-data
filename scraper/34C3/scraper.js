/* get node modules */
var fs = require('fs');
var path = require('path');
var eventId = "34c3";

/* get npm modules */
var scrapyard = require('scrapyard');
var http = require('http');
var moment = require('moment');
var ent = require('ent');
var cheerio = require('cheerio');
var sanitizeHtml = require('sanitize-html');
var parseCSV = require('csv-parse');
var async = require('async');
var md5 = require('MD5');
var ical = require('ical');
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var icalendar = require('icalendar');

var log = require(path.resolve(__dirname, '../../api/lib/log.js'));
var json_requester = require('../lib/json_requester');

var additional_schedule_url = "http://data.conference.bits.io/data/34c3/voc/workshops.schedule.json";
// var dlf_schedule_url = "http://data.c3voc.de/34C3/workshops.schedule.json";
var sendezentrum_schedule_url = "https://frab.das-sendezentrum.de/de/34c3/public/schedule.json";
var sendezentrum_speaker_url = "https://frab.das-sendezentrum.de/de/34c3/public/speakers.json";
var schedule_url = "https://fahrplan.events.ccc.de/congress/2017/Fahrplan/schedule.json";//"http://data.conference.bits.io/data/32c3/schedule.json"; //
var speakers_url =  "https://fahrplan.events.ccc.de/congress/2017/Fahrplan/speakers.json"; // "http://data.conference.bits.io/data/32c3/speakers-frap.json";  //

var voc_streams_api_url = "https://streaming.media.ccc.de/streams/v1.json";
var poi_titles_url = "https://github.com/NoMoKeTo/c3nav/raw/master/src/projects/34c3/titles.json";
// var pois = "https://raw.githubusercontent.com/NoMoKeTo/c3nav/master/src/projects/34c3/pois.json";
var poi_graph_url = "https://raw.githubusercontent.com/NoMoKeTo/c3nav/master/src/projects/34c3/graph.json";

// CSV data
var lounge_session_csv_data = fs.readFileSync(__dirname + "/party_lounge.csv");
var chill_out_lounge_csv_data = fs.readFileSync(__dirname + "/34c3_4Floor_ChillOut_LineUp.csv");

var dome_lounge_csv_data = fs.readFileSync(__dirname + "/dome.csv");
 //"https://gist.githubusercontent.com/MaZderMind/d5737ab867ade7888cb4/raw/bb02a27ca758e1ca3de96b1bf3f811541436ab9d/streams-v1.json"
// later at https://streaming.media.ccc.de/streams/v1.json

// for debugging we can just pretend rp14 was today
var originalStartDate = new Date(Date.UTC(2015, 11, 27, 10, 0, 0, 0));
var fakeDate = originalStartDate; // new Date(Date.UTC(2015, 11, 23, 16, 0, 0, 0));
var sessionStartDateOffsetMilliSecs = fakeDate.getTime() - originalStartDate.getTime();

var dayYearChange = 0;
var dayMonthChange = 0;
var dayDayChange = 0;

// console.log("Real date: " + originalStartDate);
// console.log("Fake date: " + fakeDate);


// http://hls.stream.c3voc.de/hls/sN_L_Q.m3u8
// N ∈ [1;5], L ∈ {native, translated}, Q ∈ {hd, sd, slides}.

var sortOrderOfLocations = [
    '34c3-saal-adams',
    '34c3-saal-borg',
    '34c3-saal-g',
    '34c3-saal-clarke',
	'34c3-saal-dijkstra',
	mkID("Lecture room 11"),
    mkID("Seminar room 14-15"),
    mkID("Lecture room 12"),
    mkID("Seminar room 13"),
    mkID("CCL Hall 3"),
    mkID("Chaos West Stage"),
    mkID("Hive Stage"),
    mkID("Komona Aquarius"),
    mkID("Komona Coral Reef"),
    mkID("Komona D.Ressrosa"),
    mkID("Komona Blue Princess"),
    mkID("Kidspace")
];

// to map VOC API output to our rooms
var vocSlugToLocatonID = {
    "Saal Adams": mkID("saal-adams"),
    "Saal Borg": mkID("saal-borg"),
    "Saal Clarke": mkID("saal-clarke"),
    "Saal Dijkstra": mkID("saal-dijkstra")
};

var locationNameChanges = {
    //"34c3-sendezentrumsb-hne": "Sendezentrum",
    //"34c3-podcastingtisch": "Podcasttisch"
};

var poi2locationMapping = {
    //"34c3-h1": mkID("saal-1")
};

var additionalLocations = [
    // {
    //     "id": mkID("party-lounge"),
    //     "label_de": "Lounge",
    //     "label_en": "Lounge",
    //     "is_stage": false
    // },
    // {
    //     "id": mkID("anti-error-lounge-loc"),
    //     "label_de": "Chillout Lounge",
    //     "label_en": "Chillout Lounge",
    //     "is_stage": false
    // },
    // {
    //     "id": mkID("dome-loc"),
    //     "label_de": "Dome",
    //     "label_en": "Dome",
    //     "is_stage": false
    // }
];

var additionalPOIs = [
    {
        "label_de": "Sendezentrum",
        "label_en": "Sendezentrum",
        "id": mkID("poi-sendezentrum"),
        "category": "session-location",
            "location": {
                "id": "34c3-b-hne",
                "label_de": "Sendezentrum",
                "label_en": "Sendezentrum"
            },
        "hidden": false,
        "positions": [
            {"map": "34c3-map-level1",
             "x": 2969.47265625,
             "y": 1690.3660714285713}

        ],
        "links": [],
        "priority": 100,
        "type": "poi"
    }//,
    // {
  //       "label_de": "POC",
  //       "label_en": "POC",
  //       "id": mkID("poi-poc"),
  //       "category": "service",
  //       "hidden": false,
  //       "positions": [
  //           {"map": "34c3-map-level1",
  //            "x": 3620.558035714286,
  //            "y": 1777.3660714285713
  //           }
  //       ],
  //       "links": [],
  //       "priority": 100,
  //       "type": "poi"
  //   },
  //   {
  //       "label_de": "Anti-Error Lounge",
  //       "label_en": "Anti-Error Lounge",
  //       "id": mkID("poi-anti-error-lounge"),
  //       "category": "entertainment",
  //       "hidden": false,
  //       "positions": [
  //           {"map": "34c3-map-level4",
  //            "x": 2471,
  //            "y": 2335
  //           }
  //       ],
  //       "links": [],
  //       "priority": 100,
  //       "type": "poi"
  //   },
  //   {
  //       "label_de": "Unbezahlbar",
  //       "label_en": "Unbezahlbar",
  //       "id": mkID("unbezahlbar"),
  //       "category": "community",
  //       "hidden": false,
  //       "positions": [
  //           {"map": "34c3-map-level4",
  //            "x": 2391,
  //            "y": 2535
  //           }
  //       ],
  //       "links": [],
  //       "priority": 100,
  //       "type": "poi"
  //   }
];


// Livestream test
var streamURLs = {
	// "camp15-saal-1": "http://hls.stream.c3voc.de/hls/s1_native_hd.m3u8",
};

var testVideoURLs = {
    // "34c3-7415": "http://cdn.media.ccc.de/congress/2014/h264-hd/31c3-6582-de-Das_Transparenzportal_Hamburg_hd.mp4" // Talk:Wie Jugendschutzprogramme nicht nur die Jugend schädigen Video: Das Transparenzportal Hamburg
};

// Security #5057af blue
// Politics #b550bd violett
// Science #45b9b3 turqise
// Hardware #a8563f brown
// Art #b99745 orange
// Failosophy #c0ba59 yellow
// CCC #45b964 green
// Entertainment #45b964 (same as CCC) green
//
// official from https://events.ccc.de/congress/2017/wiki/Static:Design
var blue    = [ 80.0,  87.0, 175.0, 1.0];
var violett = [181.0,  80.0, 189.0, 1.0];
var turquise= [ 69.0, 185.0, 179.0, 1.0];
var brown   = [168.0,  86.0,  63.0, 1.0];
var orange  = [185.0, 151.0,  69.0, 1.0];
var yellow  = [192.0, 186.0,  89.0, 1.0];
var green   = [ 69.0, 185.0, 100.0, 1.0];

// non-official
var red     = [118.0,  26.0,  61.0, 1.0];
var grey    = [110.0,  110.0,  110.0, 1.0];
var black   = [  0.0,   0.0,   0.0, 1.0];
var cream   = [135.0,  81.0,  86.0, 1.0];


var colors = {};
colors[eventId + "-security"] = blue;
colors[eventId + "-ethics-society-politics"] = violett;
colors[eventId + "-science"] = turquise;
colors[eventId + "-hardware-making"] = brown;
colors[eventId + "-art-culture"] = orange;
colors[eventId + "-failosophy"] = yellow;
colors[eventId + "-ccc"] = green;
colors[eventId + "-entertainment"] = green;


colors[eventId + "-self-organized-sessions"] = grey;
colors[eventId + "-podcast"] = red;
colors[eventId + "-sendezentrum"] = red;
colors[eventId + "-other"] = grey;


var allFormats = {
	'discussion': { id:'discussion', label_en:'Discussion' },
	'talk':    { id:'talk',    label_en:'Talk'       },
	'workshop':   { id:'workshop',   label_en:'Workshop'   }
}

var allLevels = {
	'beginner':         { id:'beginner',     label_en:'Beginner'     },
	'intermediate':     { id:'intermediate', label_en:'Intermediate' },
	'advanced':         { id:'advanced',     label_en:'Advanced'     }
};

var allLanguages = {
	'en': { id:'en', label_en:'English' },
	'de': { id:'de', label_en:'German' },
};

var allMaps = {
	'map-level0': {
		'event': eventId,
		'id': eventId + "-map-" + "level0",
		'type': "map",
		'label_de': "Congress Center Hamburg",
		'label_en': "Congress Center Hamburg",
		'floor_label_de': "Erdgeschoss",
		'floor_label_en': "Ground Floor",
		"is_outdoor": true,
		"is_indoor": true,
		"floor": 0,
		"order_index": 0,
		"area": {"width": 1000.0,
		         "height": 530.0},
		"tiles": {
                    "base_url": "http://data.conference.bits.io/maps/34c3/floor0",
                    "large_image_url": "http://data.conference.bits.io/maps/34c3/floor0/mini.png",
                    "tile_size": 512,
                    "tile_file_extension": "png",
                    "size": {"width": 5940,
                             "height": 4320}
                },
	    "pois": []
	},
	'map-level1': {
		'event': eventId,
		'id': eventId + "-map-" + "level1",
		'type': "map",
		'label_de': "Congress Center Hamburg",
		'label_en': "Congress Center Hamburg",
		'floor_label_de': "1. Obergeschoß",
		'floor_label_en': "1st floor",
		"is_outdoor": false,
		"is_indoor": true,
		"floor": 1,
		"order_index": 1,
		"area": {"width": 1000.0,
		         "height": 530.0},
		"tiles": {
                    "base_url": "http://data.conference.bits.io/maps/34c3/floor1",
                    "large_image_url": "http://data.conference.bits.io/maps/34c3/floor1/mini.png",
                    "tile_size": 512,
                    "tile_file_extension": "png",
           "size": {"width": 5940,
                    "height": 4320}
                },
	    "pois": []
	},
	'map-level2': {
		'event': eventId,
		'id': eventId + "-map-" + "level2",
		'type': "map",
		'label_de': "Congress Center Hamburg",
		'label_en': "Congress Center Hamburg",
		'floor_label_de': "2. Obergeschoß",
		'floor_label_en': "2nd floor",
		"is_outdoor": false,
		"is_indoor": true,
		"floor": 2,
		"order_index": 2,
		"area": {"width": 1000.0,
		         "height": 530.0},
		"tiles": {
                    "base_url": "http://data.conference.bits.io/maps/34c3/floor2",
                    "large_image_url": "http://data.conference.bits.io/maps/34c3/floor2/mini.png",
                    "tile_size": 512,
                    "tile_file_extension": "png",
           "size": {"width": 5940,
                    "height": 4320}
                },
	    "pois": []
	},
	'map-level3': {
        'event': eventId,
        'id': eventId + "-map-" + "level3",
        'type': "map",
        'label_de': "Congress Center Hamburg",
        'label_en': "Congress Center Hamburg",
        'floor_label_de': "3. Obergeschoß",
        'floor_label_en': "3rd floor",
        "is_outdoor": false,
        "is_indoor": true,
        "floor": 3,
        "order_index": 3,
        "area": {"width": 1000.0,
                 "height": 530.0},
        "tiles": {
                        "base_url": "http://data.conference.bits.io/maps/34c3/floor3",
                        "large_image_url": "http://data.conference.bits.io/maps/34c3/floor3/mini.png",
                        "tile_size": 512,
                        "tile_file_extension": "png",
               "size": {"width": 5940,
                        "height": 4320}
                    },
        "pois": []
    },
    'map-level4': {
        'event': eventId,
        'id': eventId + "-map-" + "level4",
        'type': "map",
        'label_de': "Congress Center Hamburg",
        'label_en': "Congress Center Hamburg",
        'floor_label_de': "4. Obergeschoß",
        'floor_label_en': "4th floor",
        "is_outdoor": false,
        "is_indoor": true,
        "floor": 4,
        "order_index": 4,
        "area": {"width": 1000.0,
                 "height": 530.0},
        "tiles": {
                        "base_url": "http://data.conference.bits.io/maps/34c3/floor4",
                        "large_image_url": "http://data.conference.bits.io/maps/34c3/floor4/mini.png",
                        "tile_size": 512,
                        "tile_file_extension": "png",
               "size": {"width": 5940,
                        "height": 4320}
                    },
        "pois": []
    }
};



var allPOIs = {};


var data   = [];
var allDays = {

};
var allRooms = {};
var allSpeakers = {};
var allTracks = {};
var allSpeakers = {};

function addEntry(type, obj) {
	obj.event  = eventId;
	obj.type   = type;
	data.push(obj);
}

function alsoAdd(type, list) {
	Object.keys(list).forEach(function (key) {
		var obj   = clone(list[key]);
		obj.event = eventId;
		obj.type  = type;
		data.push(obj);
	})
}

function mkID(string) {
	return eventId + "-" + string.toString().replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
}

function mkID(string, prefix) {
	if (prefix == undefined) return eventId + "-" + string.toString().replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
	return eventId + "-" + prefix + "-" + string.toString().replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
}

function parseDay(dayXML) {
	var date = dayXML.date;
    // console.log("parsing: ", dayXML);

	var comps = date.split("-");
	var parseDate = new Date(date);
	parseDate.setUTCFullYear(parseDate.getUTCFullYear() + dayYearChange);
	parseDate.setUTCMonth(parseDate.getUTCMonth() + dayMonthChange);
	parseDate.setUTCDate(parseDate.getUTCDate() + dayDayChange);


	var dateLabelDe = date;
	var dateLabelEn = date;

	var index = 0;
	var monthDay = parseDate.getUTCDate();
	switch (monthDay) {
	case 27:
		index = 1;
		dateLabelDe = "Tag 1";
		dateLabelEn = "Day 1";
		break;
	case 28:
		index = 2;
		dateLabelDe = "Tag 2";
		dateLabelEn = "Day 2";
		break;
	case 29:
		index = 3;
		dateLabelDe = "Tag 3";
		dateLabelEn = "Day 3";
		break;
	case 30:
		index = 4;
		dateLabelDe = "Tag 4";
		dateLabelEn = "Day 4";
		break;
	default:
		return null;
	}

	var id = mkID(index);

	var day = {
	    "id": id,
	    "event": eventId,
	    "type": "day",
	    "label_en": dateLabelEn,
	    "label_de": dateLabelDe,
		"date": date
	};
    // console.log("DAY   ", day);
    return day;
}

function parseSpeaker(speakerJSON, imageURLPrefix) {
	var bio = "";
	if (speakerJSON.abstract) {
		bio = speakerJSON.abstract;
	}
	if (speakerJSON.description) {
		bio = bio + "\n\n" + speakerJSON.description;
	}

	var links = [];

	if (speakerJSON.links) {
		speakerJSON.links.forEach(function (link) {
            var url = link.url
            if (url.indexOf("http") != 0) {
                 url = "http://" + url;
            }
			links.push({"url": url,
				        "title": link.title,
				        "service": "web",
				        "type": "speaker-link"});
		});
	}

	var result = {
		"id": mkID(speakerJSON.full_public_name),
		"type": "speaker",
		"event": eventId,
		"name": speakerJSON.full_public_name,
		"biography": bio,
		"links": links,
		"sessions": [] // fill me later
	};

	// de-htmlize
	// console.log(bio);
	// $ = cheerio.load(bio);
	result["biography"] = sanitizeHtml(bio, {allowedTags: []});

	// sys.puts(sys.inspect(handler.dom, false, null));


	var imageHost = imageURLPrefix;
	if (speakerJSON.photo) {
		result['photo'] = speakerJSON.photo;
	}
	if (speakerJSON.image) {
		var path = speakerJSON.image;
		path = path.replace(/\/medium\//,'/large/');
		result['photo'] = imageHost + path;
	}
	return result;
};

function parseRoom(roomName, index, namePrefix) {

	var roomName = roomName;
	if (namePrefix != null) {
		roomName = namePrefix + roomName;
	}

    var id = mkID(roomName);

    // change some names
    var newName = locationNameChanges[id];
    if (newName) {
        roomName = newName;
    }

    return {
      "id": id,
      "label_en": roomName,
      "label_de": roomName,
      "is_stage": roomName.toString().match(/Stage/i) ? true : false,
      "floor": 0,
      "order_index": index,
      "event": eventId,
      "type": "location"
    };
};

function generateIcalData(allSessions) {
	var ical = new icalendar.iCalendar();

	allSessions.forEach(function (session) {
		var event = new icalendar.VEvent(session.id);
		event["TZID"] = "Europe/Berlin";
		var summary = session.title;
		if (session.subtitle) {
			summary = summary + " – " + session.subtitle
		}
		event.setSummary(summary);

		var description = "";
		if (session.abstract && session.description) {
			description = session.abstract + "\n\n" + session.description;
		} else if (session.abstract) {
			description = session.abstract;
		} else if (session.description) {
			description = session.description;
		}
		event.setDescription(description);

        if (session.location) {
            event.setLocation(session.location.label_en);
        }
		event.setDate(session.begin, session.end);

		ical.addComponent(event);
	});

	var filepath = __dirname + "/../../web/data/" + eventId + "/sessions.ics";
	filepath = path.normalize(filepath);
	fs.writeFile(filepath, ical.toString(), function (err) {
	});
};

function parseDate(dateString) {
	var date = new Date(dateString);
	var newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
	date.setTime(newMillis);

	return date;
};

function parseEnd(dateString, durationString) {
    var dayChange = 4
	var eventDate = new Date(dateString);
	var time = eventDate.getTime() / 1000;
	var match = durationString.toString().match(/(\d?\d):(\d\d)/);
	var hours = new Number(match[1]);
	var minutes = new Number(match[2]);
	var seconds = time + (minutes * 60.0) + (hours * 60.0 * 60.0);
    var date = new Date(seconds * 1000);
	var newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
	date.setTime(newMillis);

    if (date.getTime() <= eventDate.getTime()) {
        date.setTime(eventDate.getTime() + (1000 * 3600));
    }

    // if the event starts on day 1 but ends on day 2 after day change,
    // cap it to day change
    if (eventDate.getUTCDate() < date.getUTCDate() &&
        date.getUTCHours() > dayChange )
    {
        date.setUTCHours(dayChange - 1);
        date.setUTCDate(eventDate.getUTCDate() + 1);
    }

    // if the event starts before day change but ends after, normalize it's end
    // to day change
    if (eventDate.getUTCHours() <= dayChange && date.getUTCHours() > dayChange) {
        date.setUTCHours(dayChange - 1);
    }

	return date;
}

function parseTrackFromEvent(eventXML, defaultTrack) {
	var trackName = eventXML.track;
    // if no track name is given we just return the default
	if (trackName == null) {
	    return defaultTrack;
	}
	// console.log(trackName);
	var id = mkID(trackName);
	var color = colors[id];
	if (!color) {
		color = [109.0, 109.0, 109.0, 1.0]; // grey by default
	}
	return {
		"id": id,
		"color":  color,
		"label_en": trackName.toString(),
        "label_de": trackName.toString()
	};
};

function normalizeXMLDayDateKey(date, begin) {
	var parseDate = new Date(date);
	parseDate.setUTCFullYear(parseDate.getUTCFullYear() + dayYearChange);
	parseDate.setUTCMonth(parseDate.getUTCMonth() + dayMonthChange);
	parseDate.setUTCDate(parseDate.getUTCDate() + dayDayChange);

    // if this is for a session we sanatize the date in case of strange input
    if (begin) {
        // if (begin.getUTCDate() != parseDate.getUTCDate() ||
        //     begin.getUTCMonth() != parseDate.getUTCMonth() ||
        //     begin.getUTCDate() != parseDate.getUTCDate())
        // {
            // TODO: get day begin as input
            if (begin.getHours() >= 9) {
                // this is ok only if the session is very early, so we return the date from begin
                var realBegin = "" + begin.getUTCFullYear() + "-" + (begin.getUTCMonth() + 1)  + "-" + begin.getUTCDate();

                // log.warn("Given 'day' date and 'begin' date of the session don't match and this is not an early morning session! date says:", parseDate, " vs begin:", begin, " returning ", realBegin);

                return realBegin;
            } else if (begin.getHours() >= 5) {
                // this is ok only if the session is very early, so we return the date from begin
                var realBegin = "" + begin.getUTCFullYear() + "-" + (begin.getUTCMonth() + 1)  + "-" + (begin.getUTCDate() - 1);

                log.warn("Session is to early, returning ", realBegin, " as begin date instead of ", parseDate, " begin: ", begin);

                return realBegin;
            }
        // }
    }

	// console.log("normalized " + date );
	date = "" + parseDate.getUTCFullYear() + "-" + (parseDate.getUTCMonth() + 1)  + "-" + parseDate.getUTCDate();
	// console.log("to " + date );

	return date;

}

function parseEvent(event, day, room, locationNamePrefix, trackJSON, streamMap, idPrefix, linkMakerFunction) {
	var links = [];
	var id = mkID(event["id"]);
	if (typeof(idPrefix) == "string") {
		id = mkID(event["id"], idPrefix);
	}
    var linkFunction = linkMakerFunction;
    if (linkFunction == null) {
        linkFunction = function (session, sourceJSON) {
			if (!event["id"]) return "https://fahrplan.events.ccc.de/congress/2017/Fahrplan/";
            return "https://fahrplan.events.ccc.de/congress/2017/Fahrplan/events/" + event["id"] + ".html";
        };
    }

	event.links.forEach(function (link) {
		var url = null;
		var title = null;
		if (typeof(link) === "string") {
            url = link;
            title = link;
		} else if (typeof(link) === "object" && link["title"] && link["url"]) {
			title = link["title"];
			url = link["url"];
		}
		if (typeof(url) == "string" && url.indexOf("//") == 0) {
			url = "http:" + url;
		}
        if (typeof(url) == "string" && !(url.indexOf("http://") == 0) && !(url.indexOf("https://") == 0)) {
            url = "http://" + url;
        }

		links.push({
			"title": title,
			"url": url,
			"type": "session-link"
		});

	});

	var begin = parseDate(event.date);

	// Make sure day change is at 5 in the morning
	var hourOffset = 1;
	var hours = begin.getUTCHours() + hourOffset;

	var time = new Date(2017, 11, 27);
	if (begin.getTime() < time.getTime()) {
		console.log("No valid begin: " + begin);
		return null;
	}

	var dayKey = normalizeXMLDayDateKey(day["date"], begin);
	var eventTypeId = event.type.toString();
	if (eventTypeId == 'lecture') {
		eventTypeId = 'talk';
	} else if (eventTypeId == 'other') {
		eventTypeId = 'talk';
	} else if (eventTypeId == 'meeting') {
		eventTypeId = 'workshop';
	}

	var day = allDays[dayKey];

	if (!day) {
		console.log("No valid day for " + event.title.toString() + " " + dayKey);
		return null;
	}

	var track = event.track;
	if (track == null) track = "Other";

	var locationNameDe = allRooms[room.id]["label_de"];
	var locationNameEn = allRooms[room.id]["label_en"];
	if (locationNamePrefix != null) {
		locationNameDe = locationNamePrefix + locationNameDe;
		locationNameEn = locationNamePrefix + locationNameEn;
	}

    if (event.id.toString() == "1103") {
        console.log("Event: ", event);

    }

	var session = {
		"id": id, // Do not use GUID so we keep in line with Halfnarp IDs
		"title": event.title.toString(),
		"abstract": sanitizeHtml(event.abstract.toString(), {allowedTags: []}),
		"description": sanitizeHtml(event.description.toString(), {allowedTags: []}),
		"begin": begin,
		"end": parseEnd(event.date, event.duration),
		"track": {"id": trackJSON.id, "label_de": trackJSON.label_de, "label_en": trackJSON.label_en},
		"day": day,
		"format": allFormats[eventTypeId],
		"level": allLevels['advanced'],
		"lang": allLanguages[event.language.toString() != null ? event.language.toString() : 'en'],
		"speakers": [], // fill me later
		"enclosures": [], // fill me later
		"links": links
	};

	if (session.title.match(/\bcancelled\b/i) || session.title.match(/\babgesagt\b/i)) {
		session["cancelled"] = true;
	} else {
		session["cancelled"] = false;
	}

    if (allRooms[room.id] != undefined && allRooms[room.id]["id"] != mkID("")) {
        session["location"] = {
            "id": allRooms[room.id]["id"],
            "label_de": allRooms[room.id]["label_de"],
            "label_en": allRooms[room.id]["label_en"]
        };

		var recordingLocationIds= [];





		var locationId = session["location"]["id"];
		var willBeRecorded = undefined;
		if (event["do_not_record"] == true) {
			willBeRecorded = false;
		} else if (toArray(vocSlugToLocatonID).indexOf(locationId) != -1) {
			willBeRecorded = true;
		}

		session["will_be_recorded"] = willBeRecorded;
    }

	if (!session.format) {
		log.warn("Session " + session.id + " (" + session.title + ") has no format")
		session["format"] = allFormats['talk'];
	}

	if (!session.lang){
		session.lang = allLanguages['en'];
	}

	if (event.subtitle.toString() != "") {
		session["subtitle"] = event.subtitle.toString();
	}

	// HACK: Fake one video for App Review
	var testVideoURL = testVideoURLs[session.id];
	if (testVideoURL) {
		session.enclosures.push({
			"url": testVideoURL,
			"mimetype": "video/mp4",
			"type": "recording",
			"thumbnail": "http://static.media.ccc.de/media/congress/2013/5490-h264-iprod_preview.jpg"
		});
	}

    if (session.location) {
        var stream = streamMap[session.location.id];
        if (stream) {
    		session.enclosures.push(stream);
        }
    }

    if (session.location) {
	    var streamURL = streamURLs[session.location.id];
	    if (streamURL) {
	    	session.enclosures.push({
	    		"url": streamURL,
	    		"mimetype": "video/mp4",
	    		"type": "livestream"
	    	});
	    }
    }

	session.url = linkFunction(session, event);

	return session;
};


function handleResult(events, speakers, eventRecordings, locationNamePrefix, defaultTrack, speakerImageURLPrefix, streamMap, idPrefix, linkMakerFunction) {

	speakers.forEach(function (speaker) {
		var speakerJSON = parseSpeaker(speaker, speakerImageURLPrefix);

		if (allSpeakers[speakerJSON.id]) {
            var speaker = allSpeakers[speakerJSON.id];
            // ["links", "sessions"].forEach(function(item){
            //     // concat + uniq
            //     var concated = speaker[item].concat(speakerJSON[item]);
            //
            //     speakerJSON[item] = concated.filter(function(elem, pos) {
            //         return concated.indexOf(elem) == pos;
            //     });
            // });
            ["biography",  "photo"].forEach(function (item) {
                // if the old thing has be
                if (speaker[item] && speakerJSON[item] && speaker[item].length > speakerJSON[item].length) {
                    speakerJSON[item] = speaker[item];
                } else {
                    speaker[item] = speakerJSON[item];
                }

            });
            // var result = {
            //     "id": mkID(speakerJSON.full_public_name),
            //     "type": "speaker",
            //     "event": eventId,
            //     "name": speakerJSON.full_public_name,
            //     "biography": bio,
            //     "links": links,
            //     "sessions": [] // fill me later
            // };
        }

		allSpeakers[speakerJSON.id] = speakerJSON;
	});

	events.schedule.conference.days.forEach(function(day) {
		// Day
		// ---
   		var dayJSON = parseDay(day);
		if (dayJSON) {
			var key = normalizeXMLDayDateKey(dayJSON.date);
			allDays[key] = dayJSON;
		}
	});
	events.schedule.conference.days.forEach(function(day) {
   	 	var roomIndex = 0;
		var rooms = day.rooms;
		Object.keys(rooms).forEach(function (roomLabel) {
			// Room
			// ----
			var roomJSON = parseRoom(roomLabel, roomIndex, locationNamePrefix);
			allRooms[roomJSON.id] = roomJSON;
			roomIndex++;

            additionalLocations.forEach(function (locationJSON) {
                allRooms[locationJSON.id] = locationJSON;
            });

			var events = rooms[roomLabel];
			events.forEach(function (event) {
				// Track
				// -----
				var trackJSON = parseTrackFromEvent(event, defaultTrack);
                if (parseTrackFromEvent.id == trackJSON.id) {
                    console.log("!!!! DEFAULT TRACK FOR ", event.title);
                }
				allTracks[trackJSON.id] = trackJSON;

			 	// Event
				// -----
				var eventJSON = parseEvent(event, day, roomJSON, locationNamePrefix, trackJSON, streamMap, idPrefix, linkMakerFunction);
                // if event could not be parse skip it
				if (eventJSON == null) return;

				// Event Speakers
				// --------------
				event.persons.forEach(function (person) {
                        var publicName = person["public_name"];
                        if (publicName == undefined) return;

   						var personID = mkID(publicName);
   						var speaker = allSpeakers[personID];

						if (speaker) {
							speaker.sessions.push({
								"id": eventJSON.id,
   								"title": eventJSON.title
							});

							var person = {"id": personID,
   										  "name": speaker.name};
   							eventJSON.speakers.push(person);
						}
   				});

				// Videos
				// ------
				var recordingJSON = null;

                eventRecordings.forEach(function (element) {
                    if (eventJSON && element && eventJSON.title == element.title) {
                        recordingJSON = element;
                    }
                });
				if (recordingJSON && recordingJSON.recording) {
					eventJSON.enclosures.push({
						"url": recordingJSON.recording.recording_url,
						"mimetype": "video/mp4",
						"type": "recording",
						"thumbnail": recordingJSON.thumb
					});
				}

				if (eventJSON != null) {
					addEntry('session', eventJSON);
				}
			});
		});

	});
}

function handlePOIs(graph, titles) {
    var POIs = {}

    var map2level = {0: "map-level0",
                     1: "map-level1",
                     2: "map-level2",
                     3: "map-level3",
                     4: "map-level4"};
    var poisForMaps = {};

    for (roomID in graph.rooms) {
        var roomShape = graph.rooms[roomID];
        var roomTitles = titles[roomID];
        var mapID = map2level[roomShape.level];
        var pois = poisForMaps[mapID];
        if (!pois) pois = [];

        var poi = poiForRoomShape(roomID, roomShape, roomTitles, mapID);
        if (!poi) continue;

        pois.push(poi);

        poisForMaps[mapID] = pois;
    }

    var allPois = [];

    additionalPOIs.forEach(function (poi) {
        allPois.push(poi);
    });

    for (mapID in poisForMaps) {
        var map = allMaps[mapID];
        if (!map) continue;

        var pois = poisForMaps[mapID];

        pois.forEach(function (poi) {
            var mapPOIs = map.pois;
            if (!mapPOIs) mapPOIs = [];
            mapPOIs.push(poi);
            map.pois = mapPOIs;

            allPois.push(poi);
        });
    }



    alsoAdd("poi", allPois);
}

function handleCSVResult(csvData, defaultTrack, shareURL, locationIdentifier, callback) {
  callback(null, []);
  return;
    parseCSV(csvData, {"delimiter": ";",
                       "auto_parse": false,
                       "auto_parse_date": false,
                       "columns": true,
                       "skip_empty_lines": true}, function(err, output) {
                           var sessions = [];
                           if (err) {
                               log.error("CSV Parse Error: ", err);
                           } else {
                               // console.log(output);

							   var index = 0;
                               output.forEach(function (row) {
                                   if (!row.tag || !row.beginn || !row.ende || row.tag.length == 0 ) {
									   return;
								   };


								   var components = row.tag.split(".");
								   if (components.length != 3) { console.error("Could not parse date from CSV: ", row.tag); return; };

								   var day = components[0];
								   var month = components[1];
								   var year = "20" + components[2];
								   var isoDay = [year,month,day].join("-");

                                   var beginDateStr = isoDay + "T" + row.beginn + "+01:00";
                                   var beginDate = parseDate(beginDateStr);

                                   var endDateStr = isoDay + "T" + row.beginn + "+0100";
                                   var endDate = new Date(endDateStr);

								   var localHours = beginDate.getUTCHours() + 1;
								   if (localHours == 24) localHours = 0;
								   if (localHours <= 4) {
									   var day = beginDate.getUTCDate() - 1;
									   isoDay = [year,month, day].join("-");
								   }

								   // if the end date is before the begin date move it a day ahead
								   if (endDate.getTime() < beginDate.getTime()) {
									   endDate.setTime(endDate.getTime() + 24 * 3600 * 1000);
								   }

                                   var duration = (endDate.getTime() - beginDate.getTime()) / 1000;
                                   var durMin = duration / 60.0;
                                   var durHour = Math.floor(durMin / 60);
                                   var durHourStr = durHour < 10 ? "0" + durHour : durHour;
                                   var leftDurMin = durMin - (60.0 * durHour);

                                   var leftDurMinStr = leftDurMin < 10 ? "0" + leftDurMin : leftDurMin;
                                   var durStr = durHourStr + ":" + leftDurMinStr;
                                   var end = parseEnd(beginDateStr, durStr);

								   var artistURLFunction = function (potentialURL) {
									   if (potentialURL &&
										   typeof(potentialURL) == 'string' &&
										   potentialURL.length > 0 &&
										   potentialURL.indexOf("http") == 0 &&
										   row.dj_url_1.indexOf("://") != -1)
										 {
										   return potentialURL;
									   } else {
										   return null;
									   }
								   };

								   var artists = [];
								   var artistURLs = [];
								   if (!row.dj_name_1) {
									   console.warn("Skipping row without DJ name");
									   return;
								   } else {
									   artists.push(row.dj_name_1);
									   artistURLs.push(artistURLFunction(row.dj_url_1));
								   }

								   if (row.dj_name_2 && row.dj_name_2.length > 0) {
									   artists.push(row.dj_name_2);
									   artistURLs.push(artistURLFunction(row.dj_url_2));
								   }

								   if (row.dj_name_3 && row.dj_name_3.length > 0) {
									   artists.push(row.dj_name_3);
									   artistURLs.push(artistURLFunction(row.dj_url_3));
								   }

                                   var title = artists.join(", ");
                                   console.log(title, " on day ", isoDay, " for begin ", beginDate);

                                   var locationJSON = allRooms[locationIdentifier];
                                   var trackJSON = defaultTrack;
                                   var format = allFormats["talk"];
                                   var langJSON = allLanguages["en"];
                                   var levelJSON = allLevels["beginner"];

                                   var day = allDays[isoDay];
                                   if (!day) return;

                               	   var session = {
                               	   	"id": mkID("lounges-" + locationIdentifier + "-" + index),
                               	   	"title": title,
                               	   	"url": shareURL,
                               	   	"abstract": "",
                               	   	"description": "",
                               	   	"begin": beginDate,
                               	   	"end": end,
                               	   	"track": trackJSON,
                               	   	"day": day,
                               	   	"format": format,
                               	   	"level": levelJSON,
                               	   	"lang": langJSON,
                               	   	"speakers": [],
                               	   	"enclosures": [],
                               	   	"links": [],
                                    "location": locationJSON
                               	   };

								   for (var i = 0; i < artistURLs.length; i++) {
									   var url = artistURLs[i];
									   var artist = artists[i];
									  if (typeof(url) == "string") {

									   	 session.links.push({"title": artist, "url": url, "type": "session-link"})
									  }
								   }

                                   addEntry('session', session);

								   index++;
                               });
                           }

                           callback(err, sessions);
                       });
}

function poiForRoomShape(id, shapeJSON, titleJSON, mapID) {

    var POI = {
        "id": shapeJSON["superroom"] ? mkID(shapeJSON.superroom) : mkID(id),
        "label_de":  titleJSON["de"],
        "label_en":  titleJSON["en"],
        "positions": [], // fill me later
        "hidden": false,
        "links": [],
        "description_de": "",
        "description_en": "",
        "category": "other"
    };

    var locationID = poi2locationMapping[POI.id];
    if (locationID) {
        POI["location"] = {"id": locationID};
    }

    if ((/hall/i).exec(POI.label_en)) {
        POI["category"] = "session-location";
    }
    if ((/toilet/i).exec(POI.label_en)) {
        POI["category"] = "service";
    }
    if ((/elevator/i).exec(POI.label_en)) {
        POI["category"] = "elevator";
    }
    if ((/shirt/i).exec(POI.label_en)) {
        POI["category"] = "shopping";
    }
    if ((/cert/i).exec(POI.label_en)) {
        POI["category"] = "safety";
    }
    if ((/(cash)/i).exec(POI.label_en)) {
        POI["category"] = "service";
    }
    if ((/(cloakroom)/i).exec(POI.label_en)) {
        POI["category"] = "service";
    }
    if ((/lounge/i).exec(POI.label_en)) {
        POI["category"] = "entertainment";
    }


    var xPoints = [];
    var yPoints = [];


    var allPointStrings =  shapeJSON.shape.split(" ").map(function (map) {
        return map.split(",").map(function (str) { return Number(str); });
    }).map(function (points) {
        return [points[0] * 4.21875, points[1] * 4.21875];
    });
    allPointStrings.forEach(function (point) {
        xPoints.push(point[0]);
        yPoints.push(point[1]);
    });

    var midPointX = 0.0;
    var midPointY = 0.0;
    async.reduce(xPoints, 0.0, function (memo, item, callback) {
        callback(null, memo + item);
    }, function (err, res) {
        midPointX = res / xPoints.length;
    });
    async.reduce(yPoints, 0.0, function (memo, item, callback) {
        callback(null, memo + item);
    }, function (err, res) {
        midPointY = res / yPoints.length;
    });

    if (allPointStrings.length == 0) {
        return null;
    }
    POI.positions.push({"map": mkID(mapID), "x": midPointX, "y": midPointY});

    // var polygon = turf.polygon(allPointStrings);
    // console.log("poly: ", polygon);
    // // var merged = turf.merge(polygon);
    // var center = turf.centroid(polygon);
    // var extent = turf.extent(polygon);
    // console.log("exte: ", extent);
    // console.log("cent: ", center);


    return POI;
}


exports.scrape = function (callback) {
	console.log("scrape");


	var scraper = new scrapyard({
		cache: path.resolve(__dirname, '..', '.cache'),
		debug: true,
		timeout: 300000,
		retries: 5,
		connections: 10
	});

	async.series(
		{
			lectures: function (callback) {
				json_requester.get({
					urls: {conference: "https://api.media.ccc.de/public/conferences/33c3"}
				},
				function (result) {
					if (result.conference.events) {
						var videoAPICallURLs = {
                            speakers: speakers_url,
                            schedule: schedule_url,
							voc_streams: voc_streams_api_url,
							additional_schedule: additional_schedule_url
                            // poi_graph: poi_graph_url,
                            // poi_titles: poi_titles_url
						};

// TODO: Renable for recordings
                        // result.conference.events.forEach(function (event) {
                        //     videoAPICallURLs[event.guid] = event.url;
                        // });

						json_requester.get({urls: videoAPICallURLs},
							function (result) {

								// Main Events
                                var speakers = result.speakers.schedule_speakers.speakers;
                                var schedule = result.schedule;

                                // // Wiki Events
                                var additional_schedule = result.additional_schedule;


								// Chillout Lounge
								var chillout_lounge_lineup = result.chillout_lounge;

                                // // VOC streams
                                var voc_streams = result.voc_streams;
                                //
                                // // POIs
                                // var poi_graph = result.poi_graph;
                                // var poi_titles = result.poi_titles;
                                //
                                // handlePOIs(poi_graph, poi_titles);

								var allSpeakers = {};

								delete result.voc_streams;
								delete result.schedule;
								delete result.speakers;
                                delete result.additional_schedule;
                                delete result.sendezentrum_schedule;
                                delete result.sendezentrum_speakers;
                                delete result.poi_titles;
                                delete result.poi_graph;
                                delete result.chillout_lounge;

								var eventRecordingJSONs = toArray(result);

								eventRecordingJSONs = eventRecordingJSONs.map(function (er) {
									var recording = er.recordings.filter(function (rec, index, all) {
										return rec.mime_type == "video/mp4" || rec.mime_type == "vnd.voc/h264-hd";
									});

									return {
								                                        "guid": er.guid,
								                                        "title": er.title,
										"conference_url":er.conference_url,
										"link": er.link,
										"thumb": er.thumb_url,
										"recording": recording.length > 0 ? recording[0] : null
									};
								});

								var congessRecordings = eventRecordingJSONs.filter(function (er) {
									return er.conference_url == "https://api.media.ccc.de/public/conferences/101";
								});

								var sendezentrumRecordings = eventRecordingJSONs.filter(function (er) {
									return er.conference_url == "https://api.media.ccc.de/public/conferences/102";
								});

                                var defaultTrack = {"id": mkID("other"),
                                                    "color": [97.0,97.0,97.0,1.0], // grey
                                                    "label_de": "Other",
                                                    "label_en": "Other"};

                                var streamMap = {};
                                voc_streams.forEach(function (group) {
                                    if (group["conference"] == eventId.toUpperCase()) {
										var groupName = group["group"];
                                        if (groupName == "Live") {
                                            group.rooms.forEach(function (room) {
                                                    room.streams.forEach(function (streamInfo) {
                                                        if (streamInfo.type == "video" &&
															(streamInfo.slug == "hd-native" || streamInfo.slug == "hd-stereo") &&
															streamInfo.urls.hls &&
													        !streamInfo.isTranslated) {
                                                            var info = {
                                                                "url": streamInfo.urls.hls.url,
                                                                "type": "livestream",
                                                                "mimetype": "video/mp4"
                                                            };

                                                            var roomID = vocSlugToLocatonID[room.schedulename];
                                                            if (roomID) {
                                                                streamMap[roomID] = info;
                                                            }

                                                        }
                                                    });
                                            });
                                        }
										if (groupName == "Live Music") {
                                            group.rooms.forEach(function (room) {
                                                    room.streams.forEach(function (streamInfo) {
                                                        if (streamInfo.type == "music" && (streamInfo.slug == "music-native") && streamInfo.urls.mp3) {
                                                            var info = {
                                                                "url": streamInfo.urls.mp3.url,
                                                                "type": "livestream",
                                                                "mimetype": "audio/mp3"
                                                            };

                                                            var roomID = vocSlugToLocatonID[room.schedulename];
                                                            if (roomID) {
                                                                streamMap[roomID] = info;
                                                            }

                                                        }
                                                    });
                                            });
										}
                                    }
                                });

                                // Extra Data from Wiki
                                handleResult(additional_schedule,
                                             speakers,
                                             eventRecordingJSONs,
                                             "",
                                             defaultTrack,
                                             "https://fahrplan.events.ccc.de/congress/2017/Fahrplan",
                                             [], // no voc streams for wiki
											 "workshop",
											 function (session, sourceJSON) { return "https://events.ccc.de/congress/2017/wiki/Session:" + encodeURIComponent(session.title); });

                                // Sendezentrum Frap
								// var podcastDefaultTrack =  {"id": mkID("sendezentrum"),
                //                 				  			"color": red,
								// 				  			"label_de": "Podcast",
								// 				  			"label_en": "Podcast"};
                //                 handleResult(sendezentrum_schedule,
                //                              sendezentrum_speakers,
                //                              sendezentrumRecordings,
                //                              "",
                //                              podcastDefaultTrack,
                //                              "https://frab.das-sendezentrum.de/",
                //                              streamMap,
								// 		 	 "podcast",
								// 		 	 function (session, sourceJSON) { return "https://frab.das-sendezentrum.de/de/34c3/public/events/" + sourceJSON.id; });


                                // 34c3 Frap
                                handleResult(schedule,
                                             speakers,
                                             congessRecordings,
                                             "",
                                             defaultTrack,
                                             "https://fahrplan.events.ccc.de/congress/2017/Fahrplan",
                                             streamMap,
										                         null,
 										 	                       null);


                                // Handle CSV data

                                var shareURL = "https://fahrplan.events.ccc.de/congress/2017/Fahrplan";


                                var allSessions = data.filter(function (i) {
							    	return i.type == "session";
							    });




                                // Generate iCal Feeds
							  generateIcalData(allSessions);

								var defaultLoungeTrack = allTracks[mkID('entertainment')];
                                							    //

                                        handleCSVResult("", defaultLoungeTrack, shareURL, mkID("anti-error-lounge-loc"), function (err, sessions) {
                                            /// AFTER THIS POINT NO SESSIONS SHOULD BE ADDED

                                            var allSessions = data.filter(function (i) {
        								    	                         return i.type == "session";
        								                                     });




                                            // Generate iCal Feeds
        								                    generateIcalData(allSessions);

        								    callback(null, 'lectures');
                                        });
							});
					}
				})
            }
		},
		function (err, results) {
			if (!err) {
                alsoAdd('speaker', allSpeakers);
				alsoAdd('day', allDays);
				// console.log(allRooms);

				var moreIDs = sortOrderOfLocations.length;
				toArray(allRooms).sort().forEach(function (item) {
					if (sortOrderOfLocations.indexOf(item["id"]) >= 0) {
						item["order_index"] = sortOrderOfLocations.indexOf(item["id"]);
					} else {
						item["order_index"] = moreIDs;
						moreIDs++;
					}
				});

				alsoAdd('location', allRooms);
				alsoAdd('map', allMaps);
				alsoAdd('track', allTracks);
				alsoAdd('format', allFormats);
				alsoAdd('language', allLanguages);

				callback(data);
			} else {
				console.log(err);
			}
		});

};// scrape

function parsePOIsFromCSV(data, callback) {
	parseCSV(csvData, {"delimiter": ";",
					   "auto_parse": false,
					   "skip_empty_lines": true}, function(err, output) {

			var pois = [];

			output.forEach(function (row) {
				var id = row[0];

				if (id == 'id' ||
					id == '' ||
					id == ' ' ||
					row[2] == '' || row[2] == ' ' ||
					row[3] == '' || row[3] == ' ')
				{
					// console.log("skipping "  + row);
					return;
				}

				var poi = {
					"id": (eventId + "-pointofinterest-" + id),
					"type": "poi",
					"label_en": row[4],
 				    "label_de": row[5],
					"category": row[6],
					"positions": [], // fill me later
	                "hidden": false,
	                "priority": 1000,
					"beacons": []
				};

				var x = parseInt(row[2]);
				var y = parseInt(row[3]);
				var floors = row[1].split(",");
				if (floors.length > 0 && floors[0] != '') {
					for (var i = floors.length - 1; i >= 0; i--) {
						var floorID = eventId + "-map-level" + floors[i];
							poi.positions.push(
								{"map": floorID,
								 "x": x,
								 "y": y}
							);

					}
				}

				pois.push(poi);
			});

			callback(pois);
	});
};


function toArray(obj) {
	return Object.keys(obj).map(function (key) { return obj[key] })
}


function clone(obj) {
	var newObj = {};
	Object.keys(obj).forEach(function (key) {
		newObj[key] = obj[key];
	})
	return newObj;
}
