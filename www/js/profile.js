var traitDescriptions = new Object();
var friendsLoaded = false;
var traitsLoaded = false;
var lastTimeStamp = 0;
var traitValueBefore;

$(document).ready(function(){
	verifyData();
	$('.top-bar .icon.logo.small').click(function(){
		if (IsLoggedIn()){
			window.location = '/profile.html?user=' + GetSessionValue("user").fbID;
		}
		else{
			window.location = '/index.html';
		}
	});

	$('.black-container.friend .profile-pic').live('click', function(){
		var id = $(this).closest('.black-container.friend').attr('id');
		redirectToProfile(id);
	});

	var param = GetQueryValue('user');
	showProfile(param);
	if (IsLoggedIn()){
		getRandomFriends(7);
		var fbID = GetSessionValue("user").fbID;
		$("#shareButton").click(function(){
			var options = {
				method: 'feed',
				link: window.location.href,
				picture: 'http://fbrell.com/f8.jpg',
				name: '@Soul - My profile!',
				caption: '@Soul User Profile & Score',
				description: '@Soul is a revealing new way to explore your personality. In 3 easy steps you\'ll gain a better understanding of yourself and your relationship with others.'
			};

			FB.ui(options, function(response){
			});
		});

		$("#messageButton").click(function(){
			var fbid = param;
			FB.ui({
				method: 'send',
				to: fbid,
				description: '@Soul is a revealing new way to explore your personality. In 3 easy steps you\'ll gain a better understanding of yourself and your relationship with others.',
				name: '@Soul - My Profile!',
				link: 'http://asoul.me'
			});
		});

		getCreditPackages();
	}
	else{
		$(".FriendsLink").attr('href', '#');
		$("#shareButton").hide();
		$("#messageButton").hide();
		$("#commentInput").hide();
		//$("#credit").hide();
		$("#payments").hide();
	}
	$('.comment-container').empty();
	
	getComments(param);

	$("#loadingDialog").dialog({
		modal: true,
		height: 180,
		resizable: false,
		draggable: false
	});

	$("#generalSearch").keyup(function(event) {
		generalSearch(event);
	});

	$("#saveComment").click(function(){
		putComment();
	});

	$(".value-description .text").live('mouseenter', function(){
		$(this).closest('.trait-value').append($("#traitDescription"));
		
		var id = $(this).closest('.trait-info-wrapper').attr('id');
		var text;
		if ($(this).parent().hasClass('low')){
			$("#traitDescription").addClass('low').removeClass('high');
			text = traitDescriptions[id].low;
		}
		else{
			$("#traitDescription").addClass('high').removeClass('low');
			text = traitDescriptions[id].high;
		}
		$("#traitDescription").html(text).show();
	}).live('mouseleave', function(){
		$("#traitDescription").hide();
	});

	$(".likeButton").live("click", 
		function(){ 
			rateComment($(this).parent().attr("id"), 'approve' );
	});

	$(".unlikeButton").live("click", 
		function(){ 
			rateComment($(this).parent().attr("id"), 'disapprove' );
	});

	$(".likeButtonReply").live("click", 
		function(){ 
			rateCommentReply($(this).parent().attr("id"), 'approve' );
	});

	$(".unlikeButtonReply").live("click", 
		function(){ 
			rateCommentReply($(this).parent().attr("id"), 'disapprove' );
	});

	$(".deleteComment").live("click", 
		function(){ 
			deleteComment( $(this).parent().parent().attr("id") );
			CommonOnReady();
	});

	$(".deleteReply").live("click",
		function(){
			removeNotificationAttr();
			deleteComment( $(this).parent().attr("id") );
			CommonOnReady();
	});

	$(".replyComment").live("click", 
		function(){
			openOrCloseCommentToogle($(this).parent().attr("id"));
	});

	$(".putComment").live("click", function(){
		var id = $(this).parent().parent().attr("id");
		var comment = $("#" + id + " .txtReply").val();
		putReplyComment(id, comment, param);
	});

	$( "#paymentDialog" ).dialog({ 
		autoOpen: false,
		modal: true
	});

	$("#payments").live('click', function(){
		openPaymentDialog();
	});

	$("#cardNumber").keydown(function(event) {
		isNumber(event);
	});

	$("#cvc").keydown(function(event) {
		isNumber(event);
	});

	$('.paymentCredit').live('click', function(){
		if( $("#cardNumber").val() == parseInt($("#cardNumber").val()) ){
			if( $('#cardNumber').val().length >15 ){
				$(".errorMessage").text("");
				$(".paymentCredit").hide();
				getCredits();
			}else{
				$(".errorMessage").text("The credit card number length is incorrect");
			}
		}
		else{
			$(".errorMessage").text("The credit card number has letters or special characters");
		}
	});

	$('.ui-widget-overlay').live('click', function(){
		evaluateCloseDialog();
	});

	generateYears('expirationYear',15);

	CommonOnReady();
});

