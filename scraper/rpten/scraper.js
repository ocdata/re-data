var eventId = 'rpten';

var ent = require('ent');
var fs = require('fs');
var path = require('path');
var parseCSV = require('csv-parse');

// for debugging we can just pretend rpTEN was today
var originalStartDate = new Date(2015, 4, 5, 9, 0, 0, 0); // rp15
// var originalStartDate = new Date(2016, 4, 2, 9, 0, 0, 0); // rpTEN
var fakeDate = originalStartDate; //new Date();
var sessionStartDateOffsetMilliSecs = fakeDate.getTime() - originalStartDate.getTime();
var removeTimesAndLocations = false;

// Livestream test
var streamURLs = {
	"rp14-location-2594": "http://delive.artestras.cshls.lldns.net/artestras/contrib/delive.m3u8",
	"rp14-location-2595": "https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
    // "rpten-location-10341": "http://alex-stream.rosebud-media.de/live/smil:alexlivetv.smil/playlist.m3u8", // Stage 7 Media Convention    
    // "rpten-location-10339": "http://alex.rosebud-media.de/event/_definst_/smil:alexevent.smil/playlist.m3u8" // Stage 5 Media Convention
    // "rpten-location-10339": "http://alex.rosebud-media.de/event/_definst_/smil:alexevent.smil/playlist.m3u8" // Stage 5 Media Convention
};

var allTracks = {
	'Business & Innovation':  { id:'business-innovation', label_de:'Business & Innovation',  		label_en:'Business & Innovation', color:[64, 156, 28, 1.0] },    //
 'City Of The Future':     { id:'city-of-the-future',  label_de:'City Of The Future',             label_en:'City Of The Future'   , color:[0, 0, 0, 1.0] }, //
    'Culture':                { id:'culture',             label_de:'Kultur',                         label_en:'Culture'              , color:[180, 98, 8, 1.0] },   //
'Fashiontech':            { id:'fashiontech',         label_de:'Fashiontech',            	  	label_en:'Fashiontech'          , color:[0, 0, 0, 1.0] },
'GIG':            		  { id:'gig',         		  label_de:'Global Innovation Gathering', 	label_en:'Global Innovation Gathering' , color:[193.0, 117.0, 28.0, 1.0] },	
'Media':                  { id:'media',               label_de:'Medien',                 		label_en:'Media'                , color:[11.0, 87.0, 127.0, 1.0] },  //
	'Media Convention':       { id:'media-Convention',    label_de:'Media Convention',       		label_en:'Media Convention'     , color:[189, 0, 4, 1.0] },	     //
	'Politics & Society':     { id:'politics-society',    label_de:'Politik & Gesellschaft', 		label_en:'Politics & Society'   , color:[92, 57, 114, 1.0] }, //
're:cord Musicday':       { id:'re-cord-musicday',    label_de:'re:cord Musicday',       		label_en:'re:cord Musicday'     , color:[51.0, 204.0, 102.0, 1.0] }, //
    'Health':                 { id:'health',           label_de:'Health',              		label_en:'Health'            , color:[139, 0, 23, 1.0] },	
    're:health':                 { id:'health',           label_de:'Health',              		label_en:'Health'            , color:[139, 0, 23, 1.0] },	    
	're:publica':             { id:'re-publica',          label_de:'re:publica',              		label_en:'re:publica'            , color:[0, 0, 0, 1.0] },  //
're:think Mobility':      { id:'re-think-mobility',   label_de:'re:think Mobility',      		label_en:'re:think Mobility'    , color:[102.0, 156.0, 44.0, 1.0] },		
	'Science & Technology':   { id:'science-technology',  label_de:'Wissenschaft & Technik', 		label_en:'Science & Technology' , color:[146, 132, 7, 1.0] },  //
	'Research & Education':   { id:'research-education',  label_de:'Forschung & Bildung',    		label_en:'Research & Education' , color:[83, 78, 192, 1.0] },//
    'Other':                  { id:'other',               label_de:'Other',                  		label_en:'Other'                , color:[0, 0, 0, 1.0] },
    "Global Innovation Gathering (GIG)": { id:'global-innovation-gathering-gig', label_de:'Global Innovation Gathering (GIG)', label_en:'Global Innovation Gathering (GIG)', color:[0, 0, 0, 1.0] }
};

