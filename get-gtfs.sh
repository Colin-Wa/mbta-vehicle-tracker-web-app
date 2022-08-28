#!/bin/sh

url=http://cdn.mbta.com/MBTA_GTFS.zip
directory=/var/www/html/mbta/tracker

cd $directory
rm -r data
mkdir data; cd data; pwd
curl -LO $url
unzip MBTA_GTFS.zip
rm MBTA_GTFS.zip
cd ..; node create_files.js