$(window).resize(function(){
	CommonOnReady();
	SetTraitSliderWidth();
});

function redirectToProfile(id){
	window.location = '/profile.html?user=' + id;
};

function showProfile(requestedUserId){
	if (typeof GetSessionValue('user') !== 'undefined'){
		if(GetSessionValue('user').fbID == requestedUserId){
			$('#commentArea').hide();
			$('#saveComment').hide();
		}
	}
	$.ajax({
		url: '/requests/showProfile',
		type: "POST",
		data: {
			requestedUser: requestedUserId,
		},
		processData: true,
		dataType: "json",
		success: function(data){
			var html = '';
			$(".facebook-id").attr("id", data.fbData.id);
			$("#nameOwnwer").html(data.fbData.name);
			if(typeof data.userCredits !== 'undefined' || typeof GetSessionValue('credits') !== 'undefined'){
				$('.credit-number').html(GetSessionValue('credits'));
			}
				//$("#credit").text('Credits: ' + GetSessionValue('credits') );
			//else
				//$("#credit").text('Credits: 0');
			$("#pictureOwner").css('background-image', 'url(https://graph.facebook.com/' + data.fbData.id + '/picture?type=large)');
			if (IsLoggedIn()){
				if(typeof requestedUserId != 'undefined' && requestedUserId != '' && ( requestedUserId != 'me' && requestedUserId != GetSessionValue('user').fbID )){
					html = templates.FriendTrustInfoTemplate(requestedUserId);
					$('#scoreTrustOwner').append(html);
					$("#scoreTrustOwner .trust-bar .trust-slider").slider({
						min: 1,
						max: 100,
						step: 1,
						value: parseInt(data.fbData.trustScore),
						start: function(event, ui) { 
						},
						slide: function(event, ui) { },
						stop: function(event, ui) {
							saveTrustScore( $(this).parent().parent().attr("id"), $(this).slider( "option", "value") ); 
						}
					});	
					friendsLoaded = true;		
				}else{
				}
			}
			else{
				friendsLoaded = true;
			}
			getTraits(requestedUserId, data.fbData.traitValues);
			$container = $("#container").notify();
			CommonOnReady();
		}
	});
}

function getRandomFriends(amountOfUsers){
	$.ajax({
		url: '/actions/getRandomFriends',
		type: "POST",
		data: {
			amountRequested : amountOfUsers,
		},
		processData: true,
		dataType: "json",
		success: function(data){
			var html = '';

			var numFriends = data.length;
			$('.friend').remove();
			for(var i=0; i<numFriends; i++){
				if(typeof data[i].picture === 'object'){
					html = templates.FriendInfoTemplate(data[i].id, data[i].picture.data.url, data[i].name);
				}else{
					html = templates.FriendInfoTemplate(data[i].id, data[i].picture, data[i].name);
				}
				
				$('#friendsInfoArea').append(html);
				$("#friendsInfoArea .trust-bar .trust-slider").last().slider({
					min: 1,
					max: 100,
					step: 1,
					value: parseInt(data[i].trustValue),
					stop: function(event, ui) {  
						saveTrustScore( $(this).parent().parent().attr("id"), $(this).slider( "option", "value") ); 
					}
				});	
							
			}
			friendsLoaded = true;
			CloseLoadingDialog();
			CommonOnReady();
		}
	});
}

