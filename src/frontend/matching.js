var diagram = require('./diagram.js'),
    colors = require('./colors.js'),
    layers = require('./layers.js'),
    utils = require('./utils.js'),
    matchingLayer = layers.debugMatchingLayer(),
    history = [],
    trellis;

function updateTransitionInfo(p) {
  var probs = d3.select("#probs")
                 .html(function() {
                   return '<b>Previous state probability:</b> ' + p[0] + '<br>' +
                          '<b>Emission probability :</b>' + p[1] + '<br>' +
                          '<b>Transition probability :</b>' + p[2] + '<br>' +
                          '<b>Total :</b>' + (p[0] + p[1] + p[2]) + '<br>' +
                          '<b>Network distance :</b>' + p[3] + '<br>' +
                          '<b>Euclid distance :</b>' + p[4] + '<br>';
                  });
}

function onMatched(response) {
  var states = response.debug.states,
      breakage = response.debug.breakage,
      matchings = response.matchings,
      trace = response.trace;

  d3.selectAll("#trellis").remove();

  trellis = diagram.trellis(d3.select("#info"), matchingLayer, states, breakage);
  trellis.on('transitionselected', updateTransitionInfo);
  matchingLayer.update(trace.coordinates, states, matchings);
  map.fitBounds(matchingLayer.getBounds());
}

function showMatching(id, next) {
  var url = 'http://127.0.0.1:8337/trace/unknown';
  if (id !== undefined) url += '/' + id;
  if (next !== undefined) url += '/next';

  $.getJSON(url, function(data) {
    var trace = data.trace;

    if (!trace) return;

    history.push(trace.id);

    window.document.title = "Matching " + trace.id;

    $.getJSON('http://127.0.0.1:8337/match/' + trace.id, onMatched);
  });
}

function showNextMatching() { if (history.length > 0) showMatching(history[history.length-1], true); }
function showPrevMatching() {
  if (history.length > 1) {
    showMatching(history[history.length-2]);
    history.pop();
    history.pop();
  }
}

L.mapbox.accessToken = 'pk.eyJ1IjoidGhlbWFyZXgiLCJhIjoiSXE4SDlndyJ9.ihcqCB31K7RtzmMDhPzW2g';
var map = L.mapbox.map('map', 'themarex.kel82add'),
    edit = new L.Control.EditInOSM({position: 'topright', widget: 'multiButton', editors: ['id']});

matchingLayer.addTo(map);
edit.addTo(map);

var id = utils.getURLParam('id');
showMatching(parseInt(id) || undefined);

$('body').on('keydown', function(e) {
  if (e.which === 39) showNextMatching();
  if (e.which === 37) showPrevMatching();
});

