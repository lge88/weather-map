
function Station(id, lat, lon, weight) {
  this.id = id;
  this.lat = parseFloat(lat);
  this.lon = parseFloat(lon);
  this.weight = parseInt(weight);
}

Station.prototype.getInfoHTML = function(nodesMap, level) {
  var nodeInfo = '';
  if (this._node) {
    var na = this._node.findAncestorAtLevel(nodesMap, level);
    if (na) {
      nodeInfo += '<b>node at level ' + level + ': </b>' + na.id + '&nbsp&nbsp';
      nodeInfo += '<b>coord: </b>' + na.coord + '&nbsp&nbsp';
      nodeInfo += '<b>threshold: </b>' + na.threshold + '</br>';
      nodeInfo += '<b>k: </b>' + na.k + '&nbsp&nbsp';
      nodeInfo += '<b>number of samples: </b>' + na.nsamples + '&nbsp&nbsp';
      nodeInfo += '<b>descriptor length: </b>' + na.descriptorLength + '</br>';
      nodeInfo += '<b>group: </b>' + na.group;
    }
  } else {
    nodeInfo = '<b>node: </b>&nbsp&nbsp' + 'undefined';
  }

  var info = '<div id="content"><div id="siteNotice"></div>' +
        '<h1 id="firstHeading" class="firstHeading">' + this.id + '</h1>' +
        '<div id="bodyContent">' +
        '<p>' +
        '<b>lat</b>: ' + this.lat + '&nbsp&nbsp' +
        '<b>lon</b>: ' + this.lon + '&nbsp&nbsp' +
        '<b>weight</b>: ' + this.weight + '&nbsp&nbsp' +
        '<b>leaf: </b>: ' + (this._node && this._node.id) +
        '</p>' +
        '<p>' +
        nodeInfo +
        '</p>' +
        '</div></div>';
  return info;
};

function PartionNode() {}

PartionNode.prototype.setFromCSVLine = function(line) {
  var arr = line.trim().split(',');
  this.id = arr[0];
  this.coord = arr[1];
  this.threshold = parseFloat(arr[2]);
  this.k = parseInt(arr[3]);
  this.nsamples = parseInt(arr[4]);
  this.descriptorLength = parseInt(arr[5]);
  // this.shouldBeMerged = arr[6] === '1' ? true : false;
  this.group = parseInt(arr[6]);
  return this;
};

PartionNode.prototype.findParent = function(nodesMap) { return nodesMap[this.id.slice(0, -1)]; };
PartionNode.prototype.findAncestorAtLevel = function(nodesMap, level) { return nodesMap[this.id.slice(0, level)]; };
PartionNode.prototype.findLeftChild = function(nodesMap) { return nodesMap[this.id + '0']; };
PartionNode.prototype.findRightChild = function(nodesMap) { return nodesMap[this.id + '1']; };
PartionNode.prototype.getIntId = function() { return parseInt(this.id, 2) + 1; };

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
  this.options['sample ratio'] = '1-of-20';
  this.options.stationsCSVFileUrl = 'data/stations-lat-lon-weight-' +
    this.options['sample ratio'] + '.csv';

  this.options.partitionTreeCSVFileUrl = 'data/partition-tree-nid-coord-thres-k-n-dl-gid-1-of-100.csv';
  this.options.stationToNodeCSVFileUrl = 'data/station-to-node-yoav.csv';

  this.options.showStations = true;
  this.options.showMerged = false;
  this.options.showStationsWithUndefinedNode = false;
  this.options.level = 5;

  this.stations = [];
  this.nodes = [];

  this.markerStyleGenerator = new MarkerStyleGenerator();

  this.mapElement = document.getElementById('map');
  this.map = new google.maps.Map(this.mapElement, {
    zoom: 3,
    center: new google.maps.LatLng(40.0, -100.0),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
}

WeatherMapApp.prototype.update = function() {
  this.clearAll();
  this.drawAll();
};

WeatherMapApp.prototype.drawAll = function() {
  if (this.options.showStations === true) { this.drawStations(); }
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

WeatherMapApp.prototype.loadAll = function(cb) {
  var _this = this;
  this.clearAll();
  this.stations = [];
  this.nodes = [];
  this._nodes_map = {};
  this.loadStations(function() {
    _this.loadPartionTree(function() {
      _this.loadStationToNode(function() {
        _this.update();
        if (typeof cb === 'function') { cb(); }
      });
    });
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
    _this.nodes = str.trim().split('\n').map(function(line) {
      var n = new PartionNode();
      n.setFromCSVLine(line);
      return n;
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
  this.update();
};

WeatherMapApp.prototype.drawStations = function() {
  var _this = this, stations = this.stations, map = this.map;
  var markerGen = this.markerStyleGenerator;
  var level = this.options.level;
  var showStationsWithUndefinedNode = this.options.showStationsWithUndefinedNode;
  var showMerged = this.options.showMerged;
  var nodesMap = this._nodes_map;

  var infowindow = new google.maps.InfoWindow();

  stations.forEach(function(station) {
    var leaf = station._node;
    if (!leaf && showStationsWithUndefinedNode === false) { return; }

    // debugger;
    var node = leaf ? leaf.findAncestorAtLevel(nodesMap, level) : nodesMap[''];

    var group = node.group;
    var markerStyle = markerGen.get(group);

    var marker = station._marker = new google.maps.Marker({
      position: new google.maps.LatLng(station.lat, station.lon),
      map: map,
      icon: 'resource/markers/' + markerStyle + '.png'
    });

    google.maps.event.addListener(marker, 'click', function() {
      var info = station.getInfoHTML(nodesMap, level);
      infowindow.setContent(info);
      infowindow.open(map, marker);
    });

    marker._station = station;
    marker.setMap(map);

  });
};

var app = new WeatherMapApp();
app.loadAll();

var gui = new dat.GUI();

gui.add({ 'stations' : app.options.showStations }, 'stations').onChange(function(val) { app.options.showStations = val; app.update(); });
gui.add({ 'merged' : app.options.showMerged }, 'merged').onChange(function(val) { app.options.showMerged = val; app.update(); });
gui.add(app.options, 'level', 0, 9).step(1).onChange(function() { app.update(); });
gui.add(app.options, 'sample ratio', [
  // always crashes without sampling
  // '1-of-1',
  '1-of-10',
  '1-of-20',
  '1-of-50',
  '1-of-100'
]).onChange(function() {
  app.options.stationsCSVFileUrl = 'data/stations-lat-lon-weight-' +
    app.options['sample ratio'] + '.csv';
  app.loadAll();
});
gui.add({ 'shuffle colors': function() { app.shuffleColors(); } }, 'shuffle colors');


// gui.add(app.options, 'showStationsWithUndefinedNode').onChange(function() { app.update(); });
// gui.add(app.options, 'stationsCSVFileUrl').onChange(function() { app.loadAll(); });
// gui.add(app.options, 'partitionTreeCSVFileUrl').onChange(function() { app.loadAll(); });
// gui.add(app.options, 'stationToNodeCSVFileUrl').onChange(function() { app.loadAll(); });
