var https = require('https');
var querystring = require('querystring');
var util = require('util');

var endpoint = 'api.stripe.com';
var api_secret = 'JomriEuetHGBvgZU2yxC9YSs96fhT6VR';
//var api_public = '';

var sendReq = function(actionUrl, parameters, callback, auth){
	var options = {
	  host: endpoint,
	  port: 443,
	  path: '/v1/'+actionUrl,
	  method: 'POST'
	};
	if(auth){
		options.auth = auth;
	}

	var payload = querystring.stringify(parameters);
	options.headers = { 'Content-Length' : Buffer.byteLength(payload) };

	var req = https.request(options, function(res) {
	  var data = '';
	  res.on('data', function(d) {	    
	    data+=d;
	  });
	  res.on('end', function(){
	  	try{
	  		var respObject = JSON.parse(data);
	  		if(respObject.error){
	  			callback(respObject, null);
	  		}else{
	  			callback(null, respObject);
	  		}
	  	}catch(err){
	  		callback(err);
	  	}
	  });
	});
	req.write(payload);
	req.end();

	req.on('error', function(e) {
	  console.error(e);
	});
}

var createCharge = function(options, callback){
	if(options.amount && (options.customer || options.card) && options.currency){
		sendReq('charges', options, callback, api_secret+':');
	}
}

exports.createCharge = createCharge;