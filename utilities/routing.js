var querystring = require('querystring');
var validation = require('./validationParameters.js');
var facebook = require('../facebook.js');
var middleLayer = require('../middleLayer.js');
var util = require('util');
var flow = require('flow');
var _ = require('underscore');
var defaultDataCreator = require('./heavyCalcs.js');

/**
 * Gets the parameters
 * @param  {string}   		method 		Obtein the method type (post or get)
 * @param  {string}         url     	Obtein the url
 * @param  {string}			data     	Obtein the data send by post
 * @param  {Function}       callback  	A function to execute at the end of the validationParams
 */

var postAction = function(req, res, data){
	data = querystring.parse(data);
	//Compare if the url exist and validates its parameters
	if(req.url == '/login'){
		if(validation.verifyParameters(['token'],data)){
			facebook.facebookGetUserInfo('me', data.token, 'id,name,birthday,location,bio,gender,picture', function(fbResp){
				console.log(util.inspect(fbResp));
				var userData = {
					fb_token : data.token,
					fb_id : fbResp.id,
					name : fbResp.name,
				};			
				req.session.userData = userData;
				userData.lastLogin = Date.now();
				middleLayer.putUser(userData.fb_id, userData, function(success){
					console.log('user updated: ' + success);
				});
				insertFriendsProcess(userData.fb_id, userData.fb_token);
				respondJson(res, { success:true, redirect_url : '/profile.html?user=' + userData.fb_id } );
			});

		}else{
			console.log('invalid parameters..');
			respondJson(res, { success:false } );
		}
		return;
	}

	var sessionData = req.session.userData;

	switch (req.url) { 
		case "/ProfileInfo":
			console.log('url: ProfileInfo');
			var sessionData = req.session.userData;
			expectedParameters = ['requestedUser'];
			if(validation.verifyParameters(expectedParameters, data)){
				var result = {};
				facebook.facebookGetUserInfo(data.requestedUser, sessionData.fb_token, 'id,name,birthday,location,bio,gender,picture', function(resp){
					result.fbData = resp;					
					facebook.facebookGetRandomFriends(sessionData.fb_id, sessionData.fb_token, 7, 'id,name,picture', function(res2){
						result.friends = res2;
						middleLayer.getComments(data.requestedUser, function(res3){
							var idsArray = [];
							for (var i=0; i< res3.length; i++){
								idsArray.push(res3[i].commentingUser);
							}
							result.comments = res3;
							facebook.concatenateGetRequest(idsArray, function(res4){
								result.pictures = res4;
								respondJson(res, result);
							});
						});
					});
				});
			}else {
				console.log('Some paramenter not exist!');
				respondError(res, 'Parameters incomplete!')
			}
		break;
	   	case "/ScoreTrait": 
	   		if(validation.verifyParameters(['traitName', 'score', 'evaluatedUser'], data)){
		   		middleLayer.scoreTrait(sessionData.fb_id, data.evaluatedUser, data.traitName, data.score, function(success){
		   			respondJson(res, {success:success});
		   		});
	   		}else{
	   			console.log('missing parameters...');
	   			respondError(res, 'Missing Parameters!');
	   		}
	      	console.log('url: ScoreTrait');
	      	break; 
	   	case "/SetTrust": 
	      	console.log('url: SetTrust' + util.inspect(data));
	      	if(validation.verifyParameters(['value', 'evaluatedUser'], data)){
	      		middleLayer.setTrust(sessionData.fb_id, data.evaluatedUser, data.value, function(success){
	      			respondJson(res, { success: success });
	      		});
	      	}else{
	      		respondError(res, 'Missing Parameters!');
	      	}
	      	break; 
	    case "/SaveComment":
	    	console.log('url: saveComment');
	    	middleLayer.putComment(data.commentedUser, data.commentingUser, data.comment, function (resData){
	    		respondJson(res, {message: resData});
	    	})
			break;
		case "/getTraitList":
			if(validation.verifyParameters(['requestedUser']), data){
				if(data.requestedUser == 'me'){
					data.requestedUser = sessionData.fb_id;
				}
				middleLayer.listTraits(function(success,traits){
					if(success){
						traits = _.sortBy(traits, 'traitName');
						middleLayer.getUserTraitValues(data.requestedUser, function(success, traitValues){
							if(success){
								traitValues = _.sortBy(traitValues, 'traitName');
								for(var i = 0; i < traitValues.length; i++){
									traits[i].timestamp = traitValues[i].timestamp;
									traits[i].overallValue = traitValues[i].overallValue;
								}
								var respObject = {
									traits : traits									
								}
								respondJson(res, respObject);
							}
						});

					}else{
						respondError(res, 'Traits unavailable');
					}
				});				
			}

			break;
		case "/SearchFriends":
			console.log('url: ProfileInfo');
			var sessionData = req.session.userData;
			expectedParameters = ['requestedUser'];
			if(validation.verifyParameters(expectedParameters, data)){
				var result = {};
				facebook.facebookGetUserInfo(data.requestedUser, sessionData.fb_token, 'id,name,birthday,location,bio,gender,picture', function(resp){
					result.fbData = resp;					
					facebook.facebookGetFriends(sessionData.fb_id, sessionData.fb_token, 'id,name,picture', function(res2){
						result.friends = res2;
						respondJson(res, result);//RESPONSE IS HERE
					});
				});
			}else {
				console.log('Some paramenter not exist!');
				respondError(res, 'Parameters incomplete!')
			}
		break;
		case "/getTraitValues":
		break;
	   	default: 
	      	 console.log('-> Wrong url');
		}
}

