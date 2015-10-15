// vim: tabstop=4:softtabstop=4:shiftwidth=4:noexpandtab

// GLOBAL VARIABLES
var overpassapi = "http://overpass-api.de/api/interpreter?data=";
var datasets = ["haltes_de_lijn_dataset"];
var datasetSettings = {};
var tiledData = {};
var queryStatus = {"busy": false, "waiting": false};

function loadDatasets()
{
	var layerControl = L.control.layers().addTo(mapObj);
	for (var i = 0; i < datasets.length; i++)
	{
		var dataset = datasets[i];
		var req = new XMLHttpRequest();
		req.overrideMimeType("application/json");
		req.onreadystatechange = function()
		{
			if (req.readyState != 4)
				return; // TODO error message or default data
			datasetSettings[dataset] = JSON.parse(req.responseText);
			datasetSettings[dataset].layer = new L.LayerGroup();
			layerControl.addOverlay(datasetSettings[dataset].layer, datasetSettings[dataset].displayname);
		}
		req.open("GET", dataset + ".json", true);
		req.send(null);
	}
}

function loadData()
{
	var mapBounds = mapObj.getBounds();
	var mapCenter = mapObj.getCenter();
	var mapZoom = mapObj.getZoom();
	// get center in tile coordinates
	for (var i = 0; i < datasets.length; i++)
	{
		var datasetName = datasets[i];
		if (!tiledData[datasetName])
			tiledData[datasetName] = {};
		var settings = datasetSettings[datasetName];

		if (!mapBounds.intersects([[settings.bbox.b,settings.bbox.l],[settings.bbox.t,settings.bbox.r]]))
			continue;
		if (!mapObj.hasLayer(settings.layer))
			continue;

		if (!settings.icons)
			loadIcons(settings);

		var tileCoordinates = latlonToTilenumber(mapCenter.lat, mapCenter.lng, settings.data.zoom);
		// Load 9 tiles around the center
		for (var x = tileCoordinates.x - 1; x <= tileCoordinates.x + 1; x++)
		{
			for (var y = tileCoordinates.y - 1; y <= tileCoordinates.y + 1; y++)
			{
				var tileName = x + "_" + y;
				if (tiledData[datasetName][tileName])
					continue; // tile already loaded or loading
				tiledData[datasetName][tileName] = {};

				(function(datasetName, tileName, source)
				{
					var req = new XMLHttpRequest();
					req.overrideMimeType("application/json");
					req.onreadystatechange = function()
					{
						if (req.readyState != 4)
							return;
						var data = geojsonToPointlist(JSON.parse(req.responseText));
						tiledData[datasetName][tileName].data = data;
						for (var p = 0; p < data.length; p++)
							displayPoint(datasetName, tileName, p);
						loadOverpass();
					}
					req.open("GET", source + "/" + tileName + ".json", true);
					try { req.send(null); } catch (e) {}
				})(datasetName, tileName, settings.data.source);
			}
		}
		loadOverpass();
	}
}

function loadOverpass()
{
	// Overpass only accepts one query at a time, schedule new query if query is waiting
	if (queryStatus.busy)
	{
		queryStatus.waiting = true;
		return;
	}
	queryStatus.waiting = false;
	var mapZoom = mapObj.getZoom();
	var mapBounds = mapObj.getBounds();
	var mapCenter = mapObj.getCenter();
	// Make query
	var query = "[out:json];\n";
	var types = ["node"/*,"way","rel"*/];
	var queriedDatasets = [];
	for (var d = 0; d < datasets.length; d++)
	{
		var datasetName = datasets[d];
		if (!tiledData[datasetName])
			continue;
		var settings = datasetSettings[datasetName];
		var tileCoordinates = latlonToTilenumber(mapCenter.lat, mapCenter.lng, settings.data.zoom);
		for (var x = tileCoordinates.x - 1; x <= tileCoordinates.x + 1; x++)
		{
			for (var y = tileCoordinates.y - 1; y <= tileCoordinates.y + 1; y++)
			{
				var tileName = x + "_" + y;
				var tileBbox = tilenumberToBbox(x, y, settings.data.zoom);
				// add a margin to the bbox
				var padding = 0.1;
				tileBbox.t += (tileBbox.t - tileBbox.b) * padding;
				tileBbox.b -= (tileBbox.t - tileBbox.b) * padding;
				tileBbox.r += (tileBbox.r - tileBbox.l) * padding;
				tileBbox.l -= (tileBbox.r - tileBbox.l) * padding;

				if (!tiledData[datasetName][tileName] ||
					!tiledData[datasetName][tileName].data ||
					!tiledData[datasetName][tileName].data.length)
						continue;
				if (tiledData[datasetName][tileName].overpassQueried)
					continue;
				tiledData[datasetName][tileName].overpassQueried = true;

				query += "(";
				for (var t = 0; t < types.length; t++)
					query += types[t] + settings.query + "(" + tileBbox.b + "," + tileBbox.l + "," + tileBbox.t + "," + tileBbox.r + ");";
				query += "); out center; out count;\n";

				queriedDatasets.push({"tileName": tileName, "datasetName": datasetName});
			}
		}
	}

	if (!queriedDatasets.length)
		return;

	console.log("overpass query:\n" + query);

	// Send query to overpass
	var req = new XMLHttpRequest();
	req.onreadystatechange = function()
	{
		if (req.readyState != 4)
			return;
		if (req.status != 200)
			return;
		var osmData = JSON.parse(req.responseText).elements;
		compareData(queriedDatasets, osmData);
		queryStatus.busy = false;
		if (queryStatus.waiting)
			loadOverpass();
	}
	queryStatus.busy = true;
	req.open("GET", overpassapi + encodeURIComponent(query), true);
	req.send(null);	
}