function getTraits(requestedUserId, scores){
	$.ajax({
		url: '/requests/getTraitList',
		type: "POST",
		data: {
			requestedUser: requestedUserId
		},
		dataType: "json",
		processData: true,
		success: function(data){
			if (typeof data.traits[0].evaluations !== "undefined"){
				if (data.traits[0].evaluations >= 10){
					$("#overallTrust").html('Trust Score: ' + (data.traits[0].overallValue * 8));
				}
				else{
					$("#overallTrust").html('Trust Score: Not enough data');
				}
			}
			else{
				$("#overallTrust").html('Trust Score: Not enough data');

			}
			var traitValues = data.values;
			var data = data.traits;
			var traitNum = data.length;
			var yourProfile;
			if (IsLoggedIn()){
				yourProfile = (GetQueryValue('user') == GetSessionValue('user').fbID);
			}
			else{
				yourProfile = true;
			}
			
			for(var i=0; i<traitNum; i++){
				var idTrait = data[i].traitName.replace(/ /g, '_');
				idTrait = idTrait.toLowerCase();
				traitDescriptions[idTrait] = {low: data[i].lowdesc, high: data[i].highdesc};
				var html = templates.TraitInfoTemplate(idTrait, data[i].traitName, data[i].low, data[i].high);
				if (i < 11){
					$('#personalityInfoArea #coreTraits').append(html);
				}
				else{
					$('#personalityInfoArea #subTraits').append(html);
				}
			}
			var minValue = 1;
			var maxValue = 100;

			$(".trait-slider").slider({
				min: minValue,
				max: maxValue,
				step: 1,
				value: 50,
				disabled: yourProfile,
				start: function(event, ui){
					traitValueBefore = $(this).slider('option', 'value');
				},
				stop: function(event, ui) {
					var traitValueAfter = $(this).slider('option', 'value');
					if (traitValueBefore != traitValueAfter){
						saveTraitScore( $(this).slider( "option", "value"),  $(this).closest('.trait-info-wrapper').attr("id"), $(".facebook-id").attr("id") ); 
					}
				}
			});
			SetTraitSliderWidth();
			$(".trait-slider").each(function(index, element){
				var percent = (data[index].overallValue / maxValue) * 100;
				$(element).parent().prepend(templates.OverallValueMeterTemplate(percent));
				//$( element ).slider( "option", "value", data[index].overallValue );
			});
			if (yourProfile){
				$('.trait-slider .ui-slider-handle').hide();
			}
			if( !yourProfile && IsLoggedIn() ){
				getMyEvaluations(requestedUserId);
			}
			else{
				traitsLoaded = true;
				CloseLoadingDialog();
			}
			validateTraits();
			CommonOnReady();
		}
	});
}

function getComments(requestedUserId){
	$.ajax({
		url: '/requests/getComments',
		type: "POST",
		data: {
			requestedUser: requestedUserId
		},
		dataType: "json",
		processData: true,
		success: function(data){
			formatComments(data, requestedUserId);
		}
	});
}

function getMyEvaluations(requestedUserId){
	$.ajax({
		url: '/actions/getMyEvaluations',
		type: "POST",
		data: {
			requestedUser: requestedUserId
		},
		dataType: "json",
		processData: true,
		success: function(data){
			$.each(data, function(index, element){
				$('#'+element.traitName +' .trait-slider').slider("option", "value", element.traitScore);
			});
			traitsLoaded = true;
			CloseLoadingDialog();
		}
	});
}