var allFormats = {
	'Diskussion': { id:'discussion', label_de:'Diskussion', label_en:'Discussion' },
	'Vortrag':    { id:'talk',       label_de:'Vortrag',    label_en:'Talk'       },
	'Workshop':   { id:'workshop',   label_de:'Workshop',   label_en:'Workshop'   },
	'Aktion':     { id:'action',     label_de:'Aktion',     label_en:'Action'     }
};

var allLevels = {
	'Beginner':         { id:'beginner',     label_de:'Anfänger',         label_en:'Beginner'     },
	'Fortgeschrittene': { id:'intermediate', label_de:'Fortgeschrittene', label_en:'Intermediate' },
	'Experten':         { id:'advanced',     label_de:'Experten',         label_en:'Advanced'     }
};

var allLanguages = {
	'Englisch':         { id:'en',    label_de:'Englisch',         label_en:'English'         },
	'Deutsch':          { id:'de',    label_de:'Deutsch',          label_en:'German'          }
};

// media convention videos
var videoMap = {
    "rpten-session-10379": "https://www.youtube.com/watch?v=GM2SMruNpjQ", // Preisverleihung "YOUR TURN - Der Video-Creator Wettbewerb"
    "rpten-session-10592": "https://www.youtube.com/watch?v=NsuDLjcxD6Y", // Die Macht der Bilder – Zwischen Pressefreiheit und Menschenwürde
    "rpten-session-9367": "https://www.youtube.com/watch?v=MZzxPPXni40", // What's up TV? - Television from abroad
    "rpten-session-10419": "https://www.youtube.com/watch?v=7d79CSnW3RM", // Halt die Fresse: Hate Speech!
    "rpten-session-10369": "https://www.youtube.com/watch?v=0Ym4sQB4TRk", // Sind wir schon drin? Virtual Reality Projekte und ihre Plattformen
    "rpten-session-10414": "https://www.youtube.com/watch?v=EX9y1L6CKe4", // Hauptsache authentisch? Instagram, Snapchat und Co. entzaubert.
    "rpten-session-9774": "https://www.youtube.com/watch?v=UpcJ6k7a1DM", // Games go Hollywood: Spielekonzerne als Film- und TV-Produzenten
    "rpten-session-10427": "https://www.youtube.com/watch?v=W8fVPd1Vfq8" // Wer zahlt für Nachrichtenvideos im Netz?
};

// rp15
// var allDays = {
//     '05.05.2015': { 'id': eventId +'-day-1', 'label_de':'5. Mai',
//                                              'label_en':'May 5',
//                                              'date':'2015-05-05' },
//     '06.05.2015': { 'id': eventId +'-day-2', 'label_de':'6. Mai',
//                                              'label_en':'May 6',
//                                              'date':'2015-05-06' },
//     '07.05.2015': { 'id': eventId + '-day-3', 'label_de':'7. Mai',
//                                               'label_en':'May 7',
//                                               'date':'2015-05-07' },
// };

// rpTEN
var allDays = {
    '02.05.2016': { 'id': eventId +'-day-1', 'label_de':'2. Mai',
                                             'label_en':'May 2',
                                             'date':'2016-05-02' },
    '03.05.2016': { 'id': eventId +'-day-2', 'label_de':'3. Mai',
                                             'label_en':'May 3',
                                             'date':'2016-05-03' },
    '04.05.2016': { 'id': eventId + '-day-3', 'label_de':'4. Mai',
                                              'label_en':'May 4',
                                              'date':'2016-05-04' },
};


var allMaps = {
	'map-level0': {
		'event': eventId,
		'id': eventId + "-map-level0",
		'type': "map",
		'label_de': "Station Berlin",
		'label_en': "Station Berlin",
		'floor_label_de': "Station Berlin",
		'floor_label_en': "Station Berlin",		
		"is_outdoor": true,
		"is_indoor": true,		
		"floor": 0,
		"order_index": 0,
		"area": {"width": 4193.0, 
		         "height": 1949.0},
		"tiles": {
                    "base_url": "http://data.conference.bits.io/maps/rpten/station-berlin",
                    "large_image_url": "http://data.conference.bits.io/maps/rpten/station-berlin/mini.png",
                    "tile_size": 512,
                    "tile_file_extension": "png",
                    "size": {"width": 4193.0,
                             "height": 1949.0}
                },
	    "pois": []
	}
};


