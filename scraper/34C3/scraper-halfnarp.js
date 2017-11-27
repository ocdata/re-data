/* get node modules */
var fs = require('fs');
var path = require('path');
var eventId = "34c3";

/* get npm modules */
var scrapyard = require('scrapyard');
var moment = require('moment');
var ent = require('ent');
var cheerio = require('cheerio');
var sanitizeHtml = require('sanitize-html');
var htmlToText = require('html-to-text');
var parseCSV = require('csv-parse');
var async = require('async');
var md5 = require('MD5');
var ical = require('ical');
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var icalendar = require('icalendar');

var log = require(path.resolve(__dirname, '../../api/lib/log.js'));
var json_requester = require('../lib/json_requester');

var halfnarp_schedule_url = "http://halfnarp.events.ccc.de/-/talkpreferences";
var workshops_halfnarp_schedule_url = "http://data.c3voc.de/33C3/workshops.halfnarp.json";

// for debugging we can just pretend rp14 was today
var originalStartDate = new Date(Date.UTC(2016, 7, 13, 10, 15, 0, 0));
var fakeDate = new Date(Date.UTC(2016, 7, 13, 10, 15, 0, 0));
var sessionStartDateOffsetMilliSecs = 0; //fakeDate.getTime() - originalStartDate.getTime();

var dayYearChange = 0;
var dayMonthChange = 0;
var dayDayChange = 0;

// Security #5057af blue
// Politics #b550bd violett 
// Science #45b9b3 turqise 
// Hardware #a8563f brown 
// Art #b99745 orange
// Failosophy #c0ba59 yellow
// CCC #45b964 green
// Entertainment #45b964 (same as CCC) green
// 
// official from https://events.ccc.de/congress/2015/wiki/Static:Design
var blue    = [ 80.0,  87.0, 175.0, 1.0];
var violett = [181.0,  80.0, 189.0, 1.0];
var turquise= [ 69.0, 185.0, 179.0, 1.0]; 
var brown   = [168.0,  86.0,  63.0, 1.0]; 
var orange  = [185.0, 151.0,  69.0, 1.0];
var yellow  = [192.0, 186.0,  89.0, 1.0];
var green   = [ 69.0, 185.0, 100.0, 1.0];

// non-official
var red     = [118.0,  26.0,  61.0, 1.0];
var grey    = [ 97.0,  97.0,  97.0, 1.0];
var black   = [  0.0,   0.0,   0.0, 1.0];
var cream   = [135.0,  81.0,  86.0, 1.0]; 


var colors = {};
colors[eventId + "-security"] = blue;
colors[eventId + "-ethics-society-politics"] = violett;
colors[eventId + "-science"] = turquise;
colors[eventId + "-hardware-making"] = brown;
colors[eventId + "-art-culture"] = orange;
colors[eventId + "-failosophy"] = yellow;
colors[eventId + "-space"] = yellow;
colors[eventId + "-ccc"] = green;
colors[eventId + "-entertainment"] = green;


colors[eventId + "-self-organized-sessions"] = grey;
colors[eventId + "-podcast"] = red;
colors[eventId + "-sendezentrum"] = red;
colors[eventId + "-other"] = grey;

// console.log("Real date: " + originalStartDate);
// console.log("Fake date: " + fakeDate);


// http://hls.stream.c3voc.de/hls/sN_L_Q.m3u8
// N ∈ [1;5], L ∈ {native, translated}, Q ∈ {hd, sd, slides}. 

// http://halfnarp.events.ccc.de/-/talkpreferences

var sortOrderOfLocations = [

];

var testVideoURLs = {}
// 	"34c3-7909": "http://cdn.media.ccc.de/congress/2014/h264-hd/31c3-6582-de-Das_Transparenzportal_Hamburg_hd.mp4" // Talk:Wie Jugendschutzprogramme nicht nur die Jugend schädigen Video: Das Transparenzportal Hamburg
// };

