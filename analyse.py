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

spelling_mistakes_street = []
spelling_mistakes_addr = []
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
	