var allPOIs = {
	
};


var csvData = fs.readFileSync(__dirname + "/pois.csv");

// we now supply a order preference with the location
var locationOrderPreference = [
		eventId + '-location-10305', // stage 1
		eventId + '-location-10306', // stage 2
		eventId + '-location-10336', // stage 3
		eventId + '-location-10338', // stage 4
		eventId + '-location-10339', // stage 5
		eventId + '-location-10340', // stage 6
		eventId + '-location-10341', // stage 7, media conventon
		eventId + '-location-10456', // stage 8
		eventId + '-location-10457', // stage 9
		eventId + '-location-10458', // stage L
		eventId + '-location-5938', // stage 11
		eventId + '-location-10460', // stage J
		eventId + '-location-10459', // stage T
		eventId + '-location-10461', // Makerspace rp15     
    	eventId + '-location-10736', // Lightning Talks 1
    	eventId + '-location-10737', // Lightning Talks 2
    	eventId + '-location-10739', // Meetups 1
    	eventId + '-location-10740', // Meetups 2         
		eventId + '-location-6145', // MIZ rp15
        eventId + '-location-6148', // re: rp15
		eventId + '-location-2708', // store
		eventId + '-location-2710', // GIG lounge
		eventId + '-location-2709', // GIG makerspace
		eventId + '-location-2711', // MIKZ
		eventId + '-location-2712', // new thinking
		eventId + '-location-2713', // republica
		eventId + '-location-2855', // re/connect
		eventId + '-location-2871', // backyard
		eventId + '-location-6147',  // newthinkging rp15
		eventId + "-location-6146", // fashiontec rp15
		eventId + '-location-6289', //  store rp15
	    eventId + "-location-10852" // media cube
];


