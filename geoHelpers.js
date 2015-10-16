var geoHelper = (function()
{
	/**
	 * Calculate the distance between two coordinates
	 * @returns the spherical distance in meters 
	 */
	var getDistance = function (co1, co2)
	{
		if (!co1.lat || !co2.lat || !co1.lon || !co2.lon)
			return -1;
		var R = 6.371e6; // average radius of the earth in m
		var dLat = (co2.lat-co1.lat) * Math.PI/180;
		var dLon = (co2.lon-co1.lon) * Math.PI/180; 
		var a = 
			0.5 - Math.cos(dLat)/2 +
			(0.5 - Math.cos(dLon)/2) *
			Math.cos(co1.lat * Math.PI/180) *
			Math.cos(co2.lat * Math.PI/180);
		return R * 2 * Math.asin(Math.sqrt(a)); // Distance in m
	};

	/**
	 * Transform latitude, longitude and zoom to tile coordinates
	 */
	var latlonToTilenumber = function (lat, lon, zoom)
	{
		var n = Math.pow(2, zoom);
		var lat_rad = lat * Math.PI / 180;
		return {
			"x": Math.floor(n * ((lon + 180) / 360)), 
			"y": Math.floor(n * (1 - (Math.log(Math.tan(lat_rad) + 1/Math.cos(lat_rad)) / Math.PI)) / 2) }
	};

	var tilenumberToBbox = function (x, y, zoom)
	{
		var northWest = tilenumberToLatlon(x, y, zoom);
		var southEast = tilenumberToLatlon(x + 1, y + 1, zoom);
		return {
			"t" : northWest.lat,
			"b" : southEast.lat,
			"l" : northWest.lon,
			"r" : southEast.lon,
		};
	};

	var tilenumberToLatlon = function(x, y, zoom)
	{
		var n = Math.PI - (2.0 * Math.PI * y) / Math.pow(2.0, zoom);
		return {
			"lat": Math.atan(Math.sinh(n)) *180 / Math.PI,
			"lon": x / Math.pow(2, zoom) * 360.0 - 180
		};
	};

	/*
	function padBbox(bbox, distance)
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

	return {
		"getDistance": getDistance,
		"latlonToTilenumber": latlonToTilenumber,
		"tilenumberToLatlon": tilenumberToLatlon,
		"tilenumberToBbox": tilenumberToBbox,
	};
})();
