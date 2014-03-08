var _ = require('underscore');
var util = require('util');

/**
 * Gets the parameters
 * @param  {Array}   		expectedParameters This parameters is an array with the correct format of parameters
 * @param  {JSON}          	jsonparameters     This parameters is de data sent for the user
 * @param  {Function}       callback  A function to execute at the end of the validationParams
 */
function verifyParameters(expectedParameters, jsonparameters, callback){
	//Use underscore for get the keys of the jsonparameters
	if(typeof jsonparameters != 'object'){
		return false;
	}
	var keys = _.keys(jsonparameters);
	//Use underscore for make a comparison into the parameters sent and the expected parameters
	var result = _.intersection(expectedParameters, keys);
	//compare if the paraters sent have the same length that expected parameteres	
	if(expectedParameters.length == result.length)
		return true;
	else{
		console.log('expected: ' + util.inspect(expectedParameters));
		console.log('received: ' + util.inspect(jsonparameters));
		return false;
	}
}

exports.verifyParameters = verifyParameters;