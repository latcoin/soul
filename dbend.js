var util = require('util');
var _ =  require('underscore');
var ddb = require('dynamodb').ddb(
	{ 
		accessKeyId: 'AKIAIZQEOSANDBFCDQEA',
		secretAccessKey: '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' 
	}
);


var tables_v1 = [
	{	table_name : 'knows_me', 
		hash : [
			'userId', 
			ddb.schemaTypes().string 
		], 
		range : [
			'weightedUserId',
			ddb.schemaTypes().string
		],
		read : 5,
		write : 5
	},
	{	table_name : 'user_profile', 
		hash : [
			'userId', 
			ddb.schemaTypes().string 
		], 
		range : [
			'trait',
			ddb.schemaTypes().string
		],
		read : 5,
		write : 5
	},
	{	table_name : 'evaluations', 
		hash : [
			'evaluatedUser', 
			ddb.schemaTypes().string 
		], 
		range : [
			'trait_evaluatingUser',
			ddb.schemaTypes().string
		],
		read : 5,
		write : 5
	},
	{	table_name : 'history', 
		hash : [
			'userId', 
			ddb.schemaTypes().string 
		], 
		range : [
			'timestamp',
			ddb.schemaTypes().number
		],
		read : 5,
		write : 5
	},
	{	table_name : 'traits', 
		hash : [
			'traitName', 
			ddb.schemaTypes().string 
		],
		read : 5,
		write : 5
	},
	{	table_name : 'user_info', 
		hash : [
			'userId', 
			ddb.schemaTypes().string 
		],
		read : 5,
		write : 5
	},	
];

//util func
var addKeysToObject = function(hashObject, attributes){
	if(typeof attributes == 'object'){
		for(var key in attributes){
			hashObject[key] = attributes[key];
		}
	}
	return hashObject;
}
var isArray = function(checkMe){
	if(typeof checkMe == 'object' && Object.prototype.toString.call(checkMe) == '[object Array]'){
		return true;		
	}else{
		return false;
	}
}
var divideInBatches = function(divideMe, batchSize){
	if(isArray(divideMe)){
		var batchArray = [];
		var numberOfBatches = divideMe.length / batchSize;		
		for(var i = 0; i<numberOfBatches; i++){
			var currentBatch = _.first(divideMe,batchSize);
			batchArray.push(currentBatch);
			divideMe = _.last(divideMe,divideMe.length - batchSize);
		}
		return batchArray;
	}else{
		return divideMe;
	}
}
//
var TABLENAMES = {
	traits : 'traits',
	history : 'history',
	evaluations : 'evaluations',
	user_profile : 'user_profile',
	knows_me : 'knows_me',
	user_info : 'user_info'
}; 

var getTableMaxWrite = function(tableName, tableCreationArray){
	return _.find(tableCreationArray, function(table){
		return table.table_name == tableName;
	}).write - 2;
}

var createTables = function(tables){		
	ddb.listTables({}, function(err, res){
		if(!err){
			var tableNames = {};
			for(var i in res.TableNames){
				tableNames[res.TableNames[i]] = res.TableNames[i];
			}
			for(i=0; i < tables.length; i++){
				var table = tables[i];
				if(tableNames[table.table_name]){
					console.log("Table: >>>" + table.table_name + "<<< already exists, breaking");
					continue;
				}
				console.log(util.inspect(table));
				ddb.createTable(table.table_name,
					{
						hash: table.hash,
				    	range: table.range
				    },
				    {
				    	read: table.read,
				    	write: table.read
				    },
				    function(err, details){
				    	if(err){
				    		console.log("Failed to create: " + table.table_name);
				    	}else{
				    		console.log("Table created succesfully");
						}
			    	}
				);
			}
		}
	});
};

//createTables(tables_v1);

var putUserTraitScore = function(userId, trait, attributes, callback){
	if(typeof userId == 'string' && typeof trait == 'string'){	
		var initialValues = {
			value : 5,
			userId : userId,
			trait : trait
		};
		initialValues = addKeysToObject(initialValues, attributes);
		console.log(util.inspect(initialValues));
		ddb.putItem(TABLENAMES.user_profile, initialValues, {}, function(err, res, cap){
			if(!err){
				callback(null, true);
			}else{
				callback(err);
			}
		});
	}else{
		callback('Invalid Parameters!');
	}
}

var getAllTraitScores = function(userId, callback, options){
	if(typeof userId == 'string'){
		if(!options)
			var options = {};
			ddb.query(TABLENAMES.user_profile, userId, options, function(err, res, cap){
				if(!err){
					callback(null, res.items, res.count, res.lastEvaluatedKey);
				}else{
					callback(err);
				}
			});
	}
}

