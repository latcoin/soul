var connect = require('connect');
var http = require('http');
var fs = require('fs');
var util = require('util');
var url = require('url');
var DynamoDBStore = require('connect-dynamodb')(connect);
var store = new DynamoDBStore(
{
	// Name of the table you would like to use for sessions.
	table : 'asoul-sessions',

	// AWSAccessKey
	accessKeyId : 'AKIAJORSTMYVLCS3VAYQ',

	// AWS secretAccessKey
	secretAccessKey : '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',

	// Optional. How often expired sessions should be cleaned up.
	// Defaults to 600000 (10 minutes).
	reapInterval : 7200000
});

var routing = require('./server/routing.js');

// Start an HTTP server
var s = function(request, response, next)
{
	var wholeData = '';
	if (request.method == 'POST')
	{
		request.on('data', function(data)
		{
			wholeData += data;
		});
		request.on('end', function()
		{
			routing.routePostReq(request, response, wholeData);
		});
	}

	if (request.method == 'GET')
	{
		// routing.getAction(request, response);
		// todos los get deberian ser logged out.
	}

};

http.createServer(
		connect().use(connect.static(__dirname + '/www')).use(
				connect.cookieParser('asouldotme')).use(connect.session(
		{
			cookie :
			{
				maxAge : 7200000
			},
			store : store
		})).use(connect.favicon()).use(s)).listen(8080);
