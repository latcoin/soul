/**
 * facebook.js
 * 
 * This file contains the functions to process monsterbook's requests to get information from facebook,
 * also, it contains the exports to use it as a Node.js object
 * 
 * @author Alex Ochoa
 * 
 * @requires Node.js util module
 * @requires Node.js crypto module
 * @requires Node.js https module
 * @requires Node.js underscore module
 * @requires Node.js querystring module
 * @requires Node.js guid module
 * @requires MongoServiceAlpha file with it's exports
 */

var util = require('util');
var crypto = require('crypto');
var _ = require('underscore');
var guid = require('guid');
var https = require('https');
var querystring = require('querystring');
//var APP_ID = '342673305815897';
//var APP_SECRET = '0d697184c24ac807638ac5e17bcf4a02';

var APP_ID = '215408475283068';
var APP_SECRET = '1dc94cced0d550199c101d4c40bacf35';

/**
 * Gets the user's facebook name using his facebook ID
 * @param  {String|Number}   graphUser The user's facebook ID
 * @param  {String}          token     The user's facebook access token
 * @param  {Function}        callback  A function to execute at the end of the facebook request
 */
function facebookGetUserInfo(graphUser, token, fields, callback){
    //makes a facebook request to get the user's information
    makeFacebookRequest(graphUser, '', {access_token: token, fields: fields, type: 'large'}, function(userInfo){
        //if an error has not ocurred the callback is executed 
        if (!userInfo.error){
            var birthday = new Date(Date.parse(userInfo.birthday,"MM/dd/yyyy"));
            var today = new Date();
            var age = (today.getTime() - birthday.getTime()) / ( 1000 * 60 * 60 * 24 * 365)  ; //Convert to milliseconds to seconds, minutes, hour, day and year
            userInfo.birthday = parseInt(age);
            callback(userInfo);
        }
    });
}

/**
 * Gets the user's friends who have installed the mpm facebook application
 * @param  {String|Number}   graphId  The user's facebook ID
 * @param  {String}          token    The user's facebook access token
 * @param  {Function}        callback A function to execute at the end of the facebook request
 */
function facebookGetAppUsers(graphId, token, fields, callback){
    //makes a facebook request to get the user's friends and adds a field called installed if that person has installed the app
    makeFacebookRequest(graphId, '/friends', {access_token: token, fields: fields}, function(friends){
        //if an error has not ocurred then the friend list will be filtered according to the check of the installed field
        //after that the callback will be executed
        if (!friends.error){
            //filtering the user's friends
            var appUsers = _.filter(friends.data, function(friend){
                return friend.installed;
            });
            callback(appUsers);
        }
    });
}


/**
 * Gets the user's friends
 * @param  {String|Number}   graphId  The user's facebook ID
 * @param  {String}          token    The user's facebook access token
 * @param  {Function}        callback A function to execute at the end of the facebook request
 */
function facebookGetFriends(graphId, token, fields, callback){
    //makes a facebook request to get the user's friends and adds a field called installed if that person has installed the app
    makeFacebookRequest(graphId, '/friends', {access_token: token, fields: fields}, function(friends){
        callback(friends.data);
    });
}

/**
 * Gets the user's friends who have installed the mpm facebook application
 * @param  {String|Number}   graphId  The user's facebook ID
 * @param  {String}          token    The user's facebook access token
 * @param  {Function}        callback A function to execute at the end of the facebook request
 */
function facebookGetRandomFriends(graphId, token, limit, fields, callback){
    //makes a facebook request to get the user's friends and adds a field called installed if that person has installed the app
    makeFacebookRequest(graphId, '/friends', {access_token: token, fields: fields}, function(friends){
        //callback(friends.data);
        
        if(friends.data != null){
            var selectedFriends = []; //JSON, contains the data of random users
            var count = 0;
            var res = friends.data; //get the value of 'fiends.data' to manipulate
            var totalFriends = res.length - 1; 
            var random = 0; //get a random value
            var randomFriendsGet = []; //get the id's selected for evaluate 

            limit = (totalFriends < limit) ? totalFriends : limit;
            
            while(count<limit){
                random = Math.floor((Math.random()*(totalFriends))+1);
                var result = _.find(randomFriendsGet, function(numberGet){ return numberGet - random == 0 });
                if(!result){
                    randomFriendsGet.push(random);
                    selectedFriends.push(res[random]);
                    count = count + 1;
                }
            }
            callback(selectedFriends);
        } else {
            callback('Facebook session has expired or no started');
        }
    });
}

