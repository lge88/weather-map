
function getTextFileFromUrl(url, cb) {
  var req = new XMLHttpRequest();
  req.open('GET', url);
  req.onreadystatechange = function() {
    if (req.readyState === 4) { cb(req.responseText); }
  };
  req.send();
}

function csvToList(str) {
  return str.trim().split('\n')
    .map(function(line) {
      return line.trim().split(',');
    });
}

function shuffle(o){
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};

function repeat(arr, times) {
  var out = [], i = 0;
  for (; i < times; ++i) { arr.forEach(function(x) { out.push(x); }); }
  return out;
}

function range(n) { var out = []; while (n--) { out.unshift(n); } return out; }