function validateTraits(){
	var url = window.location.href;
	if( url.search('/visitor.html') > -1)
		$(".trait-slider").slider( "option", "disabled", true );
}


function formatComments(data, requestedUserId){
	var html = ''; var photo = ''; var name = ''; var comment = '';
	var itemName = ''; var currentFbID = '';
	var approvals = [];	var disapprove = [];
	var positionAppr; var positionDisappr;
	var countApprove; var countDisappr;
	var commentingUserId; var isMyProfile = false;
	var replyComments = []; var isReplay;

	if(requestedUserId == GetSessionValue('user').fbID){
		isMyProfile = true;
	}
	
	for(var i = 0; i< data.comments.length; i++){
		currentFbID = data.comments[i].commentingUser;
		if(typeof data.comments[i].inResponseTo == 'undefined' ){
			isReplay = false;
		} else{
			isReplay = true;
		}

		id = data.comments[i].commentingUser;
		photo = data.pictures[data.comments[i].commentingUser].picture;
		name = data.pictures[data.comments[i].commentingUser].name;
		comment = data.comments[i].comment;
		itemName = data.comments[i].$ItemName;
		countApprove = 0; countDisappr = 0;
		commentingUserId = data.comments[i].commentingUser;

		if(typeof data.comments[i].approvals !== 'undefined'){
			if(typeof data.comments[i].approvals === 'string'){
				if(data.comments[i].approvals == currentFbID){
					positionAppr = 1;
					countApprove = 1;
				} else {
					positionAppr = -1;
					countApprove = 1;
				}
			} else {
				positionAppr = $.inArray(currentFbID, data.comments[i].approvals);
				countApprove = data.comments[i].approvals.length;
			}
		} else {
			positionAppr = -1;
			countApprove = 0;
		}

		if(typeof data.comments[i].disapprovals !== 'undefined'){
			if(typeof data.comments[i].disapprovals === 'string'){
				if(data.comments[i].disapprovals.indexOf(currentFbID) == 0 ){
					countDisappr = 1;
					positionDisappr = 1;
				} else {
					positionDisappr = -1;
					countDisappr = 1;
				}
			} else {
				positionDisappr = $.inArray(currentFbID, data.comments[i].disapprovals);
				countDisappr = data.comments[i].disapprovals.length;
			}
		} else {
			positionDisappr = -1;
			countDisappr = 0;
		}

		if(isReplay == false){
			html = templates.ShowComments		(data.comments[i].$itemName, currentFbID, isMyProfile, comment, itemName, positionAppr, positionDisappr, countApprove, countDisappr);
			approvals = []; disapprove = [];
			$('.commentsArea').append(html);
		} else {
			approvals = []; disapprove = [];
			html = templates.showCommentReply	(data.comments[i].$itemName, currentFbID, isMyProfile, comment, itemName, positionAppr, positionDisappr, countApprove, countDisappr);
			$('#' + data.comments[i].inResponseTo + ' .reply' ).append(html);
		}

	}
}


function redirectToProfile(id){
	window.location = '/profile.html?user=' + id;
};

function saveTraitScore(score, traitName, evaluatedUser){
	$.ajax({
		url: '/actions/scoreTrait',
		type: "POST",
		data: {
			evaluatedUser: evaluatedUser,
			traitName: traitName,
			score: score
		},
		processData: true,
		dataType: "json",
		success: function(data) {
			removeNotificationAttr();
			showNotification('Trait Updated', $("#" +traitName + " .trait-name").text() + ' succesfully rated');
		}
	});
}

