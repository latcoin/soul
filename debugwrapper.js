var util = require('util');
var debug = true;
function log(stringToLog){
    if(debug)
        console.log(stringToLog);
}

if (typeof exports !== "undefined") {
	exports.log = log;
}