// for app review we only show limited innocent content…
var whitelistedSessionIDs = [
// "34c3-7811", // Irren ist staatlich
// "34c3-7860", // Welcome to the Anthropocene?
// "34c3-7861", // The Universe Is, Like, Seriously Huge
// "34c3-7873", // SpinalHDL : An alternative hardware description language
// "34c3-7880", // International exchange of tax information
// "34c3-7899", // Berechnete Welt
// "34c3-7909", // Syrian Archive
// "34c3-7911", // make WiFi fast again
// "34c3-7922", // Formal Verification of Verilog HDL with Yosys-SMTBMC
// "34c3-7925", // The Nibbletronic
// "34c3-7927", // Lasers in the sky (with asteroids)
// "34c3-7942", // Interplanetary Colonization
];

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
	} //,
	// 'map-level3': {
	// 	'event': eventId,
	// 	'id': eventId + "-map-" + "level3",
	// 	'type': "map",
	// 	'label_de': "Congress Center Hamburg",
	// 	'label_en': "Congress Center Hamburg",
	// 	'floor_label_de': "3. Obergeschoß",
	// 	'floor_label_en': "3rd floor",
	// 	"is_outdoor": false,
	// 	"is_indoor": true,
	// 	"floor": 3,
	// 	"order_index": 3,
	// 	"area": {"width": 1000.0,
	// 	         "height": 530.0},
	// 	"tiles": {
	//                     "base_url": "http://data.conference.bits.io/maps/34c3/floor3",
	//                     "large_image_url": "http://data.conference.bits.io/maps/34c3/floor3/mini.png",
	//                     "tile_size": 512,
	//                     "tile_file_extension": "png",
	//            "size": {"width": 5940,
	//                     "height": 4320}
	//                 },
	//     "pois": []
	// },
	// 'map-level4': {
	// 	'event': eventId,
	// 	'id': eventId + "-map-" + "level4",
	// 	'type': "map",
	// 	'label_de': "Congress Center Hamburg",
	// 	'label_en': "Congress Center Hamburg",
	// 	'floor_label_de': "4. Obergeschoß",
	// 	'floor_label_en': "4th floor",
	// 	"is_outdoor": false,
	// 	"is_indoor": true,
	// 	"floor": 4,
	// 	"order_index": 4,
	// 	"area": {"width": 1000.0,
	// 	         "height": 530.0},
	// 	"tiles": {
	//                     "base_url": "http://data.conference.bits.io/maps/34c3/floor4",
	//                     "large_image_url": "http://data.conference.bits.io/maps/34c3/floor4/mini.png",
	//                     "tile_size": 512,
	//                     "tile_file_extension": "png",
	//            "size": {"width": 5940,
	//                     "height": 4320}
	//                 },
	//     "pois": []
	// }			
};

var allPOIs = {};
var data   = [];
var allDays = {
	"2015-12-27": {
		"date": "2015-12-27",
		"id": mkID("day-1"),
		"label_de": "Tag 1",
		"label_en": "Day 1"
	},
	"2015-12-28": {
		"date": "2015-12-28",
		"id": mkID("day-2"),
		"label_de": "Tag 2",
		"label_en": "Day 2"
	},
	"2015-12-29": {
		"date": "2015-12-29",
		"id": mkID("day-3"),
		"label_de": "Tag 3",
		"label_en": "Day 3"
	},
	"2015-12-30": {
		"date": "2015-12-30",
		"id": mkID("day-4"),
		"label_de": "Tag 4",
		"label_en": "Day 4"
	}	
};
var allRooms = {};
var allSpeakers = {};
var allTracks = {
	'other': { id:'other', label_de:'Other', label_en:'Other', color:[101.0, 101.0, 101.0, 1.0] },
    'self-organized-sessions': {id: 'self-organized-sessions', label_en: "Self-Organized Sessions", label_de: "Self-Organized Sessions", color:grey } 
};
var allSpeakers = {};

function addEntry(type, obj) {
	obj.event  = eventId;
	obj.type   = type;
	data.push(obj);
};

function alsoAdd(type, list) {
	Object.keys(list).forEach(function (key) {
		var obj   = clone(list[key]);
		obj.event = eventId;
		obj.type  = type;
		data.push(obj);
	})
};

function mkID(string) {
	return eventId + "-" + string.toString().replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
};

function normalizeXMLDayDateKey(date) {
	var parseDate = new Date(date);
	
	return date;	
};

function sessionFromJSON(json, id_prefix, linkMakerFunction) {
    var linkFunction = linkMakerFunction;
    if (linkFunction == null) {
        linkFunction = function (session) {
            return "http://events.ccc.de/congress/2017/Fahrplan/events/" + json["event_id"] + ".html";            
        };
    }
	
	var speakers = speakerFromString(json["speaker_names"]).map(function (speaker) {
		return {
				"id": id_prefix + speaker.id,
				"name": speaker.name
		};
	});
    
    var lang = allLanguages[json["language"]];
    if (lang == undefined) {
        lang = allLanguages["de"];
    }
	
	var session = {
		"id": mkID(id_prefix + json["event_id"]),
		"title": json["title"],
		"description": htmlToText.fromString(json["abstract"], { wordwrap: false }),
		"url": null,
		"begin": null,
		"end": null,
		"duration": json["duration"],
		"location": null,
		"track": trackFromJSON(json), // fixme
		"format": allFormats['talk'],
		"lang": lang,
		"level": allLevels['intermediate'],
		"speakers": speakers,
		"enclosures": [],
		"links": []
	};
	
	// if whitelist is present and this id is not whitelisted return null
	if (whitelistedSessionIDs.length > 0 && whitelistedSessionIDs.indexOf(session.id) == -1) {
		return null;
	}
	
	var testVideoURL = testVideoURLs[session.id];
	if (testVideoURL) {
		session.enclosures.push({
			"url": testVideoURL,
			"mimetype": "video/mp4",
			"type": "recording",
			"thumbnail": "http://static.media.ccc.de/media/congress/2013/5490-h264-iprod_preview.jpg"
		});
	}
	
    session["url"] = linkFunction(session);
    
	return session;
};

