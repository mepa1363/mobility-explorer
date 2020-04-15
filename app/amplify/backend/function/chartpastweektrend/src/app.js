var express = require("express");
var bodyParser = require("body-parser");
var awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");
var sortBy = require("lodash.sortby");
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

app.get("/trend/past-week/:id", function(req, res) {
  var cameraId = req.params.id;
  // CHART: return sum of count for each object for a day (today) on an hourly basis for a given camera and all cameras
  var query =
    cameraId === "all"
      ? `WITH max_date AS (SELECT max(time::date) as date from count),
            processing AS (SELECT count(*)                as count,
                                date_trunc('day', a.time) AS day,
                                CASE
                                    WHEN label = 'car' THEN 'Vehicle'
                                    WHEN label = 'bicycle' THEN 'Bike'
                                    WHEN label = 'person' THEN 'Pedestrian'
                                END AS label
                            FROM count AS a,
                                max_date AS b
                            WHERE b.date - INTERVAL '1 WEEK' < a.time::date
                            AND a.time::date < b.date
                            AND label IN ('car', 'bicycle', 'person')
                            AND confidence > 0.6
                            GROUP BY a.label, day)
        SELECT sum(count), (day AT TIME ZONE 'UTC') AT TIME ZONE 'MDT' as day, label
        FROM processing
        GROUP BY day, label;`
      : `WITH max_date AS (SELECT max(time::date) as date from count WHERE camera_id = ${cameraId}),
            processing AS (SELECT count(*)                as count,
                                date_trunc('day', a.time) AS day,
                                CASE
                                    WHEN label = 'car' THEN 'Vehicle'
                                    WHEN label = 'bicycle' THEN 'Bike'
                                    WHEN label = 'person' THEN 'Pedestrian'
                                END AS label
                            FROM count AS a,
                                max_date AS b
                            WHERE b.date - INTERVAL '1 WEEK' < a.time::date
                            AND a.time::date < b.date
                            AND camera_id = ${cameraId}
                            AND label IN ('car', 'bicycle', 'person')
                            AND confidence > 0.6
                            GROUP BY a.label, day)
        SELECT sum(count), (day AT TIME ZONE 'UTC') AT TIME ZONE 'MDT' as day, label
        FROM processing
        GROUP BY day, label;`;

  db.any(query)
    .then(response => {
      var vehicles = response
        .filter(item => item.label === "Vehicle")
        .map(item => {
          return { x: item.day, y: parseInt(item.sum) };
        });
      var pedestrians = response
        .filter(item => item.label === "Pedestrian")
        .map(item => {
          return { x: item.day, y: parseInt(item.sum) };
        });
      var bikes = response
        .filter(item => item.label === "Bike")
        .map(item => {
          return { x: item.day, y: parseInt(item.sum) };
        });
      res.json({
        vehicles: sortBy(vehicles, "x"),
        pedestrians: sortBy(pedestrians, "x"),
        bikes: sortBy(bikes, "x")
      });
    })
    .catch(error => {
      res.json(error);
    });
});

app.listen(3002, function() {
  console.log("App started");
});

module.exports = app;
