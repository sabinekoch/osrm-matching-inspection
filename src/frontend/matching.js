var diagram = require('./diagram.js'),
    colors = require('./colors.js'),
    layers = require('./layers.js'),
    utils = require('./utils.js'),
    request = require('browser-request'),
    matchingLayer = layers.debugMatchingLayer(),
    history = [],
    traceLine,
    total = 1,
    current_subId = 0,
    confidence_total = 0,
    file_name, route_id,
    trellis;

function saveAll() {
    var url = 'http://localhost:8337/match_save/' + history[history.length - 1];
    $('#loader').css('display', 'initial');
    $.getJSON(url, function(data) {
        $("#save_all").attr('disabled', 'disabled');
        $('#loader').css('display', 'none');
        window.open(data);
        $("#probs").append("<span id = 'confirmation'>Features saved!</span>");
    });
}

function commentCurrentMatching(id) {
    $("#comment_saved").css('display', 'none');
    var url = 'http://localhost:8337/comment',
        comment = ($('#comment').val() + $('#other').val());
    request({
            method: 'POST',
            url: url,
            body: ('{"file_name":"' + file_name +
                '", "route_id":"' + route_id.toString() +
                '", "confidence":"' + confidence_total.toString() +
                '" , "comment": "' + comment + '"}'),
            json: true
        },
        function(er, response, body) {
            if (er) throw er;
            else $('#comment_saved').css('display', 'initial');
        }
    );
}

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
  console.log(response)
    var states = response.debug.states,
        breakage = response.debug.breakage,
        matchings = response.matchings,
        trace = response.trace;
    confidence_total = 0;
    file_name = response.file_name;
    route_id = response.route_id;

    if (traceLine) map.removeLayer(traceLine);
    d3.selectAll("#trellis").remove();
    d3.select("#show_trellis").property('checked', true);
    d3.select('#info').style("display", "initial");
    $("#comment_saved").css('display', 'none');

    current_subId = response.subId;
    total = response.total;

    matchings.forEach(function(t) {
        confidence_total += t.confidence
    });
    if (matchings.length > 1) confidence_total /= 2;
    confidence_total = Math.round((confidence_total / matchings.length).toFixed(4) * 10000) / 100;

    if (confidence_total <= $('#confi').val()) {
        matchingLayer.update(trace.coordinates, states, matchings);
        matchingLayer.options.confidence.value = confidence_total;
        traceLine = L.polyline(response.trace.coordinates, {
            color: 'black',
            opacity: 0.7,
            weight: 5,
            lineCap: 'butt',
            dashArray: [10, 5]
        }).addTo(map);

        matchingLayer.addTo(map);
        trellis = diagram.trellis(d3.select("#info"), matchingLayer, states, breakage);
        trellis.on('transitionselected', updateTransitionInfo);
        map.fitBounds(matchingLayer.getBounds());

        $("#routenumber").text("Route_id: " + (response.route_id) + " ( " + current_subId + " of " + total + ")");
        if (matchings.length > 1) {
            $("#subtraces").text(" (" + matchings.length + " subtraces)")
        } else $("#subtraces").text("")
        $("#long_name").text(response.route_long_name).attr("display", "inline")
        $("#confidence").text("Confidence: " + confidence_total)
    } else {
        if (direction === 'previous') showPrevMatching();
        else showNextMatching();
    }
}

function showMatching(id, next) {
    var url = 'http://localhost:8337/trace/unknown';
    // $('#route_id').val('');

    $('#comment').val('');
    $('#other').val('').remove();
    if ((total - current_subId) > 1) id--, current_subId++;
    else {
        $("#save_all").removeAttr('disabled');
        $("#confirmation").css("display", "none");
    }

    if (id !== undefined) url += '/' + id;
    if (next !== undefined) url += '/next';

    $.getJSON(url, function(data) {
        var id = data.id;
        if (id === undefined) return;
        history.push(id);
        window.document.title = "Matching " + id;

        $.getJSON('http://localhost:8337/match/' + id + '/' + current_subId, onMatched);
        d3.select('#submit_comment')
            .on('click', function() {
                d3.event.preventDefault();
                commentCurrentMatching(id);
            });
    });
}

function showNextMatching() {
    if ($('#select_number').val() !== '') {
        current_subId = $('#select_number').val() - 1
    }
    if (history.length > 0) showMatching(history[history.length - 1], true);
    direction = 'next';
}

function showPrevMatching() {
 
    if (current_subId > 0) current_subId = current_subId - 2;
    else current_subId = -1;
    if ($('#select_number').val() !== '') {
        current_subId = $('#select_number').val() - 1
    }
    if (history.length > 1) {
        showMatching(history[history.length - 2], true);
        history.pop();
        history.pop();
        direction = 'previous';
    }
}

L.mapbox.accessToken = 'pk.eyJ1IjoiYWxscnlkZXIiLCJhIjoidWs5cUFfRSJ9.t8kxvO3nIhCaAl07-4lkNw';
var map = L.mapbox.map('map', 'mapbox.streets'),
    edit = new L.Control.EditInOSM({
        position: 'topright',
        widget: 'multiButton',
        editors: ['id']
    }),
    control = new L.control.layers({
        'Streets': L.mapbox.tileLayer('mapbox.streets').addTo(map),
        'Satellite': L.mapbox.tileLayer('mapbox.satellite')
    });

matchingLayer.addTo(map);
edit.addTo(map);
control.addTo(map);

var id = utils.getURLParam('id');
showMatching(parseInt(id) || undefined);

$('body').on('keydown', function(e) {
    if (e.which === 39) showNextMatching();
    if (e.which === 37) showPrevMatching();
});

$("#probs")
    .append("<p id = 'route_info'/>")
    .append("<p id = 'user_input'/>")
    .append("<button id = 'save_all'>Save all matchings!</button>")
    .append("<img src = './css/loader2.gif' id ='loader'/>")

$("#user_input")
    .append("Comment:</br><select id = 'comment'/>")
    .append("<input type = 'submit' id = 'submit_comment'/>")
    .append("<span id ='comment_saved' >Saved!</span></br></br>")
    .append("Confidence filter: <input type = 'number' id = 'confi' min = '1' max = '100' value = '100'/></br>")
    .append("<label><input type ='checkbox' id = 'show_trellis' checked = 'true'/> Show Trellis diagram</label>");

$("#route_info")
    .append("<p id = 'long_name' />")
    .append("<span id = 'routenumber'/>")
    .append("<input type = 'number' id = 'select_number'/><br>")
    .append("<span id = 'confidence'/>")
    .append("<span id = 'subtraces'/>");;

var commentValues = ["", "OSM incorrect - edited OSM", "route data incorrect", "route split", "other: "]
$.each(commentValues, function(key, value) {
    $('#comment')
        .append($('<option>', {
                value: value
            })
            .text(value));
});

$('#comment').change(function() {
    if ($('select option:selected').val() == "other: ") {
        $('html select').after("<input id = 'other' initial =''/>");
    }
});

$(document).ready(function() {
    $('#show_trellis').change(function() {
        if (this.checked) {
            $('#info').slideDown();
            $('.leaflet-marker-icon').css('display', 'initial');
            $('.candidate_points').css('display', 'initial');
        } else {
            $('#info').slideUp();
            $('.leaflet-marker-icon').css('display', 'none');
            $('.candidate_points').css('display', 'none');
        }
    });
});

$('#save_all')
    .click(function(event) {
        event.preventDefault();
        saveAll();
    });