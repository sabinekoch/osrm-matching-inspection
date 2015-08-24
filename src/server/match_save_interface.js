var matchTrace = require('../match_trace.js'),
    fs = require('fs');
    var polyline = require('polyline');

module.exports = function(app, db, osrm) {
  app.get('/match_save/:id', function(req, res) {
    var id = parseInt(req.params.id),
        subId, 
        total,
        sum = 0;

    db.get("SELECT file FROM traces WHERE id = ? LIMIT 1", id, function(err, row) {
      if (err) {
        res.send(JSON.stringify({status: "error"}));
        return;
      }
      var file_match = "./" + row.file.split('.')[0] + "_matched.geojson",
          file_start = '{\n"type": "FeatureCollection",\n"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },\n\n"features": [\n\n';

      fs.writeFileSync(file_match, file_start, "UTF-8",{'flags': 'w+'});

      matchTrace( 0,id, osrm, row.file, function(err, result) {
        if (err) {
          res.send(JSON.stringify({status: "error"}));
          return;
        }
        total = result.total;
        if (total > 100) total = 100;
        
        var list = [];
        for (i = 0; i< total; i++) {
          list.push(i)}

        list.forEach( function(element){
          matchTrace( element,id, osrm, row.file, function(err, result) {
            sum ++;
     
            if (err) {
              res.send(JSON.stringify({status: "error"}));
              return;
            }
            
            // if (!result.route_id) result.route_id = -1;
            var feature_start = 
              '{ "type": "Feature", "properties": { "route_id":' + result.route_id +
              ', "route_short_name": "' + result.route_short_name +
              '" , "route_long_name": "' + result.route_long_name +
              '"}, "geometry": { "type": "LineString", "coordinates":';
            
            // var unique = {};
            // var distinct = [];
            // result.route_id.forEach(function (x) {
            //   if (!unique[x.age]) {
            //     distinct.push(x.age);
            //     unique[x.age] = true;
            //   }
            // });
            // console.log(unique)
            fs.appendFile(file_match, (feature_start));
            result.matchings.forEach( function (matching){
              // console.log(polyline.decode(matching.geometry, 6).length) 
              var geometry_matched = []
              polyline.decode(matching.geometry, 6).forEach( function (geom_elem){ 
              
                // console.log("elem")
                // console.log(geom_elem)

                var b = geom_elem[0];
                    geom_elem[0] = geom_elem[1];
                    geom_elem[1] = b;
                // console.log(geom_elem)

                geometry_matched.push(geom_elem)
              })
              fs.appendFile(file_match, (JSON.stringify(geometry_matched) + " }}"));

              // fs.appendFile(file_match, (feature_start + JSON.stringify(matching.matched_points) + " } }"));
              if (sum === total){
                fs.appendFile(file_match, "\n]\n}");
                // res.send(JSON.stringify(file_match));
              } else fs.appendFile(file_match, ",\n");
            });
          });
        });
      });
    });
  });
}

