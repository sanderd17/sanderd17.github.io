function compareData(datasets, osmData)
{
	// split per dataset
	var i = -1;
	for (var d = 0; d < datasets.length; d++)
	{
		datasets[d].osmData = [];
		while (!osmData[++i].count)
			datasets[d].osmData.push(osmData[i]);
	}

	
	for (var d = 0; d < datasets.length; d++)
	{
		var data = tiledData[datasets[d].datasetName][datasets[d].tileName].data;
		var settings = datasetSettings[datasets[d].datasetName];
		var maxScore = 1;
		for (var t = 0; t < settings.tagmatch.length; t++)
			maxScore += settings.tagmatch[t].importance || 1;
		for (var p = 0; p < data.length; p++)
		{
			var point = data[p];
			point.maxScore = maxScore;
			point.score = 0;
			point.osmElement = {};

			var bestScore = 0;
			for (var i = 0; i < datasets[d].osmData.length; i++)
			{
				var element = datasets[d].osmData[i];
				if (getDistance(element.center || element, point.coordinates) > settings.dist)
					continue;

				var score = 1;
				for (var t = 0; t < settings.tagmatch.length; t++)
				{
					var tag = settings.tagmatch[t];
					score += comparisonAlgorithms[tag.algorithm || "equality"](
						point.properties[tag.datakey],
						element.tags[tag.osmkey]) * (tag.importance || 1);
				}
				if (score > bestScore)
				{
					point.osmElement = element;
					point.score = score;
					bestScore = score;
				}
			}
			displayPoint(datasets[d].datasetName, datasets[d].tileName, p);
		}
	}
	console.log(uneval(datasets));
	//console.log(uneval(osmData));
}

// every comparison algorithm returns a value between 0 and 1
// where 0 is non-matching and 1 is perfectly matching
// TODO alternative algorithms: levenshtein, opening hours equivalence, ...:
var comparisonAlgorithms = {
	"equality": function(v1, v2)
	{
		if (v1 == v2)
			return 1;
		return 0;	
	},
	/**
	 * Checks if all elements of the semicolumn separated list v1 are in v2
	 */
	"inList": function(v1, v2)
	{
		if (!v1 || !v2)
			return false;
		var l1 = v1.split(";");
		var l2 = v2.split(";");
		for (var i = 0; i < l1.length; i++)
			if (l2.indexOf(l1[i]) == -1)
				return false;
		return true;
	},
	/**
	 * Checks if two lists contain the same elements (not neccesarily the same order)
	 */
	"equalList": function(v1, v2)
	{
		return comparisonAlgorithms.inList(v1, v2) && comparisonAlgorithms.inList(v2, v1);
	},
	"presence": function(v1, v2)
	{
		if (v1 != null && v2 != null)
			return 1;
		return 0;
	},
};

/**
 * Calculate the distance between two coordinates
 * @returns the spherical distance in meters 
 */
function getDistance(co1, co2)
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
}
