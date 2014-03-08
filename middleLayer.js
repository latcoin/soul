var _ = require('underscore');
var simpledb = require('./simpledb.js');
var util = require('util');
var flow = require('flow');
var facebook = require('./facebook');
var sanitizer = require('sanitizer');
var defaultDataCreator = require('./utilities/heavyCalcs.js');
var stripe = require('./stripe.js');

var listTraits = function(callback)
{
	simpledb.getTraitList(function(success, traits)
	{
		for ( var i in traits)
		{
			traits[i].traitName = traits[i].$ItemName;
			delete traits[i].$ItemName;
		}
		callback(success, traits);
	});
}

var scoreTrait = function(evaluatingUser, evaluatedUser, traitName, score,
		callback)
{
	if (evaluatingUser == evaluatedUser)
	{
		console.log('user trying to rate himself');
	} else
	{
		simpledb.putEvaluation(evaluatedUser, evaluatingUser, traitName, score,
		{
			'timestamp' : Date.now()
		}, function(success)
		{
			callback(success);
		});
	}
}

var setTrust = function(evaluatingUser, evaluatedUser, value, callback)
{
	simpledb.setTrust(evaluatingUser, evaluatedUser, value, function(success)
	{
		callback(success);
	});
}

var createUserIfNotExists = function(userId, attributes, callback)
{
	console.log('inside get user if not exists');
	simpledb.getUser(userId, function(success, user)
	{
		console.log('createUserIfNotExists success:' + util.inspect(success));
		if (!user)
		{
			simpledb.putUser(userId, attributes, callback);
		}
	});
}

var putUser = function(userId, attributes, callback)
{
	simpledb.putUser(userId, attributes, callback);
}

var calculateTraitValues = function(userId, callback, traits)
{
	simpledb.getUserEvaluations(userId, function(success, evaluations)
	{
		if (success)
		{
		} else
		{
		}
	});
}

var createTrustHash = flow.define(function(user, callback)
{
	this.callback = callback;
	simpledb.getTrustList(user, this);
}, function(success, trustList, meta)
{
	if (success)
	{
		var trustHash =
		{};
		_.each(trustList, function(trust)
		{
			trustHash[trust.evaluatedUser] = trust.score;
		});
		// console.log(util.inspect(trustHash));
		this.callback(trustHash);
	}
});

var getTrustList = function(user, callback)
{
	simpledb.getTrustList(user, function(success, trustList)
	{
		if (success)
		{
			callback(trustList);
		}
	});
}

var getUserTraitValues = function(user, callback)
{
	simpledb.getUserTraitValues(user, function(success, res)
	{
		if (success)
		{
			console.log("success");
			console.log(res);
			callback(success, res);
		} else
		{
			console.log("error");
			callback(success);
		}
	});
}

var searchUserName = function(userNameBits, limit, callback)
{
	simpledb
			.searchUserName(
					userNameBits,
					limit,
					function(success, res)
					{
						if (success)
						{
							var responseArr = res.map(function(elem)
							{
								return _.pick(elem, 'fb_id', 'name');
							});
							facebook
									.concatenateGetRequest(
											_.pluck(responseArr, 'fb_id'),
											function(fbResp)
											{
												for ( var i in responseArr)
												{
													responseArr[i].picture = fbResp[responseArr[i].fb_id].picture;
												}
												callback(true, responseArr);
											});

						} else
						{
							callback(false);
						}
					});
}

var getEvaluatedTraits = function(evaluatingUser, evaluatedUser, callback)
{
	simpledb.getEvaluatedTraits(evaluatingUser, evaluatedUser, function(
			success, traitRes)
	{
		var responseObj = [];
		_.each(traitRes, function(element)
		{
			responseObj.push(
			{
				traitName : element.trait,
				traitScore : element.value
			});
		});
		callback(success, responseObj);
	});
}

var getTraitListWithUserValues = function(requestedUser, callback)
{
	listTraits(function(success, traits)
	{
		if (success)
		{
			traits = _.sortBy(traits, 'traitName');
			getUserTraitValues(requestedUser, function(success, traitValues)
			{
				if (success)
				{
					traitValues = _.sortBy(traitValues, 'traitName');
					for (var i = 0; i < traitValues.length; i++)
					{
						traits[i].timestamp = traitValues[i].timestamp;
						traits[i].overallValue = traitValues[i].overallValue;
						traits[i].evaluations = traitValues[i].evaluations;
					}
					if (traitValues.length == 0)
					{
						traits = _.map(traits, function(t)
						{
							t.overallValue = 50;
							return t;
						});
					}
					traits = _.sortBy(traits, function(num)
					{
						return parseInt(num.correlative);
					});
					callback(true, traits);
				}
			});
		} else
		{
			callback(false);
		}
	});
}

