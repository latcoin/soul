var fs = require('fs');
var util = require('util');
var qs = require('querystring');
var http = require('http');
var _ = require('underscore');
var flow = require('flow');

var simpledb = require('../simpledb.js');

exports.calculateUserSingleTrait = flow.define(
	function(user, trait, callback, evaluatedTraits){
		this.user = user;
		this.trait = trait;
		this.callback = callback;
		this.evaluatedTraits = evaluatedTraits;
		exports.createTrustHash(user, this);
	},
	function(trustHash){
		this.trustHash = trustHash;
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

			//console.log(util.inspect(evaluatedTraits));

			var overWrite = true;
			if(isNaN(ponderatedMean)){				
				if(evaluatedTraits[trait]){
					overWrite = false;
				}else{
					ponderatedMean = Math.floor(Math.random()*50+50);
				}


			}

			if(overWrite){
				simpledb.putUserTraitOverall(user, this.trait, ponderatedMean, { evaluations : traitEvals.length },function(success){				
					if(success){						
						callback();
					}else{
						console.log('something went wrong somewhere while writing the overall trait score of ' + user);
						callback();
					}
				});
			}else{				
				callback();
			}
		}
	}
);

exports.calculateUserTraits = flow.define(
	function(user, traitList, callback){
		this.callback = callback;
		var multiObject = this.MULTI;
		simpledb.getUserTraitValues(user, function(success, evaluatedTraits){
			if(success){
				
				evaluatedTraits = convertArrayToHash(evaluatedTraits, 'traitName');				

				for(var i in traitList){
					exports.calculateUserSingleTrait(user, traitList[i], multiObject(), evaluatedTraits);
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

exports.createTrustHash = flow.define(
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

var traitList = [];
exports.simpleInsert = function(user, callback){
	console.log('calling simple insert for user: ' + user);
	//what if it gets updated? maybe I should have an interval clearing the traitList so its queried from the db from time to time..
	if(traitList.length == 0){		
		simpledb.getTraitList(function(success,list){
			if(success){
				var newList = list.map(function(elem){
					return elem['$ItemName'].toLowerCase().replace(/ /g, '_');
				});		
				traitList = newList;
				exports.calculateUserTraits(user, newList, callback);
			}
		});
	}else{
		exports.calculateUserTraits(user, traitList, callback);
	}
}

var convertArrayToHash = function(arrayObj, hashKeyProp){
	var hashObj = {};
	_.each(arrayObj, function(elem){
		hashObj[elem[hashKeyProp]] = elem;
	});			
	return hashObj;
}