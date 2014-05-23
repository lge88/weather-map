
function Station(id, lat, lon, weight) {
  this.id = id;
  this.lat = parseFloat(lat);
  this.lon = parseFloat(lon);
  this.weight = parseInt(weight);
}

function PartionNode(id, coord, threshold) {
  this.id = id;
  this.coord = coord;
  this.threshold = parseFloat(threshold);
}

PartionNode.prototype.getIntIdAtLevel = function(level) {
  var id = this.id;
  if (level === null || typeof level === 'undefined') { level = id.length; }
  if (id === '') { return 0; }
  id = id.slice(0, level);
  return parseInt(id, 2) + 1;
};

function MarkerStyleGenerator() {
  this.colors = [
    'blue',
    'brown',
    'darkgreen',
    'green',
    'orange',
    'paleblue',
    'pink',
    'purple',
    'red',
    'yellow'
  ];
  this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  this.indices = shuffle(range(260));
}

MarkerStyleGenerator.prototype.get = function(i) {
  var indx = this.indices[i % 260];
  var cIndx = indx % 10, lIndx = Math.floor(indx / 10);
  var color = this.colors[cIndx], letter = this.letters[lIndx];
  return color + '_Marker' + letter;
};

function WeatherMapApp() {

  this.options = {};
  this.options.stationsCSVFileUrl = 'data/stations-sampled-1-of-100.csv';
  this.options.partitionTreeCSVFileUrl = 'data/partition-tree-yoav.csv';
  this.options.stationToNodeCSVFileUrl = 'data/station-to-node-yoav.csv';
  this.options.showStations = true;
  this.options.showStationsWithUndefinedNode = false;
  this.options.level = 4;

  this.stations = [];
  this.markerStyleGenerator = new MarkerStyleGenerator();

  this.mapElement = document.getElementById('map');
  this.map = new google.maps.Map(this.mapElement, {
    zoom: 2,
    center: new google.maps.LatLng(0, 0),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
}

WeatherMapApp.prototype.update = function() {
  this.clearAll();
  this.drawAll();
};

WeatherMapApp.prototype.drawAll = function() {
  this.drawStations();
};

WeatherMapApp.prototype.clearAll = function() {
  this.clearStations();
};

WeatherMapApp.prototype.clearStations = function() {
  this.stations.forEach(function(s) {
    var marker = s._marker;
    if (marker) { marker.setMap(null); }
    delete s._marker;
  });
};

WeatherMapApp.prototype.loadStations = function(cb) {
  var _this = this, url = this.options.stationsCSVFileUrl;
  this.stations = [];

  getTextFileFromUrl(url, function(str) {
    _this.stations = csvToList(str).map(function(item) {
      return new Station(item[0], item[1], item[2], item[3]);
    });
    if (typeof cb === 'function') { cb(_this.stations); }
  });
};

WeatherMapApp.prototype.loadPartionTree = function(cb) {
  var _this = this, url = this.options.partitionTreeCSVFileUrl;
  this.nodes = [];
  this._nodes_map = {};

  getTextFileFromUrl(url, function(str) {
    _this.nodes = csvToList(str).map(function(item) {
      return new PartionNode(item[0], item[1], item[2]);
    });
    _this.nodes.forEach(function(n) { _this._nodes_map[n.id] = n; });
    if (typeof cb === 'function') { cb(_this.nodes); }
  });
};


WeatherMapApp.prototype.loadStationToNode = function(cb) {
  var _this = this, url = this.options.stationToNodeCSVFileUrl;
  var stations = this.stations, nodes = this.nodes;
  if (stations.length <= 0) return;

  getTextFileFromUrl(url, function(str) {
    var stationToNodeTable = {};
    csvToList(str).forEach(function(item) {
      var stationId = item[0], nodeId = item[1];
      stationToNodeTable[stationId] = nodeId;
    });

    stations.forEach(function(s) {
      var nid = stationToNodeTable[s.id];
      var node = _this._nodes_map[nid];
      s._node = node;
    });
    if (typeof cb === 'function') { cb(stations); }
  });
};

WeatherMapApp.prototype.shuffleColors = function() {
  var indices = this.markerStyleGenerator.indices;
  this.markerStyleGenerator.indices = shuffle(indices);
};

WeatherMapApp.prototype.drawStations = function() {
  var stations = this.stations, map = this.map;
  var markerGen = this.markerStyleGenerator;
  var level = this.options.level;
  var showStationsWithUndefinedNode = this.showStationsWithUndefinedNode;

  var infowindow = new google.maps.InfoWindow();
  stations.forEach(function(station) {
    var node = station._node, nid = (node && node.getIntIdAtLevel(level)) || 0;
    if (!node && showStationsWithUndefinedNode === false) { return; }

    var markerStyle = markerGen.get(nid);

    var marker = station._marker = new google.maps.Marker({
      position: new google.maps.LatLng(station.lat, station.lon),
      map: map,
      icon: 'resource/markers/' + markerStyle + '.png'
    });

    google.maps.event.addListener(marker, 'click', function() {

      var info = '<div id="content"><div id="siteNotice"></div>' +
            '<h1 id="firstHeading" class="firstHeading">' + station.id + '</h1>' +
            '<div id="bodyContent">' +
            '<p>' +
            '<b>lat</b>: ' + station.lat + '&nbsp&nbsp' +
            '<b>lon</b>: ' + station.lon + '&nbsp&nbsp' +
            '<b>weight</b>: ' + station.weight + '&nbsp&nbsp' +
            '<b>node: </b>: ' + (station._node && station._node.id) +
            '</p>' +
            '</div></div>';

      infowindow.setContent(info);
      infowindow.open(map, marker);
    });

    marker._station = station;
    marker.setMap(map);

  });
};

var app = new WeatherMapApp();
app.loadStations(function() {
  app.loadPartionTree(function() {
    app.loadStationToNode(function() {
      app.update();
    });
  });
});