var loginUser = function(facebook_token, callback)
{
	facebook.facebookGetUserInfo('me', facebook_token,
			'id,name,birthday,location,bio,gender,picture', function(fbResp)
			{
				var userData =
				{
					fb_token : facebook_token,
					fb_id : fbResp.id,
					name : fbResp.name,
					credits : 0
				};
				userData.lastLogin = Date.now();
				facebook.extendToken(userData.fb_token, function(extendedToken)
				{
					userData.fb_token = extendedToken.access_token;
					callback(userData);
					putUser(userData.fb_id, userData, function(success)
					{
						console.log('saved user with extended token');
					});
				});
				defaultDataCreator.simpleInsert(userData.fb_id, function()
				{
				});
				insertFriendsProcess(userData.fb_id, userData.fb_token);
			});
}

var insertFriendsProcess = flow.define(function(user, token)
{
	console.log('insert Friends Started...');
	this.user = user;
	this.token = token;
	getTrustList(user, this);
},
		function(hash)
		{
			this.trustHash = hash;
			facebook.facebookGetFriends(this.user, this.token,
					'id,name,picture', this);
		}, function(fbFriends)
		{
			var friendArray = _.pluck(fbFriends, 'id');
			var trustArray = _.pluck(this.trustHash, 'evaluatedUser');
			var newUsers = _.difference(friendArray, trustArray);
			if (newUsers.length > 0)
			{
				var insertTrustedUser = flow.define(function(evaluatingUser,
						userObject, insertCallback)
				{
					this.insertCallback = insertCallback;
					this.evaluatingUser = evaluatingUser;
					this.userObject = userObject;
					putUser(userObject.fb_id, userObject, this);
				}, function(success)
				{
					var currentUserId = this.userObject.fb_id;
					var insertCallback = this.insertCallback;
					simpledb.setDefaultTrust(this.evaluatingUser,
							this.userObject.fb_id, 50, function(success)
							{
								defaultDataCreator.simpleInsert(currentUserId,
										function()
										{
											insertCallback();
										});
							});
				});

				var loggedUser = this.user;
				/*
				 * _.each(newUsers, function(u){ var fbInfo = _.find(fbFriends,
				 * function(friend){ return friend.id == u });
				 * insertTrustedUser(loggedUser, {fb_id: fbInfo.id, name:
				 * fbInfo.name}); });
				 */
				flow.serialForEach(newUsers, function(u)
				{
					var fbInfo = _.find(fbFriends, function(friend)
					{
						return friend.id == u
					});
					insertTrustedUser(loggedUser,
					{
						fb_id : fbInfo.id,
						name : fbInfo.name
					}, this);
				}, function()
				{
					console.log('userInserted...');
				}, function()
				{
					console.log('done inserting user Friends...');
				});
			}
		});

var getRandomFriendsWithTrust = function(userFbId, fb_token, friendsToGet,
		callback)
{
	facebook
			.facebookGetRandomFriends(
					userFbId,
					fb_token,
					friendsToGet,
					'id,name,picture',
					function(fbFriends)
					{
						if (typeof fbFriends != 'string')
						{
							var friendIdArray = _.map(fbFriends, function(
									friend)
							{
								return friend.id;
							});
							simpledb
									.getTrustList(
											userFbId,
											function(success, trust)
											{
												if (success)
												{
													for ( var i in trust)
													{
														if (_
																.include(
																		friendIdArray,
																		trust[i].evaluatedUser))
														{
															var friendObj = _
																	.find(
																			fbFriends,
																			function(
																					friend)
																			{
																				return friend.id == trust[i].evaluatedUser;
																			});
															friendObj.trustValue = trust[i].score;
														}
													}
													callback(true, fbFriends);
												} else
												{
													callback(false);
												}
											});
						} else
						{
							console.log('facebook session expired?');
							callback(false);
						}

					});
}

var getSingleTrust = function(loggedUser, requestedUser, callback)
{
	simpledb.getSingleTrust(loggedUser, requestedUser, function(succ, res)
	{
		callback(succ, res);
	});
}

var getProfileInfo = function(requestedUser, callback, extraParams)
{
	facebook.concatenateGetRequest([ requestedUser ], function(fbResp)
	{
		for ( var i in fbResp)
		{
			fbResp = fbResp[i];
		}
		if (extraParams && extraParams.trustingUser)
		{
			getSingleTrust(extraParams.trustingUser, requestedUser, function(
					succ, res)
			{
				if (succ)
				{
					if (res.length > 0)
					{
						fbResp.trustScore = res[0].score;
					} else
					{
						fbResp.trustScore = 50;
					}
					callback(true, fbResp);
				}
			});
		} else
		{
			callback(true, fbResp);
		}
	}, extraParams);
}

var getComments = function(visitedUser, callback)
{
	simpledb.getComments(visitedUser, function(success, res)
	{
		if (success)
		{
			callback(success);
		} else
		{
			callback(false);
		}
	});
}

var putComment = function(commentedUser, commentingUser, comment, callback)
{
	var formattedComment = unescapeEntities(comment);
	simpledb.putComment(commentedUser, commentingUser, formattedComment,
			function(success, res)
			{
				if (success)
				{
					callback(true, res);
				} else
				{
					callback(false);
				}
			});
}