/**
 * Gets the user's facebook photos from the mpm album
 * @param  {String|Number}   graphUser The user's facebook ID
 * @param  {String}          token     The user's facebook access token
 * @param  {Function}        callback  A function to excecute at the end of the facebook request
 */
function facebookGetUserPhotos(graphUser, token, fields, callback){
    //preparing a static field object that will be used to establish the request
    var fieldsObject = {access_token: token, fields: fields};

    //makes a facebook request to get the user's albums
    makeFacebookRequest(graphUser, '/albums', fieldsObject, function(albums){
        //if an error has ocurred the callback will be executed with the error data
    	if (albums.error){
    		callback({error: true, message: albums.message, data: []});
    	}
        //otherwise, a search will be made to get the mpm album's ID and then another facebook request to get
        //the album's photos
    	else{
            //searching the mpm album
            //NOTE: change the album name from 'Neotaku Photos' to the name of the final application's album name
    		var mpmAlbum = _.find(albums.data, function(album){ return album.name == "Neotaku Photos" });
	        fieldsObject.fields = "id,source";

            //if the mpm album exists then a facebook request will be made to get the album's photos
            //and send them in the callback
            if (mpmAlbum != null){
                makeFacebookRequest(mpmAlbum.id, '/photos', fieldsObject, function(photos){
                    callback(photos);
                });
            }
            //otherwise an empty array will be returned in the callback
	        else{
                callback([]);
            }
    	}
    });
}

/**
 * Gets a user's facebook photo information
 * @param  {String|Number}   graphPhoto The photo's facebook ID
 * @param  {String}          token      The user's facebook access token
 * @param  {Function}        callback   A function to excecute at the end of the facebook request
 */
function facebookGetSinglePhoto(graphPhoto, token, fields, callback){
    //making a object that will contain the fields 
	var fieldsObject = {access_token: token, fields: fields};
	makeFacebookRequest(graphPhoto, '', fieldsObject, function(photo){
        //if an error ocurred the callback will contain the error detail otherwise the photo data will be passed to the callback
		if (photo.error){
			callback({error: true, message: photo.message, data: {}});
		}
		else{
			callback(photo);
		}
	});
}

/**
 * Gets information from multiple photos
 * @param  {Array}    fbIdArray An array containing the photos' facebook IDs
 * @param  {String}   token     The requesting user's facebook ID
 * @param  {Function} callback  A function to execute at the end of the facebook request
 */
function facebookGetPhotoBatch(fbIdArray, token, fields, callback){
    //preparing the batch request array
	var reqPhotos = _.map(fbIdArray, function(id){ return {url: id, fields: {fields: fields}}; });
	makeFacebookBatchRequest(reqPhotos, token, function(photos){
        //if there are no errors the callback will return the photos array
        if (!photos.error){
            callback(photos);
        }
	});
}

/**
 * Makes a request to facebook to obtain the data specified by the graph Object ID and the graph Connection element
 * @param  {String|Number}   graphObject     The main object's facebook ID
 * @param  {String}          graphConnection The connection to get preceeded by a '/'
 * @param  {Object}          fields          The desired fields the request must return (must include the access token)
 * @param  {Function}        callback        A function to execute at the end of the request
 */
function makeFacebookRequest(graphObject, graphConnection, fields, callback){
    //preparing request options
    var pathToQuery = '/'+graphObject;
    if(typeof callback === 'undefined'){
        var callback;
        if(typeof fields === 'undefined'){
            callback = graphConnection;
        }else{
            pathToQuery += graphConnection;
            callback = fields;
        }
    }else{
        pathToQuery += graphConnection + '?' + querystring.stringify(fields);
    }
    var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: pathToQuery, //parsing the request url path
        method: 'GET'
    };

    //making request
    var req = https.request(options, function(res) {
        //getting the data chunks
        var fbData = '';
        res.on('data', function(d) {
            fbData += d;
        });
        //processing the data when the data has been received 
        res.on('end', function(){     
            var responseObject = {};
            try{
                responseObject = JSON.parse(fbData);                
            }catch (err){
                console.log('error parsing data from facebook...');
                if(typeof err  == 'object')
                    console.log(err.message);
            }finally{
                callback(responseObject);
            }
            
        });
    });
    req.end();

    //handling errors in the request by passing the error data to the callback
    req.on('error', function(e) {
        console.error(e);
        callback({error: true, message: e, data: []});
    });
}

/**
 * Makes a batch request of multiple objects to facebook
 * @param  {Array}    relativeURLs An array of objects that contain the needed graph object and the desired fields
 * @param  {String}   token        The requesting user's facebook access token
 * @param  {Function} callback     A function to execute at the end of the request
 */