function rateComment(commentId, rateType){
	var rateUrl = '';
	var validateUrl = '';
	var stateButton = '';
	var stateButtonD = '';
	var countLikes = 0;
	var stateAppr;
	var stateDisappr;
	var caseType;

	stateButton = $("#" + commentId + " .likeButton").attr('src');
	stateButtonD = $("#" + commentId + " .unlikeButton").attr('src');
	caseType = verifyAprobalState(commentId);
	
	if(rateType == 'approve'){
		if(stateButton == "/css/images/like.png"){
			addAprobal(commentId);
			callAjax(commentId, 'approveComment');
			caseType = verifyAprobalState(commentId);
			if(caseType == -1){
				minusDisapprove(commentId);
				callAjax(commentId, 'removeDisapproveComment');
			}

		} else if(stateButton == "/css/images/like2.png"){
			minusAprobal(commentId);
			callAjax(commentId, 'removeApproval');
			if(caseType == 1){
				minusDisapprove(commentId);
				callAjax(commentId, 'removeDisapproveComment');
			}
		}
	} else {
		if(stateButtonD == "/css/images/unlike.png"){
			addDisapprove(commentId);
			callAjax(commentId, 'disapproveComment');
			caseType = verifyAprobalState(commentId);
			if(caseType == -1){
				minusAprobal(commentId);
				callAjax(commentId, 'removeApproval');
			}
		} else if(stateButtonD == "/css/images/unlike2.png"){
			minusDisapprove(commentId);
			callAjax(commentId, 'removeDisapproveComment');
			if(caseType == 2){
				minusAprobal(commentId);
				callAjax(commentId, 'removeApproval');
			}
		}
	}	
}

function verifyAprobalState(commentId){
	var stateButton = $("#" + commentId + " .likeButton").attr('src');
	if(stateButton == "/css/images/like.png")
		stateAppr = 0;
	else 
		stateAppr = 1;

	var stateButtonD = $("#" + commentId + " .unlikeButton").attr('src');
	if(stateButtonD == "/css/images/unlike.png")
		stateDisappr = 0;
	else 
		stateDisappr = 1;

	if(stateAppr == 0 && stateDisappr == 0)
		return 0;
	else if(stateAppr == 0 && stateDisappr == 1)
		return 1;
	else if(stateAppr == 1 && stateDisappr == 0)
		return 2;
	else
		return -1;
	
}

function addAprobal(commentId){
	var result = $("#" + commentId);
	var result2 = $(result[0]).find('.likeButton');
	$(result2[0]).attr('src',"/css/images/like2.png");
	var result3 = $(result[0]).find('.countApprove');
	var countLikes = parseInt($(result3[0]).text()) + 1;
	$(result3[0]).text(countLikes);
}

function minusAprobal(commentId){
	var result = $("#" + commentId);
	var result2 = $(result[0]).find('.likeButton');
	$(result2[0]).attr('src',"/css/images/like.png");
	var result3 = $(result[0]).find('.countApprove');
	var countLikes = parseInt($(result3[0]).text()) - 1;
	if(countLikes >= 0)
		$(result3[0]).text(countLikes);
}

function addDisapprove(commentId){
	var result = $("#" + commentId);
	var result2 = $(result[0]).find('.unlikeButton');
	$(result2[0]).attr('src',"/css/images/unlike2.png");
	var result3 = $(result[0]).find('.countDisappr');
	var countLikes = parseInt($(result3[0]).text()) + 1;
	$(result3[0]).text(countLikes);
}

function minusDisapprove(commentId){
	var result = $("#" + commentId);
	var result2 = $(result[0]).find('.unlikeButton');
	$(result2[0]).attr('src',"/css/images/unlike.png");
	var result3 = $(result[0]).find('.countDisappr');
	var countLikes = parseInt($(result3[0]).text()) - 1;
	if(countLikes >= 0)
		$(result3[0]).text(countLikes);
}

function callAjax(commentId, validateUrl){
	$.ajax({
		url: '/actions/' + validateUrl, type: "POST", data: {
			commentId: commentId,
		},
		processData: true,
		dataType: "json",
		success: function(data) {
		}
	});
}

