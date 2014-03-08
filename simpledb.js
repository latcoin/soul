var util = require('util');
var _ = require('underscore');
var simpledb = require('simpledb');
var guid = require('guid');

var sdb = new simpledb.SimpleDB(
{
	// console.error("new db")
	keyid : 'AKIAJORSTMYVLCS3VAYQ',
	secret : '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'
});

var tables =
{
	user_profiles : 'user_profiles',
	knows_me : 'knows_me',
	evaluations : 'evaluations',
	history : 'history',
	user : 'user',
	traits : 'traits',
	comments : 'comments',
	packages : 'packages'
};
var tableArray = _.values(tables);

var addKeysToObject = function(hashObject, attributes)
{
	if (typeof attributes == 'object')
	{
		for ( var key in attributes)
		{
			hashObject[key] = attributes[key];
		}
	}
	return hashObject;
};

var divideInBatches = function(divideMe, batchSize)
{
	if (_.isArray(divideMe))
	{
		var batchArray = [];
		var numberOfBatches = divideMe.length / batchSize;
		for (var i = 0; i < numberOfBatches; i++)
		{
			var currentBatch = _.first(divideMe, batchSize);
			batchArray.push(currentBatch);
			divideMe = _.last(divideMe, divideMe.length - batchSize);
		}
		return batchArray;
	} else
	{
		return divideMe;
	}
};

var setTrust = function(evaluatingUser, evaluatedUser, score, callback)
{
	var attributes =
	{
		evaluatingUser : evaluatingUser,
		evaluatedUser : evaluatedUser,
		score : score
	};
	var itemName = evaluatingUser + '_' + evaluatedUser;
	sdb.putItem(tables.knows_me, itemName, attributes, function(err, res, meta)
	{
		if (!err)
		{
			callback(
			{
				success : true
			});
		} else
		{
			callback(
			{
				success : false
			});
		}
	});
};
exports.setTrust = setTrust;

var setDefaultTrust = function(evaluatingUser, evaluatedUser, score, callback)
{
	var attributes =
	{
		evaluatingUser : evaluatingUser,
		evaluatedUser : evaluatedUser,
		score : [ score ]
	};
	var itemName = evaluatingUser + '_' + evaluatedUser;
	sdb.putItem(tables.knows_me, itemName, attributes, function(err, res, meta)
	{
		if (!err)
		{
			callback(
			{
				success : true
			});
		} else
		{
			callback(
			{
				success : false
			});
		}
	});
};
exports.setDefaultTrust = setDefaultTrust;

var getTrustList = function(user, callback)
{
	sdb.select("select evaluatedUser, score from " + tables.knows_me
			+ ' where evaluatingUser = \'' + user + '\' limit 2500', function(
			err, res, meta)
	{
		if (!err)
		{
			callback(true, res, meta);
		} else
		{
			callback(false, meta);
		}
	});
};
exports.getTrustList = getTrustList;

var getSingleTrust = function(user, trustedUser, callback)
{
	sdb.select("select evaluatedUser, score from " + tables.knows_me
			+ ' where evaluatingUser = \'' + user + '\' and evaluatedUser = \''
			+ trustedUser + '\'', function(err, res, meta)
	{
		if (!err)
		{
			callback(true, res, meta);
		} else
		{
			callback(false, meta);
		}
	});
};
exports.getSingleTrust = getSingleTrust;

var createTables = function(tableArray)
{
	var tablesToCreate = [];
	sdb.listDomains(function(err, res, metadata)
	{
		if (err)
		{
		} else
		{
			tablesToCreate = _.difference(tableArray, res);
			_.each(tablesToCreate, function(tableName)
			{
				sdb.createDomain(tableName, function(error, result, metadata)
				{
					if (error)
					{
						// console.log(util.inspect(error));
					} else
					{
						// console.log('table created');
					}
				});
			});
		}
	});
};
exports.createTables = createTables;
// createTables(tableArray);

var putUser = function(userId, attributes, callback, conditionalAttr)
{
	sdb.putItem(tables.user, userId, attributes, function(err, res, meta)
	{
		if (err)
		{
			callback(
			{
				success : false
			});
		} else
		{
			callback(
			{
				success : true
			});
		}
	});
};
exports.putUser = putUser;

