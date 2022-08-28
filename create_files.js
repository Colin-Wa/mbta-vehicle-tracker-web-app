const fs = require('fs');

var completed_routes = Array();
var coord_obj = Array();
var trip_list = Array();
var files_to_access = Array();
var active_routes = Array();


fs.readFile('data/shapes.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  fs.readFile('data/trips.txt', 'utf8', (err, data2) => {
    if (err) {
        console.error(err);
        return;
    }
    fs.readFile('data/routes.txt', 'utf8', (err, data3) => {
            if (err) {
                console.error(err);
                return;
            }
            fs.readFile('data/calendar.txt', 'utf8', (err, data4) => {
                if (err) {
                    console.error(err);
                    return;
                }
                fs.readFile('data/calendar_dates.txt', 'utf8', (err, data5) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    var cell_array = data.split("\n").map(function(row){return row.split(",");});
                    var trip_array = data2.split("\n").map(function(row){return row.split(",");});
                    var route_array = data3.split("\n").map(function(row){return row.split(",");});
                    var calendar_array = data4.split("\n").map(function(row){return row.split(",");});
                    var calendar_dates_array = data5.split("\n").map(function(row){return row.split(",");});

                    /* Check which routes are active today */

                    var date_time = new Date();

                    /* Convert the day of the week to an index for calendar.txt */

                    dow_index = ((date_time.getDay() + 6) % 7) + 1;

                    for(var u = 1; u < calendar_array.length; u++)
                    {
                        if(calendar_array[u].length == 10)
                        {
                            var temp_date_lower = new Date(Number(calendar_array[u][8].slice(0,4)), Number(calendar_array[u][8].slice(4,6)) - 1, Number(calendar_array[u][8].slice(6,8)));
                            var temp_date_upper = new Date(Number(calendar_array[u][9].slice(0,4)), Number(calendar_array[u][9].slice(4,6)) - 1, Number(calendar_array[u][9].slice(6,8)));

                            // Check if the current date contains this special schedule

                            if(calendar_array[u][dow_index] == 1 && date_time >= temp_date_lower && date_time <= temp_date_upper && calendar_array[u][0])
                            {
                                active_routes.push(calendar_array[u][0]);
                            }
                        }
                    }

                    for(var t = 1; t < calendar_dates_array.length; t++)
                    {
                        if(calendar_dates_array[t].length == 4)
                        {
                            var temp_date_holidays = new Date(Number(calendar_dates_array[t][1].slice(0,4)), Number(calendar_dates_array[t][1].slice(4,6)) - 1, Number(calendar_dates_array[t][1].slice(6,8)));
                            if(temp_date_holidays == date_time)
                            {
                                if(calendar_dates_array[t][2] == 2)
                                {
                                    active_routes.splice(calendar_dates_array.findIndex(x=>x.includes(calendar_dates_array[t][0])),calendar_dates_array.findIndex(x=>x.includes(calendar_dates_array[t][0])) + 1);
                                }
                                else{
                                    active_routes.push(calendar_dates_array[t][0]);
                                }
                            }
                        }
                    }
                    

                    for(b = 0; b < trip_array.length; b++)
                    {
                        /* Hardcoded Solution to weird redundant Franklin Line and Haverhill Line data provided by MBTA GTFS */
                        if(trip_list.indexOf(trip_array[b][7]) < 0 && trip_array[b][5] == 0 && active_routes.findIndex(x=>x.includes(trip_array[b][1])) >= 0 && trip_array[b][7] != "9820004" && trip_array[b][7] != "9880003")
                        {
                            trip_list.push(trip_array[b][7]);
                        }
                    }

                    for(ti = 0; ti < trip_list.length; ti++)
                    {
                        var i = cell_array.findIndex(x=>x.includes(trip_list[ti]));
                        if(i > 0)
                        {
                            if(completed_routes.indexOf(cell_array[i][0]) < 0)
                            {
                                var route_id;
                                var temp_obj = Array();
                                var trip_index = trip_array.findIndex(x=>x.includes(cell_array[i][0]));
                                var route_subsections = route_array.map(function (subarray) {
                                    return subarray.slice(0,1);
                                })
                                var temp_var_obj = Array();
                                completed_routes.push(cell_array[i][0]);
                                route_id = trip_array[trip_index][0];
                                temp_obj.push(route_id);
                                var route_index = route_subsections.findIndex(x=>x.includes(route_id));
                                temp_obj.push(route_array[route_index][7]);
                                for(j = i; j < cell_array.length; j++)
                                {
                                    if(completed_routes[completed_routes.length - 1] == cell_array[j][0])
                                    {
                                        var temp_pair = Array();
                                        temp_pair.push(cell_array[j][1]);
                                        temp_pair.push(cell_array[j][2]);
                                        temp_var_obj.push(temp_pair);
                                    }
                                }
                                temp_obj.push(temp_var_obj);
                                coord_obj.push(temp_obj);
                            }
                        }
                    }
                    for(k = 0; k < coord_obj.length; k++)
                    {
                        current_obj = String(coord_obj[k][0]);
                        var temp_obj = Array();
                        var temp_array_obj = Array();
                        var title_index = files_to_access.findIndex(x=>x.includes(current_obj));
                        if(title_index < 0)
                        {
                            temp_array_obj.push("route_coordinates/" + current_obj + "/" + current_obj + "(" + k + ").json");
                            temp_obj.push(current_obj, temp_array_obj);
                            files_to_access.push(temp_obj);
                        }
                        else
                        {
                            files_to_access[title_index][1].push("route_coordinates/" + current_obj + "/" + current_obj + "(" + k + ").json");
                        }
                    }
                    fs.writeFile("files_to_access.json", JSON.stringify(files_to_access), function (err) {
                        if(err)
                        {
                            return console.log(err);
                        }
                    });
                    for(k = 0; k < coord_obj.length; k++)
                    {
                        current_obj = String(coord_obj[k][0]);
                        fs.mkdir("route_coordinates/" + current_obj, { flag: 'wx' }, (error) => {
                            if (error && error.code != "EEXIST") {
                            console.log(error);
                            }
                        });
                    }
                    for(k = 0; k < coord_obj.length; k++)
                    {
                        current_obj = String(coord_obj[k][0]);
                        fs.writeFile("route_coordinates/" + current_obj + "/" + current_obj + "(" + k + ").json", JSON.stringify(coord_obj[k]), function (err) {
                            if(err)
                            {
                                return console.log(err);
                            }
                        });
                    }
                });
            });
        });
    });
});