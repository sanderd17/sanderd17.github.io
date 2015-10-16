var htmlHelper = (function()
{

	var addDataset = function (country, displayname, id)
	{

		if (!document.getElementById(country + "Section"))
		{
			// TODO sort alphabetically per country
			var settingsPane = document.getElementById("datasetPane");
			var innerHTML = settingsPane.innerHTML;
			innerHTML += '<p><a ' +
					'name="' + country + '" '+
					'id="' + country + 'Collapser" ' +
					' onclick="htmlHelper.collapseSection(\'' + country + '\')">▼</a> ' +
					country +
					'</p>' +
					"<div id='" + country + "Section'></div>";
			settingsPane.innerHTML = innerHTML;
			collapseSection(country);
		}
		// TODO sort alphabetically per dataset
		var section = document.getElementById(country + "Section");
		var innerHTML = section.innerHTML;
		innerHTML += '<input type="checkbox" id="' + id + 'Dataset" onchange="toggleDataset(\'' + dataset + '\',this)" />' + displayname + '<br/>';
		console.log(innerHTML);
		section.innerHTML = innerHTML;
	};

	var collapseSection = function (id)
	{
		var section = document.getElementById(id + "Section");
		var collapser = document.getElementById(id + "Collapser");
		if (!section || !collapser)
			return;
		if (section.style.display == "none")
		{
			section.style.display = "";
			collapser.innerHTML = "\u25bc";
		}
		else
		{
			section.style.display = "none";
			collapser.innerHTML = "\u25b6";
		}
	};

	return {
		"addDataset": addDataset,
		"collapseSection": collapseSection,
	};
}