var putReplyComment = function(commentedUser, commentingUser, comment,
		inResponseTo, callback)
{
	var formattedComment = unescapeEntities(comment);
	simpledb.putReplyComment(commentedUser, commentingUser, formattedComment,
			inResponseTo, function(success, res)
			{
				if (success)
				{
					callback(true, res);
				} else
				{
					callback(false);
				}
			});
}

var deleteComment = function(commentId, fbID, callback)
{
	simpledb.deleteComment(commentId, fbID, function(success)
	{
		if (success)
		{
			callback(true);
		} else
		{
			callback(false);
		}
	});
}

var unescapeEntities = function(text)
{
	var formattedText = sanitizer.escape(text);
	return formattedText;
}

var approveComment = function(commentId, approvingUser, callback)
{
	simpledb.approveComment(commentId, approvingUser, callback);
}
var removeApproval = function(commentId, approvingUser, callback)
{
	simpledb.removeApproval(commentId, approvingUser, callback);
}
var disapproveComment = function(commentId, disapprovingUser, callback)
{
	simpledb.disapproveComment(commentId, disapprovingUser, callback);
}
var removeDisapproveComment = function(commentId, disapprovingUser, callback)
{
	simpledb.removeDissaproveComment(commentId, disapprovingUser, callback);
}

var getFriendListWithTrust = function(userId, fb_token, attributes, callback)
{
	facebook.facebookGetFriends(userId, fb_token, attributes, function(
			fb_friends)
	{
		createTrustHash(userId, function(trustHash)
		{
			for ( var i in fb_friends)
			{
				fb_friends[i].trustScore = trustHash[fb_friends[i].id];
			}
			callback(fb_friends);
		});
	});
}

var getCreditPackages = function(callback)
{
	simpledb.getCreditPackages(callback);
}

var spendCredits = function(userId, amount, callback)
{
	simpledb.spendCredits(userId, amount, callback);
}

var getUserInformation = function(fb_id, callback)
{
	simpledb.getUser(fb_id, function(success, userData)
	{
		if (success.success)
		{
			if (userData)
			{
				if (userData.credits)
				{
					callback(userData.credits);
				} else
				{
					callback(0);
				}
			}

		}
	});
}

var purchaseCreditPackage = flow.define(function(userId, stripeToken,
		packageName, callback)
{
	this.params =
	{
		userId : userId,
		stripeToken : stripeToken,
		packageName : packageName,
		callback : callback
	};
	getCreditPackages(this);
}, function(succ, packages)
{
	if (succ)
	{
		var params = this.params;
		if (_.chain(packages).map(function(elem)
		{
			return elem['$ItemName'];
		}).include(this.params.packageName).value())
		{// checks if the package name exists.
			var selectedPackage = _.find(packages, function(singlePackage)
			{
				return singlePackage['$ItemName'] == params.packageName;
			});
			this.params.creditsPurchased = parseInt(selectedPackage.credits);
			stripe.createCharge(
			{
				currency : 'usd',
				amount : parseInt(selectedPackage.usd) * 100,
				card : this.params.stripeToken
			}, this);

		} else
		{
			this.params.callback(
			{
				error : 'packageName does not exist!'
			});

		}
	}
}, function(err, chargeResp)
{
	if (!err)
	{
		// success!
		simpledb.increaseCredits(this.params.userId,
				this.params.creditsPurchased, this);
	} else
	{
		// Failed in stripe
		console.log(err.message);
		this.params.callback(err.message);
	}
}, function(success, newCreditAmount)
{
	this.params.callback(null, newCreditAmount);
});

exports.listTraits = listTraits;
exports.scoreTrait = scoreTrait;
exports.setTrust = setTrust;
exports.putUser = putUser;
exports.createTrustHash = createTrustHash;
exports.getTrustList = getTrustList;
exports.getUserTraitValues = getUserTraitValues;
exports.searchUserName = searchUserName;
exports.getTraitListWithUserValues = getTraitListWithUserValues;
exports.loginUser = loginUser;
exports.getRandomFriendsWithTrust = getRandomFriendsWithTrust;
exports.getProfileInfo = getProfileInfo;
exports.getComments = getComments;
exports.putComment = putComment;
exports.getEvaluatedTraits = getEvaluatedTraits;
exports.deleteComment = deleteComment;
exports.approveComment = approveComment;
exports.removeApproval = removeApproval;
exports.disapproveComment = disapproveComment;
exports.removeDisapproveComment = removeDisapproveComment;
exports.createUserIfNotExists = createUserIfNotExists;
exports.getFriendListWithTrust = getFriendListWithTrust;
exports.putReplyComment = putReplyComment;
exports.getCreditPackages = getCreditPackages;
exports.purchaseCreditPackage = purchaseCreditPackage;
exports.spendCredits = spendCredits;
exports.getUserInformation = getUserInformation;