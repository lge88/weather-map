
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

MarkerStyleGenerator.prototype.shuffle = function() {
  this.indices = shuffle(this.indices);
};

function CircleColorGenerator(numColors) {
  if (!numColors) { numColors = 100; }
  this.colors = randomColor({ count: numColors });
}

CircleColorGenerator.prototype.get = function(i) {
  var len = this.colors.length;
  var indx = Math.round(i) % len;
  if (indx < 0) { indx += len; }
  return this.colors[indx];
};

CircleColorGenerator.prototype.shuffle = function() {
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

function jetColorMap(vec) {

  var normalized = normalize(vec);

  return normalized.map(function(s) {
    var r = Math.round(255 * red(s));
    var g = Math.round(255 * green(s));
    var b = Math.round(255 * blue(s));
    console.log(r, g, b);

    return rgbToHex(r, g, b);
  });

  function minmax(vec) {
    var min = Infinity, max = -Infinity;
    vec.forEach(function(x) {
      if (x < min) { min = x; }
      if (x > max) { max = x; }
    });
    return [min, max];
  }

  function normalize(vec) {
    var range = minmax(vec);
    var min = range[0], max = range[1];
    var d = max - min;
    return vec.map(function(x) { return (x - min) / d; });
  }

  function interpolate(val, y0, x0, y1, x1) {
    var dy = y1 - y0, dx = x1 - x0;
    return (val - x0) * dy / dx + y0;
  }

  function componentToHex(c) {
    var hex = c.toString(16);

    return hex.length == 1 ? "0" + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  function base(val) {
    if (val <= -0.75) return 0.0;
    else if (val <= -0.25) return interpolate(val, 0.0, -0.75, 1.0, -0.25);
    else if (val <= 0.25) return 1.0;
    else if (val <= 0.75) return interpolate(val, 1.0, 0.25, 0.0, 0.75);
    else return 0.0;
  }

  function red(gray) { return base(gray - 0.5); }
  function green(gray) { return base(gray); }
  function blue(gray) { return base(gray + 0.5); }
}


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
  this.options.avgTempRegressionCSVFileUrl = 'data/weather-avg-temp-A-b-r-p-e.csv';

  this.options.mergeUseTreeStructure = true;
  this.options.useCircleAsMarker = false;
  this.options.showStationMarkers = true;
  this.options.showStationHeatMap = false;
  this.options.showMerged = false;
  this.options.showStationsWithUndefinedNode = false;
  this.options.level = 5;

  this.options.selectedAvgTempValueType = 'None';

  this.stations = [];
  this.nodes = [];

  this.markerStyleGenerator = new MarkerStyleGenerator();
  this.circleColorGenerator = new CircleColorGenerator();
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
  if (this.options.selectedAvgTempValueType !== 'None')
    this.drawStationAvgTempRegression();
};

WeatherMapApp.prototype.clearAll = function() {
  this.clearStationMarkers();
  this.clearStationHeatMap();
  this.clearStationAvgTempRegression();
};

WeatherMapApp.prototype.clearStationMarkers = function() {
  this.stations.forEach(function(s) {
    var marker = s._marker;
    if (marker) { marker.setMap(null); }
    delete s._marker;
  });
};

WeatherMapApp.prototype.clearStationAvgTempRegression = function() {
  this.stations.forEach(function(s) {
    var marker = s._avgTempMarker;
    if (marker) { marker.setMap(null); }
    delete s._avgTempMarker;
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
          _this.loadAvgTempRegression(function() {
            if (typeof cb === 'function') { cb(); }
          });
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

  var stations = this.stations;
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
        var stationId = arr[0];
        var groupId = parseInt(arr[1]);

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

WeatherMapApp.prototype.loadAvgTempRegression = function(cb) {
  var url = this.options.avgTempRegressionCSVFileUrl;
  var stations = this.stations;

  var stationMap = stations.reduce(function(sofar, item) {
    sofar[item.id] = item;
    return sofar;
  }, {});

  getTextFileFromUrl(url, function(txt) {
    txt.trim().split('\n').forEach(function(line) {
      var arr = line.trim().split(',');
      var stationId = arr[0];
      var A = parseFloat(arr[1]);
      var b = parseFloat(arr[2]);
      var r = parseFloat(arr[3]);
      var p = parseFloat(arr[4]);
      var stdE = parseFloat(arr[5]);

      var station = stationMap[stationId];
      if (station) {
        station.avgTemp_A = A;
        station.avgTemp_b = b;
        station.avgTemp_r = r;
        station.avgTemp_p = p;
        station.avgTemp_stdE = stdE;
      }
    });
    if (typeof cb === 'function') { cb(); }
  });
};

WeatherMapApp.prototype.shuffleColors = function() {
  this.markerStyleGenerator.shuffle();
  this.circleColorGenerator.shuffle();
  this.update();
};

WeatherMapApp.prototype.drawStationMarkers = function() {
  var _this = this, stations = this.stations, map = this.map;
  var colorGen = this.circleColorGenerator;
  var markerGen = this.markerStyleGenerator;
  var level = this.options.level;
  var showStationsWithUndefinedNode = this.options.showStationsWithUndefinedNode;
  var showMerged = this.options.showMerged;
  var useCircleMarker = this.options.useCircleAsMarker;
  var nodesMap = this._nodes_map;
  var markerRadius = 50000;

  var infowindow = new google.maps.InfoWindow();
  stations.forEach(function(station) {
    var leaf = station._node;
    if (!leaf && showStationsWithUndefinedNode === false) { return; }
    var node = leaf ? leaf.findAncestorAtLevel(nodesMap, level) : nodesMap[''];

    var group;
    if (this.options.mergeUseTreeStructure === true) {
      group = node.group;
    } else {
      group = this.options.showMerged ?
        station.groupAfterMerge : station.groupBeforeMerge;
    }

    var marker;

    function getCircle(group) {
      var color = colorGen.get(group);
      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.7,
        scale: 7,
        strokeWeight: 0
      };
    }

    if (useCircleMarker === true) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(station.lat, station.lon),
        map: map,
        icon: getCircle(group)
      });

      // var color = colorGen.get(group);
      // marker = new google.maps.Circle({
      //   map: map,
      //   center: new google.maps.LatLng(station.lat, station.lon),
      //   position: new google.maps.LatLng(station.lat, station.lon),
      //   radius: markerRadius,
      //   strokeWeight: 0,
      //   fillColor: color
      // });
    } else {
      var markerStyle = markerGen.get(group);
      var marker = station._marker = new google.maps.Marker({
        position: new google.maps.LatLng(station.lat, station.lon),
        map: map,
        icon: 'resource/markers/' + markerStyle + '.png'
      });
    }

    station._marker = marker;

    google.maps.event.addListener(marker, 'click', function() {
      var info = station.getInfoHTML(nodesMap, level);
      infowindow.setContent(info);
      infowindow.open(map, marker);
    });

    marker._station = station;
    marker.setMap(map);

  }, this);
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

WeatherMapApp.prototype.drawStationAvgTempRegression = function() {
  var _this = this, stations = this.stations, map = this.map;

  var showStationsWithUndefinedNode = this.options.showStationsWithUndefinedNode;
  var markerRadius = 50000;
  var valType = this.options.selectedAvgTempValueType;
  if (valType === 'None') { return; }

  if (showStationsWithUndefinedNode === false) {
    stations = stations.filter(function(s) {
      return typeof s._node !== 'undefined';
    });
  }

  stations = stations.filter(function(s) {
    if (valType === 'A') { return typeof s.avgTemp_A === 'number';  }
    else if (valType === 'b') { return typeof s.avgTemp_b === 'number'; }
    else if (valType === 'r value') { return typeof s.avgTemp_r=== 'number'; }
    else if (valType === 'p value') { return typeof s.avgTemp_p === 'number'; }
    else if (valType === 'standard error') { return typeof s.avgTemp_stdE === 'number'; }
    else { return false; }
  });

  var vals = stations.map(function(station) {
    var val;
    if (valType === 'A') { val = station.avgTemp_A; }
    else if (valType === 'b') { val = station.avgTemp_b; }
    else if (valType === 'r value') { val = station.avgTemp_r; }
    else if (valType === 'p value') { val = station.avgTemp_p; }
    else if (valType === 'standard error') { val = station.avgTemp_stdE; }
    return val;
  });

  var colors = jetColorMap(vals);

  stations.forEach(function(station, i) {
    var color = colors[i];

    var marker = station._avgTempMarker = new google.maps.Circle({
      map: map,
      center: new google.maps.LatLng(station.lat, station.lon),
      position: new google.maps.LatLng(station.lat, station.lon),
      radius: markerRadius,
      strokeWeight: 0,
      fillColor: color
    });
    marker.setMap(map);
  });

};



function WeatherMapAppGUI(app) {
  this.gui = new dat.GUI();
  this.app = app;

  this.addBoolOption('stations', 'showStationMarkers');
  this.addBoolOption('circle marker', 'useCircleAsMarker');
  this.addBoolOption('station density', 'showStationHeatMap');

  this.addBoolOption('merged', 'showMerged');
  this.addBoolOption('merge by level', 'mergeUseTreeStructure');

  this.avgTempFolder = this.gui.addFolder('Yearly Average Temperature Regression');
  this.addChoiceOption('value type', 'selectedAvgTempValueType', [
    'None', 'A', 'b', 'r value', 'p value', 'standard error'
  ], this.avgTempFolder);

  this.gui.add(app.options, 'level', 0, 9).step(1).onChange(function() { app.update(); });
  this.gui.add(app.options, 'sample ratio', [
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
  this.gui.add({ 'shuffle colors': function() { app.shuffleColors(); } }, 'shuffle colors');

}

WeatherMapAppGUI.prototype.addBoolOption = function(displayName, key, gui) {
  var app = this.app, obj = {};
  if (!gui) { gui = this.gui; };

  obj[displayName] = app.options[key];
  gui.add(obj, displayName).onChange(function(val) {
    app.options[key] = val;
    app.update();
  });
};

WeatherMapAppGUI.prototype.addChoiceOption = function(displayName, key, choices, gui) {
  var app = this.app, obj = {};
  if (!gui) { gui = this.gui; };

  obj[displayName] = app.options[key];
  gui.add(obj, displayName, choices).onChange(function(val) {
    console.log('choice', val);
    app.options[key] = val;
    app.update();
  });
};

var app = new WeatherMapApp();
var gui = new WeatherMapAppGUI(app);

app.loadAll(function() {
  console.log('Loading finished!');
  app.update();
});

// gui.add(app.options, 'showStationsWithUndefinedNode').onChange(function() { app.update(); });
// gui.add(app.options, 'stationsCSVFileUrl').onChange(function() { app.loadAll(); });
// gui.add(app.options, 'partitionTreeCSVFileUrl').onChange(function() { app.loadAll(); });
// gui.add(app.options, 'stationToNodeCSVFileUrl').onChange(function() { app.loadAll(); });
