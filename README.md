# Overpass Query

```C
[out:csv(
  ::type,
  ::id,
  "name",
  "name:fr",
  "name:nl",
  "addr:street",
  "addr:street:fr",
  "addr:street:nl")];

area["admin_level"=4]["name:en"="Brussels-Capital"]->.brussels;
(
  way[highway][name](area.brussels);
  node["addr:street"](area.brussels);
  way["addr:street"](area.brussels);
  rel["addr:street"](area.brussels);
);
out;
```
