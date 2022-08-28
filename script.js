var map = L.map('map').setView([42.35095, -71.05524], 12);

var icon_size = 20;

L.tileLayer( 'https://cdn.mbta.com/osm_tiles/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a','b','c']
}).addTo( map );

/* 
    Ask MBTA API for train locations, compare train ID's to the provided list of trains ID's
    - If a train on the existing list is not present on the API list, remove it from the map
    - If a train on the existing list is present on the API list, change its information
    - If a train is not on the existing list, but it is on the API list, add it to the map
*/

async function refresh_locations(lines)
{
    var vehicles_list = await call_api(lines);
    if(vehicles_list == null || vehicles_list.length <= 0)
    {
        console.error("Error calling API");
    }
    var active_trains = trains_to_objects(vehicles_list);
    update_map(active_trains);
}

/*
    Makes a call to the api based on the lines that are being displayed, passed into the function as an array of route ids
    (ex. ["Red","Orange"] fetches the red and orange line vehicles) 
*/

async function call_api(lines)
{
    if(lines.length <= 0)
    {
        return [];
    }

    var url = "https://api-v3.mbta.com/vehicles?filter[route]=" + lines;

    return await fetch(url)
    .then(response => response.json())
    .then(vehicles_json => {
        return vehicles_json;
    });
}

function trains_to_objects(vehicles_list)
{
    if(vehicles_list.length <= 0)
    {
        return [];
    }
    var train_array = Array();
    for(var i = 0; i < vehicles_list.data.length; i++)
    {
        var temp_object = new Object();
        temp_object.id = vehicles_list.data[i].id;
        temp_object.lat = vehicles_list.data[i].attributes.latitude;
        temp_object.lon = vehicles_list.data[i].attributes.longitude;
        temp_object.status = vehicles_list.data[i].attributes.current_status;
        temp_object.direction = vehicles_list.data[i].attributes.direction_id;
        temp_object.trip_id = vehicles_list.data[i].relationships.trip.data.id;
        if(vehicles_list.data[i].relationships.stop.data != null)
        {
            temp_object.next_stop = vehicles_list.data[i].relationships.stop.data.id;
        }
        else
        {
            temp_object.next_stop = "unknown";
        }
        temp_object.route_id = vehicles_list.data[i].relationships.route.data.id;
        temp_object.bearing = vehicles_list.data[i].attributes.bearing;
        train_array.push(temp_object);
    }
    return train_array;
}

/*
    Checks the list against currently displayed trains
    -removes trains not on the list
    -updates positions of trains remaining on the list
    -adds new trains that were not on the list before
*/

function update_map(updated_list)
{
    var add_to_array = Array();

    fetch('data/stops.txt')
    .then(response => response.text())
    .then(stop_data => {
        fetch('data/trips.txt')
        .then(response => response.text())
        .then(trip_data => {
        
            var stop_key = stop_data.split("\n").map(function(row){return row.split(",");})
            var trip_key = trip_data.split("\n").map(function(row){return row.split(",");})

            // If updated list contains an element that is not on the displayed list, add it to the displayed list
            for(var i = 0; i < updated_list.length; i++)
            {
                if(!array_of_object_has_ids(displayed_trains, updated_list[i].id))
                {
                    add_to_array.push(updated_list[i]);
                }
            }

            for(var i = 0; i < add_to_array.length; i++)
            {
                var logo;
                var route_id = add_to_array[i].route_id.toLowerCase();

                if(route_id.indexOf("green") >= 0)
                {
                    logo = 'logos/green_logo.png';
                }
                else if(route_id.indexOf("mattapan") >= 0)
                {
                    logo = 'logos/mattapan_logo.png';
                }
                else if(route_id == "741" || route_id == "742" || route_id == "743" || route_id == "751" || route_id == "749" || route_id == "746")
                {
                    logo = 'logos/sl_logo.png';
                }
                else if(!isNaN(route_id))
                {
                    logo = 'logos/bus_logo.png';
                }
                else if(route_id.indexOf("cr") >= 0)
                {
                    logo = 'logos/cr_logo.png';
                }
                else if(route_id.indexOf("cape") >= 0)
                {
                    logo = 'logos/cr_logo.png';
                }
                else
                {
                    logo = 'logos/' + String(add_to_array[i].route_id).toLowerCase() + '_logo.png';
                }
                var tIcon = L.icon({
                    iconUrl: logo,
                    iconSize: [icon_size, icon_size],
                    iconAnchor: [0,0]
                });

                tempMarker = L.marker([add_to_array[i].lat, add_to_array[i].lon], {icon: tIcon, rotationAngle: add_to_array[i].bearing})

                tempMarker.id = add_to_array[i].id;

                tempMarker.bindPopup(handle_popup(add_to_array[i], stop_key, trip_key));

                tempMarker.addTo(vehicle_group);
            }

            map.addLayer(vehicle_group);

            displayed_trains = updated_list;

            Object.entries(vehicle_group._layers).map(entry => {
                var found = false;
                var i;
                /* If the item is found on the updated list, then it does not have to be taken off of the map */
                for(i = 0; i < updated_list.length; i++)
                {
                    if(updated_list[i].id == entry[1].id)
                    {
                        found = true;
                        break;
                    }
                }

                if(!found)
                {
                    map.removeLayer(entry[1]);
                }
                /* Aims to update the marker location based on the trains new location retrieved from the API */
                else
                {
                    entry[1].setLatLng([updated_list[i].lat,updated_list[i].lon]);
                    entry[1]._popup.setContent(handle_popup(updated_list[i], stop_key, trip_key));
                }
            });
        });
    });
}