var getAction = function(req, response){
	//Get the url format (parameters and url route)
	var getData = getUrlParameters(req.url);
	if(checkSession(req, response)){
		switch(getData.url){
			case "/ProfileInfo" :
				break;
			case "/Search" :
				console.log('url: Search');
				expectedParameters = ['name'];
				if(validation.verifyParameters(expectedParameters, getData.parameters) ) {
					var result = {};
					var sessionData = req.session.userData;
					facebook.facebookSearchFriends(sessionData.fb_id, sessionData.fb_token, getData.parameters.name, function(resp){
						var result = {};
						result.foundUsers = resp;
						respondJson(response, result);
					});
				}

				break;

		 	case "/":
		 		console.log('url: /');
		 		break;

		 	case "/checkUser": 
		 		console.log(util.inspect(getData));
		 	break;
			default:
				console.log('Wrong url' + req.url);
			break;
		}
	}else{
		console.log('session invalid');
		console.log(getData.url);
	}
	//do this regardless of sesion status
	switch(getData.url){
	 	case "/searchAsoul":
	 		var expectedParameters = ['searchStr'];		 		
	 		if(validation.verifyParameters(expectedParameters, getData.parameters)){		 			
	 			middleLayer.searchUserName(getData.parameters.searchStr, 10, function(success, resp){
	 				if(success){
	 					respondJson(response, resp);
	 				}else{
	 					respondError(response, 'something\'s wrong with the G-Diffuser');
	 				}
	 			});
	 		}else{
	 			respondError(response, 'Invalid Parameters');
	 		}
	 	break;
	 	default:
	 		respondJson(response, { message : 'Please Login...', redirect_url : '/index.html' });
	 	break;
	}		
}
//This function make a format with the url in GET method
//Obtain the url and separate the paramaters
function getUrlParameters(url){
	var pathname;
	var query;
	var parameters;
	
	var query = url.split('?');
	pathname= query[0];

	parameters = querystring.parse(query[1]);

	returnMe = { url : pathname, parameters : parameters };

	return returnMe;
}

var respondJson = function(res, respBody){
	var jsonResponse = JSON.stringify(respBody);
	res.writeHead(200, {
		'Content-Type' : 'application/json'
	});
	res.end(jsonResponse);
}

var respondError = function(res, respMessage){
	res.writeHead(500,{});
	if(respMessage)
		res.end(respMessage);
	else
		res.end('error!');	
}

var checkSession = function(req, res){
	if(typeof req.session.userData == 'object' && typeof req.session.userData.fb_id == 'string'){
		console.log('session valid');
		return true;
	}else{		
		console.log('session invalid!');
		return false;
	}
}

var insertFriendsProcess = flow.define(
	function(user, token){
		console.log('-began friends process');
		this.user = user;
		this.token = token;
		middleLayer.getTrustList(user, this);
	},
	function(hash){
		console.log('- began friends process');
		this.trustHash = hash;
		facebook.facebookGetFriends(this.user, this.token, 'id,name,picture', this);
	},
	function(fbFriends){
		console.log('--began friends process');
		var friendArray = _.pluck(fbFriends, 'id');
		var trustArray = _.pluck(this.trustHash, 'evaluatedUser');
		var newUsers = _.difference(friendArray, trustArray);
		console.log(friendArray.length + ' trust: ' +  trustArray.length + ' diff' + newUsers.length);
		if (newUsers.length > 0){			
			var insertTrustedUser = flow.define(
				function(evaluatingUser, userObject){
					this.evaluatingUser = evaluatingUser;
					this.userObject = userObject;
					middleLayer.putUser(userObject.fb_id, userObject, this);
				},
				function(success){
					var currentUserId = this.userObject.fb_id;
					middleLayer.setTrust(this.evaluatingUser, this.userObject.fb_id, 50, function(success){
						console.log('default trust added ' + util.inspect(success));
						defaultDataCreator.simpleInsert(currentUserId, function(){
							console.log('');
						});
					});
				}
			);

			var loggedUser = this.user;
			_.each(newUsers, function(u){
				var fbInfo = _.find(fbFriends, function(friend){ return friend.id == u });
				insertTrustedUser(loggedUser, {fb_id: fbInfo.id, name: fbInfo.name});
			});
		}
	}
);

exports.getAction = getAction;
exports.postAction = postAction;
