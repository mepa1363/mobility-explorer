var promise = require("bluebird");
var options = {
  promiseLib: promise
};
var pgp = require("pg-promise")(options);

var DATABASE_USER = "postgres";
var DATABASE_PASSWORD = "9u3URfoHgEqYXZiwG2XR";
var DATABASE_SERVER =
  "traffic-cameras-instance-1-us-east-1a.cepm2lyl9jau.us-east-1.rds.amazonaws.com";
var DATABASE_PORT = "5432";
var DATABASE_NAME = "traffic";
var connectionString = `postgres://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_SERVER}:${DATABASE_PORT}/${DATABASE_NAME}`;
var db = pgp(connectionString);

module.exports = db;