function makeFacebookBatchRequest(relativeURLs, token, callback){
    //mapping the relative url data to the facebook format for batch requests
    var batch = _.map(relativeURLs, function(rurl){ return {method: 'GET', relative_url: rurl.url + '?' + querystring.stringify(rurl.fields)} });

    //preparing the fields for the request
    var fields = {access_token: token, batch: JSON.stringify(batch)};
    var fieldString = querystring.stringify(fields);

    //preparing the option object
    var options = {
        host: 'graph.facebook.com',
        port: 443,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }

    //making the request
    var req = https.request(options, function(res) {
        //getting the data chunks
        var fbData='';
        res.on('data', function(d) {
            fbData += d;
        });

        //processing the data when the data has been received
        res.on('end', function(d){
            //parsing the data
            var obtained = JSON.parse(fbData);

            //parsing the response body and mapping it into an array
            var mappedData = _.map(obtained, function(o){ return JSON.parse(o.body); });
            callback(mappedData);
        })
    });
    //writing the field string
    req.write(fieldString);
    req.end();

    //handling errors in the request by passing the error data to the callback
    req.on('error', function(e) {
        console.error(e);
        callback({error: true, message: e, data: []});
    });
}

var concatenateGetRequest = function(userArray, callback, extraFields){
    //console.log(Object.prototype.toString.call(userArray));

    if(typeof userArray == 'undefined' || typeof userArray.length != 'number' || userArray.length == 0){
        console.log('Received empty array...');        
        callback([]);
        return;
    }else if(userArray.length == 1 && userArray[0] == ''){
        callback([]);
        return;
    }    
    var fbIds = 'ids=';
    var listOfFbids = [];
    for(var i in userArray){
        listOfFbids.push(userArray[i]);
    }
    listOfFbids = _.uniq(listOfFbids);

    for(var i in listOfFbids){
        if(i>0 && i < listOfFbids.length ){
            fbIds += ',';
        }
        fbIds += listOfFbids[i];
    }
    
    var fields = 'fields=picture';
    if(extraFields){
        for(var i in extraFields.extraFields){
            fields+=','+extraFields.extraFields[i];
        }
        if(extraFields.fb_token){
            fields += '&access_token=' + extraFields.fb_token;
        }
    }
    fields+= '&type=large';


    var queryUrl = fbIds+'&'+fields;
    var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/?' + queryUrl, //parsing the request url path
        method: 'GET'
    };

    //making request
    var req = https.request(options, function(res) {
        //getting the data chunks
        var fbData = '';
        res.on('data', function(d) {
            fbData += d;
        });
        //processing the data when the data has been received 
        res.on('end', function(){     
            callback(JSON.parse(fbData));
        });
    });
    req.end();

    //handling errors in the request by passing the error data to the callback
    req.on('error', function(e) {
        console.log('Error Response received from facebook: ');
        console.log(options.path);
        console.error(e);
        callback({error: true, message: e, data: []});
    });        
}

var extendToken = function(access_token, callback){
    var getReqStr = '/oauth/access_token?client_id='+APP_ID
    + '&client_secret=' + APP_SECRET
    + '&grant_type=fb_exchange_token'
    + '&fb_exchange_token=' + access_token;
    var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: getReqStr, //parsing the request url path
        method: 'GET'
    };

    //making request
    var req = https.request(options, function(res) {
        //getting the data chunks
        var fbData = '';
        res.on('data', function(d) {
            fbData += d;
        });
        //processing the data when the data has been received 
        res.on('end', function(){        
            callback(querystring.parse(fbData));
        });
    });
    req.end();

    //handling errors in the request by passing the error data to the callback
    req.on('error', function(e) {
        console.error(e);
        callback({error: true, message: e, data: []});
    });    

}

var getFbPublicData = function(fbUserNameOrId){
    makeFacebookRequest(fbUserNameOrId,function(fbData){
        console.log(util.inspect(fbData));
    });
}

if (typeof exports !== "undefined") {
	exports.facebookGetUserPhotos = facebookGetUserPhotos;
	exports.facebookGetPhotoBatch = facebookGetPhotoBatch;
    exports.facebookGetSinglePhoto = facebookGetSinglePhoto;
    exports.facebookGetUserInfo = facebookGetUserInfo;
    exports.facebookGetFriends = facebookGetFriends;
    exports.facebookGetRandomFriends = facebookGetRandomFriends;
    exports.concatenateGetRequest = concatenateGetRequest;
    exports.extendToken = extendToken;
}