exports.scrape = function (callback) {
	require('../lib/json_requester').get(
		{
			urls: {
				sessions: 'https://re-publica.de/rest/sessions.json?args[0]=6553', // rpTEN id: 6553 rp15: 3013
				speakers: 'https://re-publica.de/rest/speakers.json?args[0]=6553' // rpTEN id: 6553 rp15: 3013
			}
		},
		function (result) {
			var data = [];

			var sessionList  = result.sessions;
			var speakerList  = result.speakers;
			var ytPlaylist   = [];

			var ytVideoMap  = {};
			var locationMap = {};
			var speakerMap  = {};

			ytPlaylist.forEach(function (entry) {
				var permalink = permalinkFromYouTubeEntry(entry);
				ytVideoMap[permalink] = linkFromYouTubeEntry(entry);
			});

			speakerList.forEach(function (speaker) {
				var speakerName = speaker.label;
				// if (speaker.label == undefined && speaker.gn != undefined && speaker.fn != undefined) {
					speakerName = speaker.gn + " " + speaker.sn;
				// }
				
				// skip potential invalid speakers, those happen.
				if (speaker.uid == "" || (speakerName == null || speakerName.trim() == "")) return;

				var entry = {
					'id': eventId + '-speaker-'+speaker.uid,
					'name': ent.decode(speakerName),
					'photo': (speaker.image.src != undefined ? speaker.image.src : speaker.image),
					'url': makeSpeakerURL(speaker),
					'biography': typeof(speaker.description_short) == "string" ? removeHTMLTags(speaker.description_short) : null,
					'organization':  typeof(speaker.org) == "string" ? speaker.org : null,
					'organization_url': typeof(speaker.org_uri) == "string" ? speaker.org_uri : null,
					'position': typeof(speaker.position) == "string" ? speaker.position : null,
					'sessions': [],
					'links': parseSpeakerLinks(speaker.links)
				}
				speakerMap[entry.id] = entry;
				addEntry('speaker', entry);
			});

			// first get rooms out of the sessions
			sessionList.forEach(function (session) {
				
				var locationName = session['room'];
				var locationId = session['room_id'];				

				if (locationName == null || locationId == null ||
					locationName == '' || locationId == '') {
					return;
				}
				
				var id = eventId + '-location-'+ locationId;
				// only uniq rooms 
				if (locationMap[id]) {
					return;
				}
				
				var orderPreference = locationOrderPreference.indexOf(id);
				// put unknown locations at the end
				if (orderPreference < 0) {
					orderPreference = locationOrderPreference.length + 1;
				}
				var entry = {
					'id': id,
					'label_de': locationName,
					'label_en': locationName,
					'order_index': orderPreference,
					'type': 'location',
					'event': eventId,
					'is_stage': locationName.match(/stage /i) ? true : false
				}
				locationMap[entry.id] = entry;

				addEntry('location', entry);
			});

			var fakeSessions = [
				// {
//                       "updated_date": "02.05.2015 - 10:56",
//                       "nid": "2666",
//                       "type": "session",
//                       "uri": "http://15.re-publica.de/session/welcome",
//                       "title": "Welcome rp15!",
//                       "label": "Welcome rp15!",
//                       "datetime": "02.05.2016 - 09:00 bis 10:00",
//                       "start": "09:00",
//                       "end": "10:00",
//                       "room_id": "5591",
//                       "room": "stage 1",
//                       "speaker_uids":
//                         "2460, 2472, 2419, 2219, 2520"
//                       ,
//                       "speaker_names": [
//                         "Andreas Gebhard",
//                         "Tanja Haeusler",
//                         "Markus Beckedahl",
//                         "Johnny Haeusler",
//                         "Elmar Giglinger"
//                       ],
//                       "category_id": "31",
//                       "category": "re:publica",
//                       "format_id": "10",
//                       "format": "Vortrag",
//                       "level_id": "3",
//                       "level": "Beginner",
//                       "language_id": "5",
//                       "language": "Deutsch",
//                       "curator_ids": [],
//                       "curator_names": [],
//                       "description_short": "Opening ceremony for re:publica and MEDIA CONVENTION.",
//                       "description": "",
//                       "video": [
//                         "http://www.youtube.com/watch?v=hfjNOk97qn8"
//                       ],
//                       "event_title": "re:publica 2015",
//                       "event_date": "",
//                       "event_description": "Finding Europe"
//                     }
		];


			Array.prototype.push.apply(sessionList, fakeSessions);


			sessionList.forEach(function (session) {
				if (session.nid == "") return; // skip invalid sessions

//                console.log(session);

				var begin = parseDateTime(session.start_iso)
				var end = parseDateTime(session.end_iso)
				var duration = (end - begin) / 1000;
				if (duration < 0) return;
				
				var permalink = session.uri;
				var links = [];

				var ytLink = ytVideoMap[permalink];
				if (ytLink) {
					links.push(ytLink);
				}
                // console.log(session["video"]);
                var videos = session.video;
				if (typeof(session["video"]) === 'string') {	
                    videos = [videos];
                } else  if (!session["video"]) {
                    videos = [];
                }
                var video = videoMap[session.id]
                if (video) {
                    videos.push(video);
                }
					
				videos.forEach(function (videoURL) {
					
					if (videoURL.match(/^https?\:\/\/www\.youtube\.com\/watch\?v=(.+)$/i)) {
                        var videoID = RegExp.$1;                        
						if (videoID) {

							// https://www.youtube.com/v/12BYSqVGCUk
							var result =  {
					 			"thumbnail": "https://img.youtube.com/vi/" + videoID + "/hqdefault.jpg",
					 			"title": ent.decode(session.title),
					 			"url": "https://www.youtube.com/v/" + videoID + "",
					 			"service": "youtube",
					 			"type": "recording"
							};
							links.push(result);
						}
					 };
				});
				

                // console.log("session:", session.nid);

				var entry = {
					'id': eventId + '-session-' + session.nid,
					'title': ent.decode(session.title),
					'abstract': typeof(session.description_short) == "string" ? removeHTMLTags(session.description_short) : null,
					'description': typeof(session.description) == "string" ? removeHTMLTags(session.description) : null,
					'url': permalink,
					'begin': begin,
					'end': end,
					'duration': duration,
					'day': parseDay(session.start_iso),
					'location': parseLocation(locationMap, session.room_id),
					'track': parseTrack(session.category),
					'format': parseFormat(session.format),
					'level': parseLevel(session.level),
					'lang': parseLanguage(session.language),
					'speakers': parseSpeakers(speakerMap, session.speaker_uids),
					'enclosures': [],
					'links': links
				}
                
                // console.log("entry: ", entry);
                
				if (removeTimesAndLocations) {
					if (session.nid.toString()[2] != "2") {
						entry["begin"] = null;
						entry["end"] = null;					
						entry["location"] = null;
						entry["day"] = null;
					}
				}
				
				if (entry.location && entry.day) {
					var liveStreamURL = streamURLs[entry.location.id];
					if (liveStreamURL && (entry.day.id == "rpten-day-1" || entry.day.id == "rpten-day-2")) {
						entry.enclosures.push({
							"url": liveStreamURL,
							"mimetype": "application/x-mpegURL",
							"type": "livestream"
						});
					}
				}
				entry = entry;
				
				addEntry('session', entry);
			});
			
			alsoAdd('track', allTracks);
			alsoAdd('format', allFormats);
			alsoAdd('level', allLevels);
			alsoAdd('language', allLanguages);
			// if (!removeTimesAndLocations) {
				alsoAdd('day', allDays);				
			// }
			alsoAdd('map', allMaps);
			alsoAdd('poi', allPOIs);			
						

			function addEntry(type, obj) {
				obj["event"] = eventId;
				obj["type"] = type;
				data.push(obj);
			}

			function alsoAdd(type, list) {
				Object.keys(list).forEach(function (key) {
					var obj = clone(list[key]);
					obj["event"] = eventId;
					obj["type"] = type;
					data.push(obj);
				});
			}

			parsePOIsFromCSV(csvData, function (pois) {
				alsoAdd('poi', pois);  
			
				callback(data);
			});
		}
	);
}