var putUserTraitOverall = function(userId, trait, overallValue, attributes,
		callback)
{
	debug('putUserTraitOverall');
	debug(userId + ' ' + trait + ' ' + overallValue + ' ' + attributes);
	var objectToPut =
	{
		userId : userId,
		traitName : trait,
		overallValue : overallValue,
		timestamp : Date.now()
	};
	if (!callback)
	{
		var callback = attributes;
	} else
	{
		objectToPut = addKeysToObject(objectToPut, attributes);
	}
	sdb.putItem(tables.user_profiles, userId + '_' + trait, objectToPut,
			function(err, res, meta)
			{
				if (!err)
				{
					callback(true);
				} else
				{
					// console.log(util.inspect(err));
					callback(false);
				}
			});
};
exports.putUserTraitOverall = putUserTraitOverall;

var getUser = function(userId, callback)
{
	sdb.getItem(tables.user, userId, function(err, res, meta)
	{
		if (!err)
		{
			// console.log(util.inspect(res));
			// console.log('---------meta');
			// console.log(util.inspect(meta));
			callback(
			{
				success : true
			}, res);
		} else
		{
			callback(
			{
				success : false
			});
		}
	});
};
exports.getUser = getUser;

var spendCredits = function(userId, amount, callback)
{
	getUser(userId, function(succ, user)
	{
		if (user.credits && user.credits >= amount)
		{
			var conditionalPars =
			{
				'Expected.1.Name' : 'credits',
				'Expected.1.Value' : user.credits
			};
			var attributesToPut =
			{
				'credits' : user.credits - amount
			};
			sdb.putItem(tables.user, userId, attributesToPut, conditionalPars,
					function(err, res, meta)
					{
						callback(true, attributesToPut.credits);
					});
		} else
		{
			console.log('not enough credits!');
			callback(false);
		}
	});
};
exports.spendCredits = spendCredits;

var increaseCredits = function(userId, amount, callback)
{
	getUser(userId, function(succ, user)
	{
		if (!succ)
		{
			callback(false);
		}
		var attributesToPut =
		{};
		var conditionalPars =
		{};
		if (user.credits)
		{
			attributesToPut.credits = parseInt(user.credits) + amount;
			conditionalPars =
			{
				'Expected.1.Name' : 'credits',
				'Expected.1.Value' : user.credits
			};
		} else
		{
			attributesToPut.credits = amount;
		}
		sdb.putItem(tables.user, userId, attributesToPut, conditionalPars,
				function(err, res, meta)
				{
					if (err)
					{
						callback(false);
					}
					callback(true, attributesToPut.credits);
				});
	});
};
exports.increaseCredits = increaseCredits;

var getUserList = function(startFrom, callback)
{
	debug('getUserList');
	var extraAttr =
	{};
	if (startFrom)
	{
		extraAttr.NextToken = startFrom;
	}
	sdb.select("select * from " + tables.user + ' limit 2500', extraAttr,
			function(err, res, meta)
			{
				if (!err)
				{
					debug('getUserList' + ' callback...' + res.length + ' '
							+ util.inspect(meta));
					callback(true, res, meta);
				} else
				{
					callback(false, err);
				}
			});
};
exports.getUserList = getUserList;

var getEntireUserList = function(globalCallback)
{
	var inLineGet = function(NextToken, callback, userArray)
	{
		if (!userArray)
		{
			var userArray = [];
		}
		getUserList(NextToken, function(err, res, meta)
		{
			userArray = _.union(userArray, res);
			if (meta.result.SelectResult.NextToken)
			{
				inLineGet(meta.result.SelectResult.NextToken, callback,
						userArray);
			} else
			{
				callback(userArray);
			}
		});
	};
	inLineGet(
	{}, globalCallback);
};
exports.getEntireUserList = getEntireUserList;

var deleteUser = function(userId, attributes, callback)
{
	sdb.deleteItem(tables.user, userId, attributes, function(err, res, meta)
	{
		if (!err)
		{
			callback();
		}
	});
}
exports.deleteUser = deleteUser;

var putBatchTraits = function(traits, callback)
{
	if (_.all(traits, function(trait)
	{
		return typeof trait.traitName == 'string' && trait.traitName != ''
	}))
	{
		for ( var i in traits)
		{
			traits[i]['$ItemName'] = traits[i].traitName;
			delete traits[i].traitName;
		}
		var batchedArray = divideInBatches(traits, 25);
		for ( var i in batchedArray)
		{
			var batchedObject =
			{};
			batchedObject.elements = batchedArray[i];
			if (batchedArray.length - 1 == i)
			{
				batchedObject.last = true;
			} else
			{
				batchedObject.last = false;
			}
			var timeoutId = setTimeout(function(batch, timeCallback)
			{
				sdb.batchPutItem(tables.traits, batch.elements, function(err,
						res, meta)
				{
					if (!err)
					{
						if (batchedObject.last == true)
						{
							timeCallback(true);
						}
					} else
					{
						timeCallback(false);
					}
				});
			}, i * 1000, batchedObject, callback);
		}

	} else
	{
		callback(false);
	}
}
exports.putBatchTraits = putBatchTraits;

