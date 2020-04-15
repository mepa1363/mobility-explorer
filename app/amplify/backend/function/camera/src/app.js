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

app.get("/camera/:id", function(req, res) {
  var whereClause = req.params.id === "all" ? "" : `WHERE id=${req.params.id}`;
  var query = `SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', jsonb_agg(feature)
      ) as features
      FROM (
        SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         id,
          'geometry',   ST_AsGeoJSON(location)::jsonb,
          'properties', to_jsonb(inputs) - 'id' - 'location' - 'longitude' - 'latitude'
        ) AS feature
        FROM (
          SELECT * FROM camera ${whereClause}
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

app.listen(3000, function() {
  console.log("App started");
});

module.exports = app;
