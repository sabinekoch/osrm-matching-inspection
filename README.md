# Matching inspection

These scripts can be used to inspect matchings generated by the [map matching](https://github.com/Project-OSRM/osrm-backend/tree/feature/matching) plugin for OSRM.

## Installation

Run:
    npm install

To install the server components. Then do:

    bower install

To install the front-end components.

## Importing traces

To import traces in ```GPX``` or ```CSV``` format contained in a folder ```data``` to the labeling database run:

	node bin/server.js data

This will create a file ```data/clasification_db.json``` which will contain a list of all traces and their classification.

## Starting the frontend

Assuming your GPX traces are contained in a folder ```data``` in the current repository root:

Locally run:
	node bin/server.js data path/to/dataset.osrm

Alternatively if you want to use osrm-routed instead of node-osrm just run:
	node bin/server.js data

Which expects a osrm-routed server listening on ```http://127.0.0.1:5000```.

Now you can view the frontend on ```http://127.0.0.1:8337``` in your browser. It will look somewhat like this:

![](http://i.imgur.com/XvMjiVC.png)

Which shows an interactive trellis diagram of the matching. Select a state pair to view the transition probabilities
and Viterbi values.

You can use the left and right arrow key to cycle through the traces.

## Classifying

Opening ```http://127.0.0.1:8337/classify.html``` will display a minimal interface for easy classification.
Pressing 0 will classify as ```unknown```, 1 as ```valid``` and ```2``` as invalid.

The labels will be saved in ```classification_db.sqlite``` which can be used by ```bin/test_classification.js``` to verify the classifier
implemented inside the OSRM plugin or by ```bin/calibrate_classifier.py``` in to derive better classification values.