function trackFromJSON(json) {
    
    var id2slug = {};
    id2slug[318] = "security";
    id2slug[316] = "ethics-society-politics";
    id2slug[314] = "science";
    id2slug[323] = "space";    
    id2slug[317] = "hardware-making";
    id2slug[315] = "art-culture";
    // id2slug[""] = "failosophy";
    id2slug[319] = "ccc";
    id2slug[320] = "entertainment";
    // id2slug[""] = "self-organized-sessions";
    // id2slug[""] = "podcast";
    // id2slug[""] = "sendezentrum";
    // id2slug[""] = "other";
    var slug = id2slug[json.track_id];
    if (slug == undefined) {
        slug = "other";
    }
    
    var trackID = mkID(slug);
    
    var nameFromSlug = {};
    nameFromSlug["security"] = "Security";
    nameFromSlug["ethics-society-politics"] = "Ethics, Society & Politics";
    nameFromSlug["science"] = "Science";
    nameFromSlug["space"] = "Space"; 
    nameFromSlug["hardware-making"] = "Hardware & Making";
    nameFromSlug["art-culture"] = "Art & Culture";
    nameFromSlug["failosophy"] = "Failosophy";
    nameFromSlug["ccc"] = "CCC";
    nameFromSlug["entertainment"] = "Entertainment";
    nameFromSlug["self-organized-sessions"] = "Self-organized sessions";
    nameFromSlug["podcast"] = "Podcast";
    nameFromSlug["sendezentrum"] = "Sendezentrum";
    nameFromSlug["other"] = "Other";
    
	allTracks[trackID] = {'id': trackID, 
						  'label_en': nameFromSlug[slug], 
						  'label_de': nameFromSlug[slug],
						  'color': colors[trackID]};
	
	return allTracks[trackID];
};



function speakerFromString(string) {
	var speakers = [];
	
    var names = []
    
    if (string != undefined) {
    	names = string.split(",").map(function (item) {
    		return item.trim();
    	});    
    }
    
	
	
	names.forEach(function (speakerName) {
		var speakerID = mkID(speakerName.trim());
		if (speakerName == "") {
			return;
		}
		var speaker = allSpeakers[speakerID];
		if (speaker) {
			speakers.push(allSpeakers[speakerID]);
		} else {
			var speaker = {
				"id": speakerID,
				"name": speakerName.trim(),
				"biography": "",
				"links": [],
				"sessions": []
			};
			allSpeakers[speakerID] = speaker;
			speakers.push(speaker);
		}
	});
	
	return speakers;
};

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
			halfnarp: function (callback) {
				json_requester.get({
					urls: {halfnarp: halfnarp_schedule_url}
				},
				function (result) {
					
					
					result.halfnarp.forEach(function (item, index) {				
						var session = sessionFromJSON(item, '', null);
						
						// if session could be parsed add it
						if (session != null) {
							addEntry('session', session);
						}
					});
					
					callback(null, 'halfnarp');
				});
			} //,
            // workshops: function (callback) {
            //     json_requester.get({
            //         urls: {workshops: workshops_halfnarp_schedule_url}
            //     },
            //     function (result) {
            //
            //
            //         result.workshops.forEach(function (item, index) {
            //             var session = sessionFromJSON(item, 'workshop-', function (session) {
            //                 return "https://events.ccc.de/congress/2016/wiki/Session:" + encodeURIComponent(session.title);
            //             });
            //
            //             // if session could be parsed add it
            //             if (session != null) {
            //                             // Add to workshop track
            //                             session["track"] = allTracks["self-organized-sessions"];
            //                 addEntry('session', session);
            //             }
            //         });
            //
            //         callback(null, 'workshops');
            //     });
            // }        
		},
		function (err, results) {
			if (!err) {
				
				alsoAdd('track', allTracks);
				alsoAdd('format', allFormats);
				alsoAdd('level', allLevels);
				alsoAdd('language', allLanguages);
				alsoAdd('day', allDays);				
				alsoAdd('speaker', allSpeakers);				
				alsoAdd('map', allMaps);
				alsoAdd('poi', allPOIs);						
				
				callback(data);
			} else {
				console.log(err);
			}
		}
	);
};

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
