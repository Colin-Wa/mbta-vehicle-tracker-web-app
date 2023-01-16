var map = L.map('map').setView([42.35095, -71.05524], 12);

var icon_size = 20;

L.tileLayer( 'https://cdn.mbta.com/osm_tiles/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a','b','c']
}).addTo( map );

var vehicle_group = L.featureGroup();

async function refresh_locations(item_seperated) {
    let all_vehicles = await concat_vehicles(item_seperated);
    update_map(all_vehicles);
}

async function concat_vehicles(item_sep)
{
    let output = new Array;
    for(let i in item_sep)
    {
        //const vehicles = await fetch("/vehicles", {
        // Comment out the line below if you want to host the server yourself and replace it with your URL
        const vehicles = await fetch("https://colinwa.org:3000/vehicles", {
            headers: {
                "route_id": item_sep[i]
            }
        }).then((res) => res.json());
        output.push.apply(output, vehicles);
    }
    return output;
}

function update_map(vehicles)
{
    var add_to_array = Array();

    // If updated list contains an element that is not on the displayed list, add it to the displayed list
    for(var i in vehicles)
    {
        if(!array_of_object_has_ids(displayed_trains, vehicles[i].vehicle.id))
        {
            add_to_array.push(vehicles[i]);
        }
    }

    for(var i = 0; i < add_to_array.length; i++)
    {
        var logo;
        var route_id = (add_to_array[i].trip.routeId).toLowerCase();

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
            logo = 'logos/' + String(route_id).toLowerCase() + '_logo.png';
        }
        var tIcon = L.icon({
            iconUrl: logo,
            iconSize: [icon_size, icon_size],
            iconAnchor: [0,0]
        });


        let tempMarker = L.marker([add_to_array[i].position.latitude, add_to_array[i].position.longitude], {icon: tIcon, rotationAngle: add_to_array[i].position.bearing})

        tempMarker.id = add_to_array[i].vehicle.id;

        tempMarker.addTo(vehicle_group);

    }

    map.addLayer(vehicle_group);

    displayed_trains = vehicles;

    Object.entries(vehicle_group._layers).map(entry => {
        
        var found = false;
        var i;
        /* If the item is found on the updated list, then it does not have to be taken off of the map */
        for(i = 0; i < vehicles.length; i++)
        {
            if(vehicles[i].vehicle.id == entry[1].id)
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

            let cstop = "Unknown";
            let dstop = "Unknown";

            try {
                cstop = vehicles[i].currentStopSequence[0];
            } catch (err) {}
    
            try {
                dstop = vehicles[i].currentStopSequence[1];
            } catch (err) {}

            entry[1].setLatLng([vehicles[i].position.latitude,vehicles[i].position.longitude]);
            try {
                entry[1]._popup.setContent(handle_popup(vehicles[i], cstop, dstop));
            }
            catch (err)
            {
                entry[1].bindPopup(handle_popup(add_to_array[i], cstop, dstop));
            }
        }
    });
}

function array_of_object_has_ids(array_of_objects, value)
{
    for(var i = 0; i < array_of_objects.length; i++)
    {
        if(array_of_objects[i].vehicle.id == value)
        {
            return true;
        }
    }
    return false;
}

function handle_popup(item, stop_name, destination)
{
    var temp_text = item.vehicle.id + " " + item.currentStatus.toLowerCase() + " " + stop_name + ", in the direction of " + destination;

    if(!isNaN(item.trip.routeId))
    {
        temp_text += " on bus route " + item.trip.routeId;
    }
    else if(item.trip.routeId.indexOf("CR") >= 0)
    {
        temp_text += " on Commuter Rail route " + item.trip.routeId;
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
        var item = document.getElementById(document.getElementById("cr-drop_down_field").value).className;
        document.getElementById("cr-drop_down_field").value = '';
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

async function toggle_path(route_id)
{
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
        var temp_layer = L.featureGroup();
        temp_layer.id = route_id;

        //const post = await fetch("/route", {
        // Comment out the line below if you want to host the server yourself and unncomment the line above
        const post = await fetch("https://colinwa.org:3000/route", {
            headers: {
                "route_id": route_id
            }
        }).then((res) => res.json());
    
        let line_style = {
            color: "#" + post[1]
        }

        L.geoJSON(post[0], {
            style: line_style,
        }).addTo(temp_layer);
        temp_layer.addTo(map);

        active_routes_list.push([route_id, temp_layer]);
    }
}

function driver(go_on)
{
    if(fetch_these_lines != "" || go_on)
    {
        refresh_locations(fetch_these_lines.split(","));
    }
}

async function populate_cr_dropdown()
{
    //const routes = await fetch("/crroutes", {
    // Comment out the line below if you want to host the server yourself and unncomment the line above
    const routes = await fetch("https://colinwa.org:3000/crroutes", {
    }).then((res) => res.json());

        for(let i in routes)
        {
            var temp = document.createElement("option");
            temp.text = routes[i].route_long_name;
            temp.id = routes[i].route_long_name;
            temp.className = routes[i].route_id;
            document.getElementById("cr-drop_down_field").appendChild(temp);
        }
    document.getElementById("cr-drop_down_field").value = '';
}

var fetch_these_lines = "";

var displayed_trains = Array();
var active_routes_list = Array();

populate_cr_dropdown();
let interval = setInterval(driver, 8000);