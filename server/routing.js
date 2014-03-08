var querystring = require('querystring');
var validation = require('../utilities/validationParameters.js');
var facebook = require('../facebook.js');
var middleLayer = require('../middleLayer.js');
var util = require('util');
var flow = require('flow');
var _ = require('underscore');
var defaultDataCreator = require('../utilities/heavyCalcs.js');

var sessionUrlPreffix = '/actions/';
var nonSessionUrlPreffix = '/requests/';

var timestamp = 0;

exports.routePostReq = function(req, res, postData){	
	postData = querystring.parse(postData);	
	console.log(req.url);
	if(req.url.indexOf(sessionUrlPreffix) == 0 && checkSession(req)){

		var sessionData = req.session.userData;

		switch(req.url){
			case sessionUrlPreffix + 'setTrust':
				if(checkPostData(['value', 'evaluatedUser'], postData, res)){
		      		middleLayer.setTrust(sessionData.fb_id, postData.evaluatedUser, postData.value, function(success){
		      			respondJson(res, { success: success });
		      		});					
				}
			break;
			case sessionUrlPreffix + 'scoreTrait':
				if(checkPostData(['traitName', 'score', 'evaluatedUser'], postData, res)){
		   			middleLayer.scoreTrait(sessionData.fb_id, postData.evaluatedUser, postData.traitName, postData.score, function(success){
		   				respondJson(res, {success:success});
		   			});
				}
			break;
			case sessionUrlPreffix + 'searchFriends':
				if(checkPostData(['requestedUser'], postData, res)){
					middleLayer.getFriendListWithTrust(sessionData.fb_id, sessionData.fb_token, 'id,name,picture', function(result){						
						respondJson(res, result);
					});
				}
			break;	
			case sessionUrlPreffix + 'getRandomFriends':
				if(checkPostData(['amountRequested'], postData, res)){					
					middleLayer.getRandomFriendsWithTrust(sessionData.fb_id, sessionData.fb_token, postData.amountRequested, function(success, friends){
						if(success){							
							respondJson(res, friends);
						}else{
							respondJson(res, []);
						}
					});
				}
			break;		
			case sessionUrlPreffix + 'getMyEvaluations':
				if(checkPostData(['requestedUser'], postData, res)){					
					middleLayer.getEvaluatedTraits(sessionData.fb_id, postData.requestedUser, function(success, resp){
						if(success){
							respondJson(res, resp);
						}else{
							respondJson(res, []);
						}					
					});
				}
			break;			
			case sessionUrlPreffix+'saveComment':
				if(checkPostData(['commentedUser', 'comment'], postData, res)){
					middleLayer.spendCredits(sessionData.fb_id, 5, function(success, newAmmount){
				   		if(success){
					   		middleLayer.putComment(postData.commentedUser, sessionData.fb_id, postData.comment, function (resData, guid){
					   			respondJson(res, {message: guid, newAmmount: newAmmount});
					   		});
					   	} else {
					   		respondJson(res, false);
					   	}

				   	});
				}
			break;

			case sessionUrlPreffix+'saveReplyComment':
				if(checkPostData(['commentedUser', 'comment'], postData, res)){
					middleLayer.spendCredits(sessionData.fb_id, 5, function(success, newAmmount){
						if(success){
				   			middleLayer.putReplyComment(postData.commentedUser, sessionData.fb_id, postData.comment, postData.inResponseTo, function (resData, guid){
				   				respondJson(res, {message: guid, newAmmount: newAmmount});
				   			});
			   			} else{
			   				respondJson(res, false);
			   			}
		    		});
				}
			break;

			case sessionUrlPreffix+'deleteComment':				
				middleLayer.deleteComment(postData.commentId, sessionData.fb_id, function(result){
					respondJson(res, {message: result});
				})
			break;
			case sessionUrlPreffix+'approveComment':
				if(checkPostData(['commentId'], postData, res)){
					middleLayer.approveComment(postData.commentId, sessionData.fb_id, function(success){
						if(success)respondJson(res, { message : 'complete!' });
					});
				}
			break;
			case sessionUrlPreffix+'removeApproval':
				if(checkPostData(['commentId'], postData, res)){
					middleLayer.removeApproval(postData.commentId, sessionData.fb_id, function(success){
						if(success)respondJson(res, { message : 'complete!' });
					});
				}
			break;
			case sessionUrlPreffix+'disapproveComment':
				if(checkPostData(['commentId'], postData, res)){
					middleLayer.disapproveComment(postData.commentId, sessionData.fb_id, function(success){
						if(success)respondJson(res, { message : 'complete!' });
					});
				}
			break;
			case sessionUrlPreffix+'removeDisapproveComment':
				if(checkPostData(['commentId'], postData, res)){
					middleLayer.removeDisapproveComment(postData.commentId, sessionData.fb_id, function(success){
						if(success)respondJson(res, { message : 'complete!' });
					});
				}
			break;			
			case sessionUrlPreffix+'purchaseCreditPackage':
				if(checkPostData(['packageName','stripeToken'], postData, res)){
					middleLayer.purchaseCreditPackage(sessionData.fb_id, postData.stripeToken, postData.packageName, function(err, newCreditAmount){
						if(!err){
							respondJson(res, newCreditAmount);
						}else{
							respondError(res, err);
						}
					});
				}
			break;	
			case sessionUrlPreffix+'getMyCredits' :
				middleLayer.getUserInformation(req.session.userData.fb_id, function(dataResp){
					respondJson(res, dataResp);
				});
			break;
			default:				
				respondError(res, 'Wrong Url');
			break;
		}
	}else if(req.url.indexOf(nonSessionUrlPreffix) == 0){
		switch(req.url){
			case nonSessionUrlPreffix+'getTraitList':
				if(checkPostData(['requestedUser'], postData, res)){
					middleLayer.getTraitListWithUserValues(postData['requestedUser'], function(success, traits){
						if(success){
							respondJson(res, {traits: traits});
						}else{
							respondError(res);
						}
					});
				}
			break;
			case nonSessionUrlPreffix+'showProfile':
				var data = {};
				if(checkPostData(['requestedUser'], postData, res)){					
					var fbParams = { 
						extraFields: ['bio','gender','birthday','name','location','id']						
					};
					if(checkSession(req)){
						fbParams.fb_token = req.session.userData.fb_token;
						if(postData.requestedUser != req.session.userData.fb_id){
							fbParams.trustingUser = req.session.userData.fb_id;
						}
					}					
					middleLayer.getProfileInfo(postData.requestedUser, function(success,fbResp){
						if(success){
							var userData = {
								fb_id : fbResp.id,
								name : fbResp.name
							};

							middleLayer.createUserIfNotExists(fbResp.id, userData, function(success){
								if (success){					
												
								}																
							});

							data.fbData = fbResp;
								respondJson(res, data);
						}
					}, fbParams);
				}
			break;	
			case nonSessionUrlPreffix+'login':
				var fbid;
				if(checkPostData(['token'], postData, res)){
					middleLayer.loginUser(postData.token, function(userData){
						req.session.userData = userData;
						fbid = userData.fb_id;
						respondJson(res, { success:true, redirect_url : '/profile.html?user=' + userData.fb_id, something: '1' } );
					});
				}
			break;
			case nonSessionUrlPreffix+'searchAsoul':				
				timestamp = postData.tstamp;				
				if(checkPostData(['searchStr'], postData, res)){
					middleLayer.searchUserName(postData.searchStr, 10, function(success, resp){
						if(success){
							resp = {
								timestamp : postData.tstamp,
								users : resp
							};							
							respondJson(res, resp);
						}
					});
				}
			break;
			case nonSessionUrlPreffix+'getComments':
				if(checkPostData(['requestedUser'], postData, res)){
					//I dont like how this function looks, will change it eventually
					middleLayer.getComments(postData.requestedUser, function(res3){
						var result = {};
						var idsArray = [];
						for (var i=0; i< res3.length; i++){
							idsArray.push(res3[i].commentingUser);
						}						
						res3 = _.sortBy(res3, function(el){
							var approve = 0;
							var disapprove = 0;
							if (_.isUndefined(el.approvals)){
								approve = 0;
							}
							else if(_.isString(el.approvals)){
								approve = 1;
							}
							else{
								approve = el.approvals.length;
							}
							if (_.isUndefined(el.disapprovals)){
								disapprove = 0;
							}
							else if(_.isString(el.disapprovals)){
								disapprove = 1;
							}
							else{
								disapprove = el.disapprovals.length;
							}
							return disapprove - approve;
						});
						result.comments = res3;			
						facebook.concatenateGetRequest(idsArray, function(res4){
							result.pictures = res4;
							respondJson(res, result);
						}, {extraFields : ['name']});
					});
				}
			break;
			case nonSessionUrlPreffix+'getCreditPackages':							
				middleLayer.getCreditPackages(function(succ,packages){
					if(succ)
						respondJson(res, packages);
				});			
			break;
			default:
				console.log( 'wrong url' + req.url);
				respondError(res, 'Wrong Url');
			break;
		}
	}else{
		respondError(res, 'invalid URL or Session required');
	}
}

var checkSession = function(req){
	if(req.session && typeof req.session.userData == 'object' && typeof req.session.userData.fb_id == 'string'){		
		return true;
	}else{		
		return false;
	}
}

var respondError = function(res, respMessage){
	res.writeHead(500,{});
	if(respMessage)
		res.end(respMessage);
	else
		res.end('error!');	
}

var respondJson = function(res, respBody){
	var jsonResponse = JSON.stringify(respBody);
	res.writeHead(200, {
		'Content-Type' : 'application/json'
	});
	res.end(jsonResponse);
}


var checkPostData = function(expectedParameters, jsonparameters, res){
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
		respondError(res, 'expected parameters: ' + util.inspect(expectedParameters));
		return false;
	}
}