function displayPoint(datasetName, tileName, idx)
{
	var point = tiledData[datasetName][tileName].data[idx];
	var settings = datasetSettings[datasetName];
	// add marker to the data for future reference
	if (!point.marker)
		point.marker = L.marker(point.coordinates, {icon: settings.greyIcon})
			.addTo(settings.layer);

	// if the point has been compared, change its colour
	if (point.score == undefined)
		return; // only initial display

	point.marker.setIcon(settings.icons[Math.floor(10 * point.score/point.maxScore)]);
	var area = "?left="   + (point.coordinates.lon - 0.001) +
		"&right="         + (point.coordinates.lon + 0.001) +
		"&top="           + (point.coordinates.lat + 0.001) +
		"&bottom="        + (point.coordinates.lat - 0.001);
	var popupHtml = "<table style='border-collapse:collapse'>" +
		"<tr>" + 
		"<th colspan='3'><a onclick='importPoint(\""+datasetName+"\",\""+tileName+"\",\""+idx+"\")' title='Import point in JOSM'>Import Data</a></th>" +
		"<th colspan='3'><a onclick='openOsmArea(\""+area+"\")' title='Open area in JOSM'>OSM Data</a></th>" +
		"</tr>";
	
	for (var t = 0; t < settings.tagmatch.length; t++)
	{
		var tag = settings.tagmatch[t];
		var score = 0;
		if (point.osmElement && point.osmElement.tags)
			score = comparisonAlgorithms[tag.algorithm || "equality"](
				point.properties[tag.datakey],
				point.osmElement.tags[tag.osmkey]) * (tag.importance || 1);
		var colour = hslToRgb(score / 3, 1, 0.8);
		popupHtml += "<tr style='background-color:" + colour + ";'><td>";
		popupHtml += "<b>" + tag.datakey + "</b></td><td> = </td><td> " + point.properties[tag.datakey];
		popupHtml += "</td><td>";
		popupHtml += "<b>" + tag.osmkey + "</b></td><td> = </td><td>";
		if (point.osmElement && point.osmElement.tags && point.osmElement.tags[tag.osmkey])
			popupHtml += point.osmElement.tags[tag.osmkey];
		else
			popupHtml += "N/A";

		popupHtml += "</td></tr>";
	}
	popupHtml += "</table>";
	point.marker.bindPopup(popupHtml, {"maxWidth": 900});
}

function loadIcons(settings)
{
	// create the icon in 11 colours from red to green + a grey one
	settings.icons = [];
	for (var i = 0; i <= 10; i++)
	{
		var colour = hslToRgb(i / 30, 1, 0.5);
		settings.icons.push(L.MakiMarkers.icon({icon: settings.icon, color: colour, size: "m"}));
	}
	settings.greyIcon = L.MakiMarkers.icon({icon: settings.icon, color: "#808080", size: "m"});
}

function geojsonToPointlist(geojson)
{
	var results = [];
	if (!geojson.features)
		return results;

	for (var i = 0; i < geojson.features.length; i++)
	{
		// TODO skip non-point features
		var point = {};
		// switch lat and lon to the OSM standard order
		point.coordinates = {};
		point.coordinates.lat = geojson.features[i].geometry.coordinates[1];
		point.coordinates.lon = geojson.features[i].geometry.coordinates[0];
		point.properties = geojson.features[i].properties;
		results.push(point);
	}
	return results;
}