var getTraitList = function(callback)
{
	debug('getTraitList');
	sdb.select("select * from " + tables.traits, function(err, res, meta)
	{
		if (!err)
		{
			callback(true, res);
		} else
		{
			callback(false, err);
		}

	});
};
exports.getTraitList = getTraitList;

var putEvaluation = function(evaluatedUser, evaluatingUser, trait, value,
		attributes, callback)
{
	var itemName = evaluatingUser + '_' + evaluatedUser + '_' + trait;
	var evaluation =
	{
		evaluatedUser : evaluatedUser,
		evaluatingUser : evaluatingUser,
		trait : trait,
		value : value
	};
	addKeysToObject(evaluation, attributes);
	evaluation = addKeysToObject(evaluation, attributes);
	sdb.putItem(tables.evaluations, itemName, evaluation, function(err, res,
			meta)
	{
		if (!err)
		{
			callback(true);
		} else
		{
			callback(false);
		}
	});
};
exports.putEvaluation = putEvaluation;

var getTraitEvaluations = function(trait, evalUser, callback)
{
	debug('getTraitEvaluations');
	debug(trait + ' ' + evalUser);
	var query = 'select value, evaluatingUser from ' + tables.evaluations
			+ ' where evaluatedUser = \'' + evalUser + '\'' + ' and trait = \''
			+ trait + '\'';
	sdb.select(query, function(err, res, meta)
	{
		if (!err)
		{
			callback(true, res);
		} else
		{
			callback(false);
		}
	});
};
exports.getTraitEvaluations = getTraitEvaluations;

var getUserEvaluations = function(evalUser, callback)
{
	debug('getUserEvaluations');
	debug(evalUser);
	var query = 'select * from ' + tables.evaluations
			+ ' where evaluatedUser = \'' + evalUser + '\'';
	sdb.select(query, function(err, res, meta)
	{
		if (!err)
		{
			callback(true, res);
		} else
		{
			callback(false);
		}
	});
};
exports.getUserEvaluations = getUserEvaluations;

var getEvaluatedTraits = function(evaluatingUser, evaluatedUser, callback)
{
	debug('getEvaluatedTraits');
	debug(evaluatingUser + ' ' + evaluatedUser);
	var query = 'select * from ' + tables.evaluations
			+ ' where evaluatingUser = \'' + evaluatingUser
			+ '\' and evaluatedUser = \'' + evaluatedUser + '\'';
	sdb.select(query, function(err, res, meta)
	{
		if (!err)
		{
			callback(true, res);
		} else
		{
			callback(false);
		}
	});
};
exports.getEvaluatedTraits = getEvaluatedTraits;

var getUserTraitValues = function(user, callback)
{
	debug('getUserTraitValues');
	debug(user);
	var query = 'select * from user where fb_id = \'' + user + '\'';
	console.log(query);
	sdb.select(query, function(err, res, meta)
	{
		console.log(res);
		console.log("-");
		console.log(err);
		if (!err)
		{
			callback(true, res);
		} else
		{
			callback(false);
		}
	});
};
exports.getUserTraitValues = getUserTraitValues;

var searchUserName = function(userNameBits, limit, callback)
{
	if (typeof userNameBits == 'string')
	{
		var capitalized = userNameBits.charAt(0).toUpperCase()
				+ userNameBits.slice(1);
		debug('Searching for: ' + userNameBits);
		// var query = 'select * from `user` where name like \''+ userNameBits +
		// '%\' or name like \'%' + capitalized + '\' limit ' + limit;
		// var query = 'select fb_id, name from user where name like \'' +
		// capitalized + '%\' or name like \'%' +userNameBits + '\' or name like
		// \'%' +userNameBits+ '%\'';
		var query = 'select fb_id, name from user where name like \'%'
				+ capitalized + '%\' or name like \'%' + userNameBits
				+ '%\' limit ' + limit;
		sdb.select(query, function(err, res, meta)
		{
			if (!err)
			{
				callback(true, res)
			} else
			{
				debug(err);
				callback(false);
			}
		});
	} else
	{
		console.log('userNAmeBits check failed...');
	}
}
exports.searchUserName = searchUserName;

