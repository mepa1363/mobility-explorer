Mobility Explorer is a traffic monitoring platform that collects data from traffic cameras, detects human, car, and bike movements from images, and visualizes the results on a map. It enables users to understand mobility patterns in different geographic areas at a glance, and determine areas at risk from overcrowding, and take an informed action. Such information helps both public officials and emergency responders (e.g., humanitarian organizations, city officials, or local actors) control and enforce social distancing measures in a pandemic and see where measures are or are not working.

Mobility Explorer is built using open source software, open standards, and open data: Node.js and Express, PostgreSQL/PostGIS, Vue.js, Vuetify, and Mapbox GL JS are used to create the system components. It collects images from the City of Calgary’s open data API, analyzes them using three deep learning models available on AWS Marketplace (Human Detector, Scooter and Bicycle Detector, and Vehicle Detector), and displays mobility patterns on a map. The application is hosted on Amazon’s AWS infrastructure.

See [app](https://github.com/mepa1363/mobility-explorer/tree/master/app) for the frontend app and backend API developed by AWS Amplify, Vue.js, Vuetify, and Mapboxgl.js.

See [scheduled-cron](https://github.com/mepa1363/mobility-explorer/tree/master/scheduled-cron) for the data procesing and machine learning apps developed by SageMaker.

See more information [here](https://devpost.com/software/mobility-explorer)
