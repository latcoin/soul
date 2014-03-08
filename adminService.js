var fs = require('fs');
var util = require('util');
var qs = require('querystring');
var http = require('http');
var _ = require('underscore');
var flow = require('flow');
var simpledb = require('./simpledb.js');

var portToListenOn = 8088;

var router = function(req, res)
{
	console.log('requested path: ' + req.url);
	if (req.method == 'POST')
	{
		var postData = '';
		req.on('data', function(chunkData)
		{
			postData += chunkData;
		});
		req.on('end', function()
		{
			postData = qs.parse(postData);
			routePostReq(req, res, postData);
		});
	} else
	{
		console.log('This isn\'t a post request');
		res.writeHead(500,
		{

		});
		res.end();
	}
};

var routePostReq = function(req, res, postData)
{
	switch (req.url)
	{
		case '/updateTraits':
			if (postData)
			{
				try
				{
					var traitArray = JSON.parse(postData.data);
					traitArray = _.filter(traitArray, function(traitElement)
					{
						return traitElement.traitName != '';
					});
					console.log("About to write: " + traitArray.length
							+ ' elements');
					console.log("trait: " + util.inspect(traitArray[0]));
					simpledb.putBatchTraits(traitArray, function(err, result)
					{
						console.log(util.inspect(err));
						console.log(util.inspect(result));
						respondOk(res, 'cool');
					});
				} catch (e)
				{
					console.log('error parsing!');
					console.log(util.inspect(e));
					respondError(res, 'Malformed Requestt');
				}
			} else
			{
				console.log('postData is not a string');
			}
			break;

	}
};

var respondOk = function(res, respBody)
{
	res.writeHead(200,
	{
		'Content-Type' : 'application/json',
		'Content-Length' : respBody.length
	});
	res.end(respBody);
};

var respondError = function(res, respMessage)
{
	res.writeHead(500,
	{});
	if (respMessage)
		res.end(respMessage);
	else
		res.end('error!');
};

var httpServer = http.createServer(router).listen(portToListenOn);
console.log('listening on: ' + portToListenOn);