var putTrait = function(traitName, traitDesc, extraAttr, callback){
	if( traitName && traitDesc ){		
		var trait = {
			traitName : traitName,
			traitDesc : traitDesc
		};
		trait = addKeysToObject(trait, extraAttr);
		ddb.putItem(TABLENAMES.traits, trait, {}, function(err, res, cap){
			if(!err){
				console.log(util.inspect(res));
				console.log('capacity: ' + util.inspect(cap));
				callback();
			}else{
				console.log('error: ' + util.inspect(err));
			}
		});
	}
}

var putBatchTraits = function(traits, callback){
	if(_.all(traits, function(trait){ return typeof trait.traitName == 'string' && trait.traitName != ''})){
		var batchedArray = divideInBatches(traits, getTableMaxWrite(TABLENAMES.traits, tables_v1));
		for(var i in batchedArray){
			var batchInserter = {};
			batchInserter[TABLENAMES.traits] = batchedArray[i];
			var timeoutId = setTimeout(function(batch){
				console.log('Writing: ' + util.inspect(batch));
				ddb.batchWriteItem(batch, null, function(err, res){
					if(err){
						console.log('error... on putBatchTraits');
						callback(err);
					}else{
						console.log('success... putBatchTraits');
						callback(null, res);
					}
				});
			}, i*1000, batchInserter);			
		}
	}else{
		console.log('Traits should have traitName');
		callback('Traits should have traitName');
	}
}
var traits = [];
for(var i = 0; i < 1000; i++){
	traits.push({ traitName : i + 'tonteras'});
}
putBatchTraits(traits, function(err, res){
	console.log(util.inspect(res));
});

var getTraitList = function(callback){
	ddb.scan(TABLENAMES.traits, {}, function(err, res){
		if(err){
			console.log(err);
		}else{
			console.log(util.inspect(res));
			callback(undefined, res.items);
		}
	});
}

// getTraitList(function(err, res){
// 	if(!err){
// 		console.log('got the trait list..' + res.length);
// 	}
// });

var putEvaluation = function(evaluatedUser, evaluatingUser, trait, value, attributes, callback){
	var evaluation = {
		evaluatedUser : evaluatedUser,
		trait_evaluatingUser : trait + '_' + evaluatingUser,
		value : value
	};
	evaluation = addKeysToObject(evaluation, attributes);
	ddb.putItem(TABLENAMES.evaluations, evaluation, {}, function(err, res, cap){
		if(!err){
			console.log(util.inspect(res));
			console.log('capacity: ' + util.inspect(cap));
			callback();
		}else{
			console.log('error: ' + util.inspect(err));
		}
	});
}

var createUser = function(userId, attributes, callback){

	var newItem = {
		userId : userId
	};
	newItem = addKeysToObject(newItem, attributes);
	ddb.putItem(TABLENAMES.user_info, newItem, {}, function(err, res, cap){
		if(!err){			
			console.log('capacity: ' + util.inspect(cap));
			callback();
		}else{
			console.log('error: ' + util.inspect(err));
		}
	});
}

var batchCreateUsers = function(users, callback){
	if(_.all(users, function(user){	return typeof user.userId == 'string' })){
		var batchInserter = {};
		batchInserter[TABLENAMES.user_info] = users;
		ddb.batchWriteItem(batchInserter, null, function(err, res){
			if(err){
				callback(err);
			}else{
				callback(null, res);
			}
		});
	}else{
		callback({message : 'Users must have at least a string named: userId'});
	}
}
var getUser = function(userId, callback){
	ddb.getItem(TABLENAMES.user_info, userId, null, {}, function(err, res, cap){
		if(!err){			
			callback(null, res);			
		}else{
			callback(err);
		}
	});
}

var getUsers = function(users, callback){
	var batchSelector = {};
	batchSelector[TABLENAMES.user_info] = {
			keys : users 
		}
	ddb.batchGetItem( 
		batchSelector,
		function(err, res){
			if(err){
				callback(err);
			}else{
				callback(null, res.items);
			}
		});
}


var users = [{userId : '1', name : 'Miguel1'},{userId : '2', name : 'Miguel2'},{userId : '3', name : 'Miguel3'},{userId : '4', name : 'Miguel4'},{userId : '5', name : 'Miguel5'}];
/*
getUsers(['1','2','3','4','5','123481884219'], function(err, res){
	console.log(util.inspect(err));
	console.log(util.inspect(res));
});
*/
var setTrust = function(user, scoredUser, score, attributes, callback){
	var insertMe = {
		userId : user,
		//weightedUserId
	}
}

exports.putTrait = putTrait;
exports.putBatchTraits = putBatchTraits;