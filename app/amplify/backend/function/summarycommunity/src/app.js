var express = require("express");
var bodyParser = require("body-parser");
var awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");
var db = require("./config");

var app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/summary/community/:when", function(req, res) {
  var when = req.params.when;
  var temporalWindow = "";
  var temporalCondition = "";

  if (when === "today") {
    temporalWindow = "minute";
    temporalCondition = "date_trunc('minute', a.time) = b.time";
  } else if (when === "past-week") {
    temporalWindow = "day";
    temporalCondition = "a.time::date > b.time - INTERVAL '1 WEEK'";
  } else if (when === "past-month") {
    temporalWindow = "day";
    temporalCondition = "a.time::date > b.time - INTERVAL '1 MONTH'";
  }
  var query = `SELECT jsonb_build_object(
                              'type', 'FeatureCollection',
                              'features', jsonb_agg(feature)
                          ) as features
                FROM (
                        SELECT jsonb_build_object(
                                        'type', 'Feature',
                                        'geometry', ST_AsGeoJSON(geom)::jsonb,
                                        'properties', to_jsonb(inputs) - 'geom'
                                    ) AS feature
                        FROM (
                                  WITH max_time AS (SELECT max(date_trunc('${temporalWindow}', time)) AS time FROM count),
                                  total_preprocssing AS (SELECT count(*) as count,
                                                            CASE
                                                                WHEN label = 'car' THEN 'Vehicle'
                                                                WHEN label = 'bicycle' THEN 'Bike'
                                                                WHEN label = 'person' THEN 'Pedestrian'
                                                            END AS label
                                                          FROM count
                                                          WHERE label IN ('car', 'bicycle', 'person')
                                                          AND confidence > 0.6
                                                          GROUP BY label),
                                  total AS (SELECT sum(count) as count, label from total_preprocssing GROUP BY label),
                                  processing AS (SELECT d.name,
                                                        count(*) as count,
                                                        CASE
                                                            WHEN label = 'car' THEN 'Vehicle'
                                                            WHEN label = 'bicycle' THEN 'Bike'
                                                            WHEN label = 'person' THEN 'Pedestrian'
                                                        END AS label
                                                  FROM count AS a,
                                                      max_time AS b,
                                                      camera AS c,
                                                      calgary_communities AS d
                                                  WHERE ${temporalCondition}
                                                    AND label IN ('car', 'bicycle', 'person')
                                                    AND confidence > 0.6
                                                    AND a.camera_id = c.id
                                                    AND st_intersects(c.location, d.geom)
                                                  GROUP BY a.label, d.name)
                              SELECT a.name, a.label, sum(a.count) / sum(b.count) as rate, c.geom
                              from processing AS a,
                                  total AS b,
                                  calgary_communities AS c
                              WHERE c.name = a.name
                              group by a.name, a.label, c.geom
                              ) inputs
                    ) features;`;

  db.any(query)
    .then(response => {
      res.json(response[0].features);
    })
    .catch(error => {
      res.json(error);
    });
});

app.listen(3005, function() {
  console.log("App started");
});

module.exports = app;