function deleteComment(commentId){
	$.ajax({
		url: 'actions/deleteComment',
		type: "POST",
		data: {
			commentId: commentId
		},
		processData: true,
		dataType: "json",
		success: function(data) {
			if(data.message != false){
				removeNotificationAttr();
				showNotification('Comment delete', 'Your comment was deleted');
				$("#" + commentId).empty();
				CommonOnReady();
			} else {
				removeNotificationAttr();
				showNotification('Wrong session', 'Your comment was not deleted');
			}
		}
	});
}

function putComment(){
	if( $("#commentArea").val() != ''){
		$.ajax({
			url: '/actions/saveComment',
			type: 'POST',
			data: {
				commentedUser: GetQueryValue("user"),
				comment: $("#commentArea").val()
			},
			processData: true,
			dataType: 'json',
			success: function(data){
				if(data){
					removeNotificationAttr();
					showNotification('Save successful', 'Your comment was successfully posted');
					var html = templates.ShowComments(data.message, GetSessionValue('user').fbID , false, $("#commentArea").val(), data.message, -1,-1,0,0);
					$(".commentsArea").append(html);
					$("#commentArea").val("");
					$('.credit-number').html(data.newAmmount);
					SetSessionValue('credits', data.newAmmount);
					$("#saveComment").show();
					CommonOnReady();
				} else{
					$("#saveComment").show();
					$("#container").attr('onclick', 'openPaymentDialog()');
					showNotification('You dont have credits', 'if you need to buy credits, you can do by clicking here');
				}
			}
		});
	}
}

function putReplyComment(id, comment, requestedUserId){
	if(comment != ''){
		$.ajax({
			url: '/actions/saveReplyComment',
			type: 'POST',
			data: {
				commentedUser: requestedUserId,
				comment: comment,
				inResponseTo: id
			},
			processData: true,
			dataType: 'json',
			success: function(data){
				if(data){
					removeNotificationAttr();
					showNotification('Save successfully', 'Your comment was successfully posted');
					var html = templates.showCommentReply(data.message, GetSessionValue('user').fbID, false, comment, data.message, 0,0,0,0 );
					$("#"+ id + " .reply").append(html);	
					$(".txtReply").val("");
					openOrCloseCommentToogle(id);
					$('.credit-number').html(data.newAmmount);
					//$("#credit").text("Credits: " + data.newAmmount);
					SetSessionValue('credits', data.newAmmount);
					$(".putComment").show();
					CommonOnReady();
				} else{
					$("#saveComment").show();
					$("#container").attr('onclick', 'openPaymentDialog()');
					showNotification('You dont have credits', 'if you need to buy credits, you can do by clicking here');
				}
			}
		});
	}		
	$(".putComment").show();
}

function showNotification(header, message){
	create("default", { title: header, text: message}, {
			click: function(e,instance){
		}
	});
}

function create( template, vars, opts ){
	$container.notify("create", template, vars, opts);
}

function CloseLoadingDialog(){
	if (traitsLoaded && friendsLoaded){
		$("#loadingDialog").dialog("close");
		if (!IsLoggedIn()){
			removeNotificationAttr();
			showNotification('Warning', 'Some features are disabled for non logged users, please login on the index page');
		}
	}
}

function IsLoggedIn(){
	return (typeof GetSessionValue('user') !== 'undefined');
}

function openOrCloseCommentToogle(commentId){
	var options = { to: { width: 200, height: 60 } };
	$("#" + commentId + " #effect").toggle( "blind", options, 500 );
}

function getCreditPackages(){
	$.ajax({
			url: '/requests/getCreditPackages',
			type: 'POST',
			data: {
			},
			processData: true,
			dataType: 'json',
			success: function(data){
				$('.rigthpayment').empty();
				var html = '';
				html = '<h3>Get credits</h3>';
				for(var i=0; i<data.length; i++){
					html += '<input type="radio" class="radio" name="credits" value="' + data[i].$ItemName + '" /> Buy ' + data[i].credits + ' for ' + data[i].usd + ' <br />' + 
							'<div class="clear"></div> ';
					$('.rigthpayment').append(html);
					html = '';
				}
				$('input[name="credits"]:eq(1)').attr('checked', 'checked');
			}
	});
}