function array_of_object_has_ids(array_of_objects, value)
{
    for(var i = 0; i < array_of_objects.length; i++)
    {
        if(array_of_objects[i].id == value)
        {
            return true;
        }
    }
    return false;
}

function what_stop(id, stop_list)
{
    var index = stop_list.findIndex(x=>x.includes(id))
    if(index > 0)
    {
        return stop_list[index][2];
    }
    else{
        return "Unknown";
    }
}

function what_trip(id, trip_list)
{
    var index = trip_list.findIndex(x=>x.includes(id))
    if(index > 0)
    {
        return trip_list[index][3];
    }
    else{
        return "Unknown";
    }
}

function handle_popup(item, stop_key, trip_key)
{
    var temp_stop_name = what_stop(item.next_stop, stop_key);
    var temp_trip_destination = what_trip(item.trip_id, trip_key);
    var temp_text = item.id + " " + item.status.toLowerCase() + " " + temp_stop_name + ", in the direction of " + temp_trip_destination;

    if(!isNaN(item.route_id))
    {
        temp_text += " on bus route " + item.route_id;
    }
    else if(item.route_id.indexOf("CR") >= 0)
    {
        temp_text += " on Commuter Rail route " + item.route_id;
    }

    return temp_text;
}

function toggle_route(item)
{
    var these_lines = fetch_these_lines.toLowerCase();

    if(item == "Bus")
    {
        var item = document.getElementById("search").value;
        document.getElementById("search").value = '';
        if(isNaN(item))
        {
            alert("Sorry, route not found! Please enter a valid bus route number");
        }
    }
    else if(item == "CR")
    {
        var item = document.getElementById(document.getElementById("drop_down_field").value).className;
        document.getElementById("drop_down_field").value = '';
    }

    if(these_lines == "")
    {
        fetch_these_lines = String(item);
    }
    else if(these_lines.indexOf(item.toLowerCase()) < 0)
    {
        fetch_these_lines += ",";
        fetch_these_lines += String(item);
    }
    else if(these_lines.indexOf(item.toLowerCase()) >= 0)
    {
        /* If the element after the end of item is a comma, remove the item and the comma */
        if((fetch_these_lines.indexOf(item) + 1) < fetch_these_lines.length && fetch_these_lines.substring(fetch_these_lines.indexOf(item) + item.length, fetch_these_lines.indexOf(item) + item.length + 1) == ',')
        {
            fetch_these_lines = fetch_these_lines.substring(0,fetch_these_lines.indexOf(item)) + fetch_these_lines.substring(fetch_these_lines.indexOf(item) + item.length + 1);
        }
        else if(fetch_these_lines.indexOf(item) + item.length + 1 >= fetch_these_lines.length)
        {
            fetch_these_lines = fetch_these_lines.substring(0,fetch_these_lines.indexOf(item) - 1);
        }
        else{
            fetch_these_lines = fetch_these_lines.replace(item, "");
        }
    }

    var item_seperated = item.split(',');
    
    for(var i = 0; i < item_seperated.length;i++)
    {
        toggle_path(item_seperated[i]);
    }

    driver(true);
}

function toggle_path(route_id)
{
    var route = document.getElementById("drop_down_field");
    var temp_line;
    var temp_layer = L.featureGroup();
    var found = false;

    for(var i = 0; i < active_routes_list.length; i++)
    {
        if(active_routes_list[i][0] == String(route_id))
        {
            found = true;
        }
    }
  
    if(found)
    {
        for(var i = 0; i < active_routes_list.length; i++)
        {
            if(active_routes_list[i][0] == String(route_id))
            {
                map.removeLayer(active_routes_list[i][1]);
                active_routes_list.splice(i,1);
            }
        }
    }
    else
    {
        fetch("files_to_access.json")
        .then(response => response.json())
        .then(files_json => {
        var file_index = files_json.findIndex(x=>x.includes(route_id));
        if(file_index >= 0)
        {
            for(o = 0; o < files_json[file_index][1].length; o++)
            {
                fetch(files_json[file_index][1][o])
                .then(response => response.json())
                .then(shape_json => {
                    temp_line = L.polyline(shape_json[2], {color: "#" + String(shape_json[1])});
                    temp_line.addTo(temp_layer);
                    temp_layer.addTo(map);
                });
            }
        }
        else
        {
            console.log("Error, route not found");
        }
        });
            
        active_routes_list.push([route_id, temp_layer]);
    }
}

function populate_cr_dropdown()
{
    fetch("data/routes.txt")
    .then(response => response.text())
    .then(routes_text => {
      fetch("files_to_access.json")
      .then(response => response.json())
      .then(files_json => {
        var route_array = routes_text.split("\n").map(function(row){return row.split(",");});
          for(i = 1; i < route_array.length; i++)
          {
            if (route_array[i][10] == "Commuter Rail" || route_array[i][0].indexOf("CapeFlyer") >= 0)
            {
                if(files_json.findIndex(x=>x.includes(route_array[i][0])) >= 0)
                {
                var temp = document.createElement("option");
                temp.text = route_array[i][3];
                temp.id = route_array[i][3];
                temp.className = route_array[i][0];
                document.getElementById("drop_down_field").appendChild(temp);
            }
            }
          }
        document.getElementById("drop_down_field").value = '';
      });
    });
}

var fetch_these_lines = "";

/* Ongoing account of trains displayed on the map */
var displayed_trains = Array();
var active_routes_list = Array();

var vehicle_group = L.featureGroup();

vehicle_group.id = "main_group";

function driver(once_more)
{
    if(fetch_these_lines != "" || once_more)
    {
        refresh_locations(fetch_these_lines);
    }
}

populate_cr_dropdown();
var updates = setInterval(driver,8000);