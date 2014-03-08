var fs = require('fs');
var util = require('util');
var qs = require('querystring');
var http = require('http');
var _ = require('underscore');
var flow = require('flow');
var simpledb = require('./simpledb.js');

var calculateUserSingleTrait = flow.define(
	function(user, trustHash,trait,callback,evaluatedTraits){
		this.user = user;
		this.trait = trait;
		this.trustHash = trustHash;
		this.callback = callback;
		this.evaluatedTraits = evaluatedTraits;
		simpledb.getTraitEvaluations(this.trait, this.user, this);
	},
	function(success, traitEvals){		
		if(success){
			this.evaluations = traitEvals.map(function(elem){
				return _.pick(elem, 'evaluatingUser', 'value');
			});
			var trustHash = this.trustHash;
			var ponderatedSum = 0;
			var ponderations = 0;
			var user = this.user;
			var trait = this.trait;	
			var evaluatedTraits = this.evaluatedTraits;

			_.each(traitEvals, function(traitEval){		
				if(traitEval.evaluatingUser == user){
					console.log('Data inconsistency user rated himself in: ' + trait);
					return;
				}
				var trust = trustHash[traitEval.evaluatingUser];
				if(!trust){
					trust = 50;
				}				
				ponderatedSum += parseFloat(traitEval.value*trust);
				ponderations += parseFloat(trust);

			});	

			var ponderatedMean = ponderatedSum/ponderations;
			var callback = this.callback;
			var overWrite = true;

			if(isNaN(ponderatedMean)){		
				if(evaluatedTraits[trait]){
					overWrite = false;
				}else{		
					
					ponderatedMean = Math.floor(Math.random()*50+50);
				}
			}else{
				
			}
			if(overWrite){
				simpledb.putUserTraitOverall(user, this.trait, ponderatedMean, { evaluations : traitEvals.length }, function(success){		
					if(success){					
					}else{
						console.log('something went wrong somewhere while writing the overall trait score of ' + user);
					}
				});
			}
			callback();			
		}
	}
);

var calculateUserTraits = flow.define(
	function(user, traitList, callback){
		this.callback = callback;
		this.traitList = traitList;
		this.user = user;

		createTrustHash(user, this);
	},
	function(trustHash){		
		this.trustHash = trustHash;
		var user = this.user;
		var traitList = this.traitList;
		var multiObject = this.MULTI;
		simpledb.getUserTraitValues(user, function(success, evaluatedTraits){
			if(success){				
				evaluatedTraits = convertArrayToHash(evaluatedTraits, 'traitName');							
				for(var i in traitList){
					calculateUserSingleTrait(user, trustHash, traitList[i], multiObject(), evaluatedTraits);
				}
			}else{
				console.log('Get user trait values failed');
			}
		});

	},
	function(){
		this.callback();
	}
);

var createTrustHash = flow.define(
	function(user, callback){
		this.callback = callback;
		simpledb.getTrustList(user,this);
	},
	function(success, trustList, meta){
		if(success){
			var trustHash = {};
			_.each(trustList, function(trust){
				trustHash[trust.evaluatedUser] = trust.score;
			});			
			this.callback(trustHash);
		}
	}
);


var calculateBatchTraits = flow.define(
	function(){
		simpledb.getTraitList(this);
	},
	function(success, list){
		console.log('got the trait list: ' + list.length);
		var newList = list.map(function(elem){
			return elem['$ItemName'].toLowerCase().replace(/ /g, '_');
		});
		this.traitList = newList;
		this.completeTraitList = _.map(list, function(item){
			var trustWeight = item.trustWeight;
			if(!item.trustWeight){
				trustWeight = 0;
			}
			return { 'traitName' : item['$ItemName'].toLowerCase().replace(/ /g, '_'), trustWeight : parseFloat(trustWeight) };
		});
		this.completeTraitList = convertArrayToHash(this.completeTraitList, 'traitName')
		simpledb.getEntireUserList(this);
	},
	function(userList){
		console.log('Got: '+ userList.length + ' users');
		var traitList = this.traitList;
		var newUserList = userList.map(function(elem){
			return elem['$ItemName'];
		});

		var BatchedList = [[]];
		var batchSize = 10;
		var batchCount = 0;

		for(var i in newUserList){
			if(i>0 && i % batchSize == 0){
				batchCount++;
				BatchedList.push([]);
			}						
			BatchedList[batchCount].push(newUserList[i]);			
		}		

		console.log('BatchedList: ' + BatchedList.length);
		var completeTraitList = this.completeTraitList;
		flow.serialForEach(BatchedList, function(userBatch){			
			this.startTime = Date.now();
			this.userBatch = userBatch
			for(var i in userBatch){
				calculateUserTraits(userBatch[i], traitList, this.MULTI());
			}
			if(this.previousBatch){				
				for(var i in this.previousBatch){
					calculateTrustScore(this.previousBatch[i], completeTraitList);
				}
			}
			this.previousBatch = userBatch;

		}, function(){			
			console.log('finished a batch of: ' + this.userBatch.length);			
		}, function(){
			console.log('Done Writing all users!!');
		}
		);

	}
);

setInterval(calculateBatchTraits, 43200000);
calculateBatchTraits();


var calculateTrustScore = function(userId, trustWeight){
	simpledb.getUserTraitValues(userId, function(success, traitValues){
		if(success){
			var sum = 0;
			var weightSum = 0;			
			for(var i in traitValues){
				var weight = trustWeight[traitValues[i]['traitName']].trustWeight;
				weightSum += weight;
				sum += parseInt(traitValues[i].overallValue)*weight;						
			}			
			simpledb.putUser(userId, {trustScore : sum/weightSum}, function(){	
				console.log('added Trust Score!');
			});
		}
	});
}

var convertArrayToHash = function(arrayObj, hashKeyProp){
	var hashObj = {};
	_.each(arrayObj, function(elem){
		hashObj[elem[hashKeyProp]] = elem;
	});			
	return hashObj;
}