function generateYears(idControl, addYears){
	var initValue = 2012;
	var value = '';
	$("#" + idControl).empty();
	for(var i = 0; i<addYears; i++){
		value = (initValue + i).toString();
		$("#" + idControl).append('<option value="' + value + '">' + value + '</option>');
	}
}

function getCredits(){
	$("#loadingDialog").dialog("open");
	Stripe.setPublishableKey('pk_0B9uB5JXHpNvobAhEswf6zxzn4DOp');
	Stripe.createToken({
	   	number: $('#cardNumber').val(),
		cvc: $('#cvc').val(),
		exp_month: $('#card-expiry-month').val(),
		exp_year: $('#expirationYear').val()
		}, function(status, response){
			var myRadio = $('input[name]');
			var radioSelected = myRadio.filter(':checked').val();
		  	if(status == 200){
		  		$.ajax({
					url: '/actions/purchaseCreditPackage',
					type: "POST",
					data: {
						packageName: radioSelected,
						stripeToken : response.id,
						},
					processData: true,
					dataType: "json",
					success: function(data) {
						//try parsing here, is you cant then i sent you an error message that you should print somewhere
						//$("#credit").empty();
						//$("#credit").text('Credits: ' + data);
						$('.credit-number').html(data);
						SetSessionValue('credits', data);
						$("#paymentDialog" ).dialog('close');
						$(".paymentCredit").show();
						$("#loadingDialog").dialog("close");
						removeNotificationAttr();
						showNotification('Success', 'Transaction successful');
					}
				});
	    	}else{
	    		$("#loadingDialog").dialog("close");
	    		removeNotificationAttr();
	    		showNotification('Error', 'Error: ' + response.error.message);
	    		$(".paymentCredit").show();
    		//handle invalid card error here
    	}
    });
}

function openPaymentDialog(){
	$("#cardNumber").val("");
	$("#cvc").val("");
	$("#card-expiry-month").val(0);
	$("#paymentDialog" ).dialog('open');
	$(".ui-dialog").width("620px");
	$('.ui-dialog').css({
		position:'absolute',
	    left: ($(window).width() - $('.ui-dialog').outerWidth())/2,
	    //top: ($(window).height() - $('.ui-dialog').outerHeight())/2.3
	});
}

function evaluateCloseDialog(){
	if( $('#paymentDialog').dialog( 'isOpen' ) == true){
		$('#paymentDialog').dialog( 'close' );
	}
}

function removeNotificationAttr(){
	$("#container").removeAttr( 'onclick' );
}

function SetTraitSliderWidth(){
	var traitSliders = $(".trait-slider");
	if (traitSliders.length > 0){
		var wrapperExample = $('.trait-slider-wrapper')[0];
		var wrapperWidth = $(wrapperExample).width();
		$(traitSliders).width(wrapperWidth - 28);
	}
}

function verifyData(){
	if( typeof GetSessionValue('user') == 'undefined' ){
		SetSessionValue('user', {token: localStorage.getItem("token") } ) ;
		var user = GetSessionValue('user');
		user.fbID = localStorage.getItem("id");
		user.name = localStorage.getItem("name");
		user.picture = localStorage.getItem("picture");
		SetSessionValue('user', user);
		GetSessionValue('user');
	} else {
		localStorage.setItem("id", GetSessionValue('user').fbID );
		localStorage.setItem("name", GetSessionValue('user').name );
		localStorage.setItem("picture", GetSessionValue('user').picture );
		localStorage.setItem("token", GetSessionValue('user').token );
	}

}