var connect = require('connect');
var util = require('util');
var http = require('http');
var parseCookie = require('connect').utils.parseCookie;
var memoryStore = new connect.session.MemoryStore;
//var everyauth = require('everyauth');
var fs = require('fs');

var server = connect.createServer(
    connect.cookieParser()
	,connect.session({secret:'rbf192 approves', cookie:{maxAge:360000}, store:memoryStore})
	,connect.favicon()
    ,connect.static(__dirname+'/www')
    ,function(req, res){
        console.log(req.url);
    }
);
    
server.listen(8080);