// TODO move to help file
function latlonToTilenumber(lat, lon, zoom)
{
	var n = Math.pow(2, zoom);
	var lat_rad = lat * Math.PI / 180;
	return {
		"x": Math.floor(n * ((lon + 180) / 360)), 
		"y": Math.floor(n * (1 - (Math.log(Math.tan(lat_rad) + 1/Math.cos(lat_rad)) / Math.PI)) / 2) }
}

function tilenumberToBbox(x, y, zoom) {
	var northWest = tilenumberToLatlon(x, y, zoom);
	var southEast = tilenumberToLatlon(x + 1, y + 1, zoom);
	return {
		"t" : northWest.lat,
		"b" : southEast.lat,
		"l" : northWest.lon,
		"r" : southEast.lon,
	};
}

function tilenumberToLatlon(x, y, zoom) {
	var n = Math.PI - (2.0 * Math.PI * y) / Math.pow(2.0, zoom);
	return {
		"lat": Math.atan(Math.sinh(n)) *180 / Math.PI,
		"lon": x / Math.pow(2, zoom) * 360.0 - 180
	};
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
	var r, g, b;

	if(s == 0)
	{
		r = g = b = l; // achromatic
	}
	else
	{
		function hue2rgb(p, q, t) {
			if(t < 0) t += 1;
			if(t > 1) t -= 1;
			if(t < 1/6) return p + (q - p) * 6 * t;
			if(t < 1/2) return q;
			if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}

		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}

	function toHex(n) {
		var h = Math.round(n * 255).toString(16);
		if (h.length < 2)
			h = "0" + h;
		return h;
	}

	return "#" + toHex(r) + toHex(g) + toHex(b);
}

function openOsmArea(area)
{
	var url = "http://localhost:8111/load_and_zoom" + area;
	var req = new XMLHttpRequest();
	req.open("GET", url, true);
	req.send(null);
}

function importPoint(datasetName, tileName, idx)
{
	var settings = datasetSettings[datasetName];
	var point = tiledData[datasetName][tileName].data[idx];
	var timeStr = (new Date()).toISOString();
	var url =  "http://localhost:8111/load_data?data=";
	var xml = "<osm version='0.6' generator='POI_importer'>";
	xml += "<node id='-1' "+
		"lat='" + point.coordinates.lat + "' " +
		"lon='" + point.coordinates.lon + "' " +
		"version='0' "+
		"timestamp='" + timeStr + "' " +
		"uid='1' user=''>";

	for (var t = 0; t < settings.tagmatch.length; t++)
	{
		var tag = settings.tagmatch[t];
		xml += "<tag k='" + escapeXML(tag.osmkey) + "' v='" + escapeXML(point.properties[tag.datakey]) + "'/>"
	}
	xml += "</node>"
	xml += "</osm>"

	var req = new XMLHttpRequest();
	req.onreadystatechange = function()
	{
		if (req.readyState == 4 && req.status == 400)
			// something went wrong. Alert the user with appropriate messages
			testJosmVersion();
	}
	req.open("GET", url + encodeURIComponent(xml), true);
	req.send(null);
}


function escapeXML(str)
{
	return str.replace(/&/g, "&amp;")
		.replace(/'/g, "&apos;")
		.replace(/>/g, "&gt;")
		.replace(/</g, "&lt;");
}

function testJosmVersion() {
	var req = new XMLHttpRequest();
	req.open("GET", "http://localhost:8111/version", true);
	req.send(null);
	req.onreadystatechange = function()
	{
		if (req.readyState != 4)
			return;
		var version = JSON.parse(req.responseText).protocolversion;
		if (version.minor < 6)
			alert("Your JOSM installation does not yet support load_data requests. Please update JOSM to version 7643 or newer");
	}
}

/*
function expandBbox(bbox, distance)
{
	
}

 * Go a certain distance from the coordinate to a certain bearing
 * (in degrees, clockwise from the north)

function goToDestination(co, distance, bearing)
{
	var R = 6.371e6; // average radius of the earth in m
	var lat = co.lat * Math.PI / 180;
	var lon = co.lon * Math.PI / 180;
	var brng = bearing * Math.PI / 180;

	var lat2 =  Math.asin( Math.sin(lat)*Math.cos(distance/R) +
		Math.cos(lat)*Math.sin(distance/R)*Math.cos(brng) );
	var lon2 = lon + Math.atan2(Math.sin(brng)*Math.sin(distance/R)*Math.cos(lat),
                         Math.cos(d/R)-Math.sin(lat)*Math.sin(lat2));
	return {"lat" : lat2 * 180 / Math.PI, "lon" : lon2 * 180 / Math.PI};
}*/
