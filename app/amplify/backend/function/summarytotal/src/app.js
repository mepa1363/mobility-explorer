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

app.get("/summary/total/:id/:when", function(req, res) {
  var cameraId = req.params.id;
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
  // return sum of count for each object type for current time (latest observation) for a given camera and all cameras
  var query =
    cameraId === "all"
      ? `WITH max_time AS (SELECT max(date_trunc('${temporalWindow}', time)) AS time FROM count),
              processing AS (SELECT count(*) as count,
                                CASE
                                    WHEN label = 'car' THEN 'Vehicle'
                                    WHEN label = 'bicycle' THEN 'Bike'
                                    WHEN label = 'person' THEN 'Pedestrian'
                                END AS label
                              FROM count AS a, max_time AS b
                              WHERE ${temporalCondition} 
                                  AND label IN ('car', 'bicycle', 'person')
                                  AND confidence > 0.6
                              GROUP BY a.label)
          SELECT sum(count), label FROM processing GROUP BY label;`
      : `WITH max_time AS (SELECT max(date_trunc('${temporalWindow}', time)) AS time FROM count WHERE camera_id=${cameraId}),
              processing AS (SELECT count(*) as count,
                                CASE
                                    WHEN label = 'car' THEN 'Vehicle'
                                    WHEN label = 'bicycle' THEN 'Bike'
                                    WHEN label = 'person' THEN 'Pedestrian'
                                END AS label
                              FROM count AS a, max_time AS b
                              WHERE ${temporalCondition} 
                                  AND camera_id=${cameraId} 
                                  AND label IN ('car', 'bicycle', 'person')
                                  AND confidence > 0.6
                              GROUP BY a.label)
          SELECT sum(count), label FROM processing GROUP BY label;`;

  db.any(query)
    .then(response => {
      res.json(response);
    })
    .catch(error => {
      res.json(error);
    });
});

app.listen(3004, function() {
  console.log("App started");
});

module.exports = app;