function toArray(obj) {
	return Object.keys(obj).map(function (key) { return obj[key] })
}

function parseDay(isoDateString) {
	if (typeof(isoDateString) != "string") return null;

    var date = new Date(isoDateString);
    var day = date.getDate();
    if (day < 10) day = "0" + day;
    var month = date.getMonth() + 1;
    if (month < 10) month = "0" + month; 
    var year =  date.getFullYear();

	var dayDict = allDays[day+'.'+month+'.'+year];
	if (dayDict == undefined) return null;
	return dayDict
}

function permalinkFromYouTubeEntry(entry) {
	var mediaGroup = entry["media$group"];
	if (mediaGroup == undefined) return false;

	var mediaDesc = mediaGroup["media$description"];
	if (mediaDesc == undefined) return false;

	var desc = mediaDesc["$t"];
	if (desc == undefined) return false;


	var permalinkMatcher = /(https?:\/\/14\.re-publica\.de\/session\/[a-z-0-9\-]+)/;
	permalinkMatcher.exec(desc);

	var permalink = RegExp.$1;
	// ensure all permalinks lead to https
	if (permalink.match(/^http:/)) {
		permalink = permalink.replace('http:', 'https:');
	}
	return permalink;
}

function linkFromYouTubeEntry(entry) {
	var mediaGroup = entry["media$group"];
	if (mediaGroup == undefined) return false;

	if (mediaGroup["media$thumbnail"] == undefined ||
		  mediaGroup["media$thumbnail"].length < 3) return false;

	var thumbnailURL = mediaGroup["media$thumbnail"][2]["url"];

	if (mediaGroup["media$content"] == undefined ||
		  mediaGroup["media$content"].length < 1) return false;
	var url = mediaGroup["media$content"][0]["url"];

	// we use the https://www.youtube.com/v/12BYSqVGCUk format
	// as this can be embedded nicely on iOS.
	// Just strip all the params away.
	url = url.replace(/\?.*$/, '');

	var result =  {
 		"thumbnail": thumbnailURL,
 		"title": entry["title"]["$t"],
 		"url": url,
 		"service": "youtube",
 		"type": "recording"
 };

//    console.log(result);

 return result;
}

function parseDate(text) {
	if (text == '') return false;

	var dateMatcher = /(\d\d)\.(\d\d)\.(\d\d\d\d)/;
	dateMatcher.exec(text);
	var day = RegExp.$1;
	var month = RegExp.$2;
	var year = RegExp.$3;
	var date = new Date(year, month, day, 0, 0, 0, 0);
	var newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
	date.setTime(newMillis);
	
	return date;
}

