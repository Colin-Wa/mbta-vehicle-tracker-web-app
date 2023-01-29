# MBTA Vehicle Tracker

Displays train positions and routes using the Leaflet library.

GTFS static and realtime data is parsed through the node-gtfs library.

The backend uses express to respond to calls from the client about route shapes and vehicle positions.

If you want to run this on your own machine:

1. Read the comments in the script.js file (There are three important comments that control which url the program accesses data through. The default URL is [colinwa.org](https://colinwa.org), but can be changed to localhost)
2. Create a database.db file in a downloaded-data directory
3. Run the refresh-gtfs.js to update the GTFS data in the sqlite database
4. Run backend.js

The backend is hosted by default at localhost:3000