import express from "express";
const app = express()

import fetch from "node-fetch";

import { readFile, readFileSync } from "fs";

import { openDb, getRoutes } from 'gtfs';

import { getShapesAsGeoJSON } from 'gtfs';

import https from 'https';

import { getTrips } from 'gtfs';

import { getStops } from 'gtfs';

import path from 'path';
import {fileURLToPath} from 'url';

import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

let db;

app.use(express.static(__dirname + '/public'));

app.get('/route', (req, res) => {
  let rid = req.headers.route_id;
  let output = null;

  if(rid != null)
  {
    geoJSON_from_route_id(rid).then(resp => {
      output = resp;
    }).then(r => {
      res.send(output);
      return;
    });
  }
  else
  {
    res.send(output);
  }
});

app.get('/vehicles', (req, res) => {
  let rid = req.headers.route_id;
  let output = new Array;
  if(rid != null)
  {
    get_positions_by_route_id(rid).then(resp => {
      output = resp;
    }).then(r => {
      res.send(output);
      return;
    });
  }
  else
  {
    res.send(null);
  }
})

app.get('/crroutes', (req, res) => {
  get_cr_routes().then(resp => {
    res.send(resp)
  });
});

app.get('/aroutes', (req, res) => {
  get_all_routes().then(resp => {
    res.send(resp)
  });
});

app.get('/mbta-app', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(3000, () => {
  readFile('./config.json', (err, config) => {
    db = openDb(JSON.parse(config));
    console.log('Listening on port 3000');
  });
});

async function get_cr_routes()
{
  const cr_routes = db.prepare('SELECT * FROM routes WHERE route_id LIKE ? OR route_id LIKE ?').all("CR-%", "%CapeFlyer%");

  return cr_routes;
}

async function get_all_routes()
{
  const aroutes = await getRoutes();

  return aroutes;
}

async function geoJSON_from_route_id(rid)
{
  const colors = await db.prepare(
    'SELECT * FROM routes WHERE route_id = ?'
  ).all(rid);

  const shapesGeojson = await getShapesAsGeoJSON({
    route_id: rid
  });

  let color_type = "000000"

  if(colors[0].route_color != null)
  {
    color_type = colors[0].route_color;
  }
  return [shapesGeojson, color_type];
}


async function get_positions_by_route_id(rid)
{
  try {
    const response = await fetch("https://cdn.mbta.com/realtime/VehiclePositions.pb", {
      headers: {},
    });
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    var vehicles = await get_vehicle_list(feed,rid);
    return vehicles;
  }
  catch (error) {
    console.log(error);
    return null;
  }
}

async function get_stops(vehicle)
{
  const trips = await getTrips({
    trip_id: vehicle.trip.tripId,
    direction_id: vehicle.trip.directionId
  });

  const stops = await getStops({
    stop_id: vehicle.stopId,
  });

  if(trips.length <= 0 || stops.length <= 0)
  {
    return null;
  }

  let destination = trips[0].trip_headsign;
  let cur_stop = stops[0].stop_name;

  return [cur_stop, destination];
}

async function get_vehicle_list(feed,rid)
{
  let vehicles = new Array;
  for(var i in feed.entity)
  {
    if (feed.entity[i].vehicle.trip.routeId == rid) {
      let obj = feed.entity[i].vehicle;
      obj.currentStopSequence = await get_stops(feed.entity[i].vehicle);
      vehicles.push(obj);
    }
  }
  return vehicles;
}