function parseDateTime(isodatetime) {
	if (typeof(isodatetime) != "string") return null;


	var date = new Date(isodatetime);
	var newMillis = date.getTime() + sessionStartDateOffsetMilliSecs;
	date.setTime(newMillis);
	return date;

	console.error('Unknown date "'+date+'" and time "'+time+'"');
	return null;
}

function parseLocation(locationMap, roomid) {
	if (roomid == '') return null;

	var id = eventId + "-location-"+roomid;
	var location = locationMap[id];

	if (location == undefined) {
		console.error("unknown location " + roomid);
		return null;
	}

	return {
					'id': location.id,
					'label_en': location.label_en,
					'label_de': location.label_de
	};
}


function parseTrack(text) {
    var textWithoutEntities = removeHTMLTags(text).replace("&amp;", "&");
	var track = allTracks[textWithoutEntities];
	if (track) return track;
	console.error('Unknown Track "'+textWithoutEntities+'"');
	return allTracks["re:publica"];
}

function parseFormat(text) {
	var format = allFormats[text];
	if (format) return format;
	console.error('Unknown Format "'+text+'"');
	return allFormats["Vortrag"];
}

function parseLevel(text) {
	var level = allLevels[text];
	if (level) return level;
	console.error('Unknown Level "'+text+'"');
	return allLevels["Beginner"];
}

function parseLanguage(text) {
	var language = allLanguages[text];
	if (language) return language;
	console.error('Unknown Language "'+text+'"');
	return allLanguages["Deutsch"];
}

function removeHTMLTags(text) {
    var regex = /(<([^>]+)>)/ig
    ,   body = text
    ,   result = body.replace(regex, "");
    return ent.decode(result);
}

function parseSpeakers(speakerMap, speakeruids) {
	var speakers = [];
	
	if (speakeruids == null) return [];
	
	if (typeof(speakeruids) == typeof("")) {
		speakeruids = speakeruids.split(",").map(function (item) {
			return item.trim();
		});
	}
	
	speakeruids.forEach(function (speakerId) {
		var speaker = speakerMap[eventId + '-speaker-'+speakerId];
		if (speaker != undefined) {
			speakers.push({'id': speaker.id, 'name': ent.decode(speaker.name)});
		} else {
			console.error("unknown speaker " + speakerId);
		}
	})

	return speakers;
}

function makeSpeakerURL(speakerJSON) {
    if (typeof(speakerJSON.uid) != "string") return null;
    return "https://re-publica.de/member/" + speakerJSON.uid;    
}

function parseSpeakerLinks(sourceLinks) {
	// google+ URLs are so ugly, what parsing them is non trivial, so we ignore them for now
	var linkTypes = { 'github': /^https?\:\/\/github\.com\/(\w+)$/i,
					  'twitter': /^https?\:\/\/twitter\.com\/(\w+)$/i,
					  'facebook': /^https?\:\/\/facebook\.com\/(\w+)$/i,
					  'app.net': /^https?\:\/\/(alpha\.)?app.net\.com\/(\w+)$/i };

    var links = [];
    

	for (var i = 0; i < sourceLinks.length; i++) {
		var linkURL = sourceLinks[i].url;
        if (!linkURL) continue;
        
		var label = sourceLinks[i].title;
		var username = false;
		var service = 'web';

		for (var serviceID in linkTypes) {
			if (linkURL.match(linkTypes[serviceID])) {
				service = serviceID;
				username = RegExp.$1;
			}
		}

		var linkItem = { 'url': linkURL,
										 'title': label,
										 'service': service,
										 'type': 'speaker-link' };
		if (username) linkItem['username'] = username;

		links.push(linkItem);
	}

	return links;
}

function removeNulls(obj){
  var isArray = obj instanceof Array;
  for (var k in obj){
    if (obj[k]===null) isArray ? obj.splice(k,1) : delete obj[k];
    else if (typeof obj[k]=="object") removeNulls(obj[k]);
  }
}

function clone(obj) {
	var newObj = {};
	Object.keys(obj).forEach(function (key) {
		newObj[key] = obj[key];
	})
	return newObj;
}

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
					"beacons": [],
					"location": null,
				};
				
				if (row[7] && row[7].length > 0 && row[8] && row[9]) {
					poi["location"] = {
					            "id": row[7], 
					            "label_de": row[8], 
					            "label_en": row[9]
					};
				}
				
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