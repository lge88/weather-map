
var randomColor = window.randomColor;

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

function MarkerStyleGenerator(numColors) {
  if (!numColors) { numColors = 100; }
  this.colors = randomColor({ count: numColors });
}

MarkerStyleGenerator.prototype.get = function(i) {
  var len = this.colors.length;
  var indx = Math.round(i) % len;
  if (indx < 0) { indx += len; }
  return this.colors[indx];
};

MarkerStyleGenerator.prototype.shuffle = function() {
  this.colors = shuffle(this.colors);
};

function HeatMapColorGenerator(groups) {
  this.colorMap = {};
  this.shuffle(groups);
}

HeatMapColorGenerator.prototype.get = function(i) {
  return this.colorMap[i] || 0.5;
};

HeatMapColorGenerator.prototype.shuffle = function(groups) {
  var len = groups.length;
  var cm = this.colorMap;
  if (len <= 1) { return; }

  var ds = 1.0 / (len - 1);
  var scalars = [], i = 0;
  for (; i < len + 1; ++i) { scalars.push(ds * i); }
  scalars = shuffle(scalars);

  groups.forEach(function(gid, i) {
    cm[gid] = scalars[i]
  });
};

function WeatherMapApp() {

  this.options = {};
  this.options['sample ratio'] = '1-of-20';
  this.options.stationsCSVFileUrl = 'data/stations-lat-lon-weight-' +
    this.options['sample ratio'] + '.csv';

  this.options.partitionTreeCSVFileUrl = 'data/partition-tree-nid-coord-thres-k-n-dl-gid-1-of-100.csv';
  this.options.stationToNodeCSVFileUrl = 'data/station-to-node-yoav.csv';
  this.options.stationGroupCSVFileUrls = [
    'data/station-group-before-merge.csv',
    'data/station-group-after-merge.csv'
  ];

  this.options.showStationMarkers = true;
  this.options.showStationHeatMap = false;
  this.options.showMerged = false;
  this.options.showStationsWithUndefinedNode = false;
  this.options.level = 5;

  this.stations = [];
  this.nodes = [];

  this.markerStyleGenerator = new MarkerStyleGenerator();
  this.heatMapColorGenerator = null;

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
  if (this.options.showStationMarkers === true) { this.drawStationMarkers(); }
  if (this.options.showStationHeatMap === true) { this.drawStationHeatMap(); }
};

WeatherMapApp.prototype.clearAll = function() {
  this.clearStationMarkers();
  this.clearStationHeatMap();
};

WeatherMapApp.prototype.clearStationMarkers = function() {
  this.stations.forEach(function(s) {
    var marker = s._marker;
    if (marker) { marker.setMap(null); }
    delete s._marker;
  });
};

WeatherMapApp.prototype.clearStationHeatMap = function() {
  if (this.heatMap) { this.heatMap.setMap(null); }
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
        _this.loadStationGroups(function() {
          if (typeof cb === 'function') { cb(); }
        });
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

    var groups = _this.nodes.map(function(n) { return n.group; });
    _this.heatMapColorGenerator = new HeatMapColorGenerator(groups);

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


WeatherMapApp.prototype.loadStationGroups = function(cb) {
  var stations = this.stations, nodes = this.nodes;

  var stationMap = stations.reduce(function(sofar, item) {
    sofar[item.id] = item;
    return sofar;
  }, {});

  var u1 = this.options.stationGroupCSVFileUrls[0];
  var u2 = this.options.stationGroupCSVFileUrls[1];
  var ok = 0;
  [
    { url: u1, field: 'groupBeforeMerge' },
    { url: u2, field: 'groupAfterMerge' },
  ].forEach(function(obj) {
    var url = obj.url, field = obj.field;
    getTextFileFromUrl(url, function(txt) {
      txt.trim().split('\n').forEach(function(line) {
        var arr = line.trim().split(',');
        stationId = arr[0];
        groupId = parseInt(arr[1]);
        if (isNaN(groupId)) { groupId = 0; }
        var station = stationMap[stationId];
        if (station) { station[field] = groupId; }
      });
      ++ok;
      done();
    });
  });

  function done() { if (ok == 2 && typeof cb === 'function') { cb(); } }

};


WeatherMapApp.prototype.shuffleColors = function() {
  this.markerStyleGenerator.shuffle();
  this.update();
};

WeatherMapApp.prototype.drawStationMarkers = function() {
  var _this = this, stations = this.stations, map = this.map;
  var markerGen = this.markerStyleGenerator;
  var level = this.options.level;
  var showStationsWithUndefinedNode = this.options.showStationsWithUndefinedNode;
  var showMerged = this.options.showMerged;
  var nodesMap = this._nodes_map;
  var markerRadius = 50000;

  var infowindow = new google.maps.InfoWindow();
  stations.forEach(function(station) {
    var leaf = station._node;
    if (!leaf && showStationsWithUndefinedNode === false) { return; }
    var node = leaf ? leaf.findAncestorAtLevel(nodesMap, level) : nodesMap[''];
    var group = node.group;

    // var group = _this.options.showMerged ?
    //   station.groupAfterMerge : station.groupBeforeMerge;
    var markerStyle = markerGen.get(group);

    var marker = station._marker = new google.maps.Circle({
      map: map,
      center: new google.maps.LatLng(station.lat, station.lon),
      position: new google.maps.LatLng(station.lat, station.lon),
      radius: markerRadius,
      strokeWeight: 0,
      fillColor: markerStyle
    });

    // var marker = station._marker = new google.maps.Marker({
    //   position: new google.maps.LatLng(station.lat, station.lon),
    //   map: map,
    //   icon: 'resource/markers/' + markerStyle + '.png'
    // });

    google.maps.event.addListener(marker, 'click', function() {
      var info = station.getInfoHTML(nodesMap, level);
      infowindow.setContent(info);
      infowindow.open(map, marker);
    });

    marker._station = station;
    marker.setMap(map);

  });
};

WeatherMapApp.prototype.drawStationHeatMap = function() {
  var _this = this, stations = this.stations, map = this.map;
  var colorGen = this.heatMapColorGenerator;
  var nodesMap = this._nodes_map;

  var data = stations.map(function(station) {
    var node = station._node || nodesMap[''];
    var res = {};
    res.location = new google.maps.LatLng(station.lat, station.lon);
    // res.weight = colorGen.get(node.group);
    res.weight = node.weight;
    return res;
  });


  this.heatMap = new google.maps.visualization.HeatmapLayer({
    data: data,
    radius: 20
  });

  this.heatMap.setMap(map);
};


var app = new WeatherMapApp();
app.loadAll(function() {
  console.log('Loading finished!');
  app.update();
});

var gui = new dat.GUI();

gui.add({ 'stations' : app.options.showStationMarkers }, 'stations').onChange(function(val) { app.options.showStations = val; app.update(); });
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