var getComments = function(userVisited, callback)
{
	var query = 'select itemName, commentingUser, commentedUser, timestamp, comment, approvals, disapprovals, inResponseTo from '
			+ tables.comments
			+ ' where commentedUser = \''
			+ userVisited
			+ '\'';
	sdb.select(query, function(err, res, meta)
	{
		if (!err)
		{
			callback(res, true);
		} else
		{
			callback(false);
		}
	});
};
exports.getComments = getComments;

var putComment = function(commentedUser, commentingUser, comment, callback)
{
	var comment =
	{
		timestamp : Date.now().toString(),
		commentedUser : commentedUser,
		commentingUser : commentingUser,
		comment : comment
	};
	var gId = guid.raw();
	sdb.putItem(tables.comments, gId, comment, function(err, res, meta)
	{
		if (err)
		{
			callback(false);
		} else
		{
			callback(true, gId);
		}
	});
};
exports.putComment = putComment;

var putReplyComment = function(commentedUser, commentingUser, comment,
		inResponseTo, callback)
{
	var comment =
	{
		timestamp : Date.now().toString(),
		commentedUser : commentedUser,
		commentingUser : commentingUser,
		comment : comment,
		inResponseTo : inResponseTo
	};
	var gId = guid.raw();
	sdb.putItem(tables.comments, gId, comment, function(err, res, meta)
	{
		if (err)
		{
			callback(false);
		} else
		{
			callback(true, gId);
		}
	});
};
exports.putReplyComment = putReplyComment;

var getComment = function(commentId, callback)
{
	var query = 'select itemName, commentingUser, commentedUser, timestamp, comment, approvals, disapprovals, inResponseTo from '
			+ tables.comments + ' where itemName() = \'' + commentId + '\'';
	sdb.select(query, function(err, res, meta)
	{
		if (!err)
		{
			callback(res);
		} else
		{
			callback(false);
		}
	});
};

var deleteComment = function(commentId, fbID, callback)
{
	getComment(commentId, function(resp)
	{
		if (fbID.indexOf(resp[0].commentingUser) > -1)
		{
			sdb.deleteItem(tables.comments, commentId, function(err, res, meta)
			{
				if (!err)
				{
					callback(true);
				} else
				{
					callback(false);
				}
			});
		} else
		{
			callback(false);
		}
	});
};
exports.deleteComment = deleteComment;

var debug = function(debugMessageOrObject)
{
	var debug = false;
	if (debug)
	{
		console.log(util.inspect(debugMessageOrObject));
	}
};

var approveComment = function(commentId, approvingUser, callback)
{
	sdb.putItem(tables.comments, commentId,
	{
		approvals : [ approvingUser ]
	}, function(err, res, meta)
	{
		if (err)
		{
			callback(
			{
				success : false
			});
		} else
		{
			// console.log(util.inspect(res) + util.inspect(meta));
			callback(
			{
				success : true
			});
		}
	});
};
exports.approveComment = approveComment;

var removeApproval = function(commentId, approvingUser, callback)
{
	sdb.deleteItem(tables.comments, commentId,
	{
		approvals : [ approvingUser ]
	}, function(err, res, meta)
	{
		if (err)
		{
			callback(
			{
				success : false
			});
		} else
		{
			callback(
			{
				success : true
			});
		}
	});
};
exports.removeApproval = removeApproval;

var disapproveComment = function(commentId, disapprovingUser, callback)
{
	sdb.putItem(tables.comments, commentId,
	{
		disapprovals : [ disapprovingUser ]
	}, function(err, res, meta)
	{
		if (err)
		{
			callback(
			{
				success : false
			});
		} else
		{
			callback(
			{
				success : true
			});
		}
	});
};
exports.disapproveComment = disapproveComment;

var removeDissaproveComment = function(commentId, disapprovingUser, callback)
{
	sdb.deleteItem(tables.comments, commentId,
	{
		disapprovals : [ disapprovingUser ]
	}, function(err, res, meta)
	{
		if (err)
		{
			callback(
			{
				success : false
			});
		} else
		{
			callback(
			{
				success : true
			});
		}
	});
};
exports.removeDissaproveComment = removeDissaproveComment;

var getCreditPackages = function(callback)
{
	sdb.select("select * from " + tables.packages, function(err, res, meta)
	{
		if (!err)
		{
			callback(true, res);
		} else
		{
			callback(false, err);
		}
	});
};
exports.getCreditPackages = getCreditPackages;

var getUserProfile = function(id, callback)
{
	sdb.getItem(tables.user_profiles, id, function(err, res, meta)
	{
		if (!err)
		{
			callback(
			{
				success : true
			}, res);
		} else
		{
			callback(
			{
				success : false
			});
		}
	});
};
exports.getUserProfile = getUserProfile;