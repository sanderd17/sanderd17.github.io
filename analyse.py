#! /bin/python

'''
vim: tabstop=2:softtabstop=2:shiftwidth=2:noexpandtab
'''

# CSV documentation
OSM_TYPE = 0
OSM_ID = 1
HIGHWAY = 2
NAME = 3
NAME_FR = 4
NAME_NL = 5
ADDR_STREET = 6
ADDR_STREET_FR = 7
ADDR_STREET_NL = 8

spelling_mistakes_street = [] # list of tupels
spelling_mistakes_addr = [] # list of tupels
addr_without_street = [] # list of french names
inconsistent_names = [] # list of french names

streets_dict = {}
streets_dict_fr = {}
streets_dict_nl = {}
addr_dict = {}
addr_dict_fr = {}
addr_dict_nl = {}

import csv
with open('names.csv', newline='') as csvfile:
	names = csv.reader(csvfile, delimiter='\t', quotechar='"')

	for row in names:
		if len(row[HIGHWAY]) > 0: 
			street = (row[OSM_TYPE], row[OSM_ID], row[NAME], row[NAME_FR], row[NAME_NL])

			# for highways, compare the name
			is_fr_nl = row[NAME] == row[NAME_FR] + " - " + row[NAME_NL]
			is_nl_fr = row[NAME] == row[NAME_NL] + " - " + row[NAME_FR]
			if not is_fr_nl and not is_nl_fr:
				spelling_mistakes_street.append(street)
				continue

			# index the streets by name
			if row[NAME] in streets_dict:
				streets_dict[row[NAME]].append(street)
			else:
				streets_dict[row[NAME]] = [street]

			if row[NAME_FR] in streets_dict_fr:
				streets_dict_fr[row[NAME_FR]].append(street)
			else:
				streets_dict_fr[row[NAME_FR]] = [street]

			if row[NAME_NL] in streets_dict_nl:
				streets_dict_nl[row[NAME_NL]].append(street)
			else:
				streets_dict_nl[row[NAME_NL]] = [street]

		else:

			addr = (row[OSM_TYPE], row[OSM_ID], row[ADDR_STREET], row[ADDR_STREET_FR], row[ADDR_STREET_NL])
			# for addresses, compare the addr:street tags
			is_fr_nl = row[ADDR_STREET] == row[ADDR_STREET_FR] + " - " + row[ADDR_STREET_NL]
			is_nl_fr = row[ADDR_STREET] == row[ADDR_STREET_NL] + " - " + row[ADDR_STREET_FR]
			if not is_fr_nl and not is_nl_fr:
				spelling_mistakes_addr.append(addr)
				continue

			#index the addresses
			if row[ADDR_STREET] in addr_dict:
				addr_dict[row[ADDR_STREET]].append(addr)
			else:
				addr_dict[row[NAME]] = [addr]

			if row[ADDR_STREET_FR] in addr_dict_fr:
				addr_dict_fr[row[ADDR_STREET_FR]].append(addr)
			else:
				addr_dict_fr[row[ADDR_STREET_FR]] = [addr]

			if row[ADDR_STREET_NL] in addr_dict_nl:
				addr_dict_nl[row[ADDR_STREET_NL]].append(addr)
			else:
				addr_dict_nl[row[ADDR_STREET_NL]] = [addr]
	

spelling_mistakes_street = sorted(spelling_mistakes_street, key=lambda x: x[2])
spelling_mistakes_addr = sorted(spelling_mistakes_addr, key=lambda x: x[2])

# iterate over the names in one language
for name_fr in addr_dict_fr:
	addr_list = addr_dict_fr[name_fr]
	name = addr_list[0][2]
	name_nl = addr_list[0][4]

	# For every address, we must find street names
	if name_fr not in streets_dict_fr:
		addr_without_street.append(name_fr)
		continue
	if name_nl not in streets_dict_nl:
		addr_without_street.append(name_fr)
		continue


	success = True
	# all names should be the same
	for addr in addr_list:
		if not name == addr[3]:
			inconsistent_names.append(name_fr)
			success = False
			break
		if not name_nl == addr[4]:
			inconsistent_names.append(name_fr)
			success = False
			break
	if not success:
		continue

	# also compare the other way around
	for addr in addr_dict_nl[name_nl]:
		if not name_fr == addr[2]:
			inconsistent_names.append(name_fr)
			inconsistent_names.append(addr[2])
			success = False
			break
	if not success:
		continue
			

	for street in street_dict_fr[name_fr]:
		if not name == street[3]:
			inconsistent_names.append(name_fr)
			success = False
			break
		if not name_nl == street[4]:
			inconsistent_names.append(name_fr)
			success = False
			break
	if not success:
		continue

	# also compare the other way around
	for street in street_dict_nl[name_nl]:
		if not name_fr == street[2]:
			inconsistent_names.append(name_fr)
			inconsistent_names.append(addr[2])
			success = False
			break
	if not success:
		continue

f = open('localisation_street.html', 'w')	
f.write("<html>\n<head><meta charset=\"utf-8\"></head>\n<body>\n")
f.write("<h2>Streets with spelling mistakes or missing localisations</h2>\n<table>\n")
for t in spelling_mistakes_street:
	f.write("<tr><td><a href='http://osm.org/"+t[0]+"/"+t[1]+"'>"+t[2]+"</a></td><td>"+t[3]+"</td><td>"+t[4]+"</td></tr>\n")
f.write("<h2>Streets with spelling mistakes or missing localisations</h2>\n<table>\n")

f.write("</table>\n")
f.write("</body>\n</html>")
f.close()

f = open('localisation_addr.html', 'w')	
f.write("<html>\n<head><meta charset=\"utf-8\"></head>\n<body>\n")
f.write("<h2>Addresses with spelling mistakes or missing localisations</h2>\n<table>\n")
for t in spelling_mistakes_addr:
	f.write("<tr><td><a href='http://osm.org/"+t[0]+"/"+t[1]+"'>"+t[2]+"</a></td><td>"+t[3]+"</td><td>"+t[4]+"</td></tr>\n")
f.write("</table>\n")
f.write("</body>\n</html>")
f.close()


'''
spelling_mistakes_street = [] # list of tupels
spelling_mistakes_addr = [] # list of tupels
addr_without_street = [] # list of french names
inconsistent_names = [] # list of french names
'''
