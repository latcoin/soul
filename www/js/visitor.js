function showProfile(requestedUserId){
	$("#nameOwnwer").html("Guest");
	getTraits(requestedUserId, 5);
	CommonOnReady();

}

function getTraits(requestedUserId, scores){
	$.ajax({
		url: '/getTraitList',
		type: "POST",
		data: {
			requestedUser: requestedUserId
		},
		dataType: "json",
		processData: true,
		success: function(data){
			console.log('->');
			console.log(data);
			var traitValues = data.values;
			var data = data.traits;
			console.log(data);
			console.log(traitValues);
			var traitNum = data.length;
			$('#personalityInfoArea .black-container').empty();
			//var yourProfile = (GetQueryValue('user') == GetSessionValue('user').fbID);
			for(var i=0; i<traitNum; i++){
				var idTrait = data[i].traitName.replace(/ /g, '_');
				idTrait = idTrait.toLowerCase();
				var html = templates.TraitInfoTemplate(idTrait, data[i].traitName, data[i].low, data[i].high);
				$('#personalityInfoArea .black-container').append(html);
				$(".trait-slider").slider({
					min: 1,
					max: 100,
					step: 1,
					value: 1,
					//disabled: yourProfile,
					stop: function(event, ui) { 
						saveTraitScore( $(this).slider( "option", "value"),  $(this).closest('.trait-info-wrapper').attr("id"), $(".facebook-id").attr("id") ); 
					}
				});

			}
			var traitConteiner = $('#personalityInfoArea').find('.trait-slider');
			for (var i=0; i< traitConteiner.length; i++){
				$( traitConteiner[i] ).slider( "option", "value", data[i].overallValue );
			}
			validateTraits();
			closeLoader();
			CommonOnReady();
		}
	});
}

function validateTraits(){
	console.log('->');
	console.log(window.location.href);
	var url = window.location.href;
	if( url.search('/visitor.html') > -1)
		$(".trait-slider").slider( "option", "disabled", true );
}

$(document).ready(function(){
	$('.black-container.friend .profile-pic').live('click', function(){
		var id = $(this).closest('.black-container.friend').attr('id');
		redirectToProfile(id);
	});

	var param = GetQueryValue('user');
	if (typeof param == 'undefined' || param == ''){
		showProfile('me');
	}
	else{
		showProfile(param);
	}

	//$("#loggedUser").html(GetSessionValue("user").name);
	//$("#loggedUser").attr('href', '/profile.html?user=' + GetSessionValue("user").fbID);
	//var fbID = GetSessionValue("user").fbID;
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
		var fbid = getId(window.location.href);
		FB.ui({
			method: 'send',
			to: fbid,
			description: '@Soul is a revealing new way to explore your personality. In 3 easy steps you\'ll gain a better understanding of yourself and your relationship with others.',
			name: '@Soul - My Profile!',
			link: window.location.href
		});
	});

	$("#generalSearch").keyup(function(event) {
		$.ajax({
				url: '/searchAsoul',
				type: "GET",
				data: {
					searchStr: $('#generalSearch').val()
				},
				processData: true,
				dataType: "json",
				success: function(data) {
					console.log(window.location.href);
					$(".result-container").empty();
					var MaxSuggest = 10;
					console.log(data);
					if($('#generalSearch').val() != ""){
						for(var i=0; i<data.length; i++){
							if(i < MaxSuggest){
								var html = templates.AutocompleteResultTemplate(data[i].fb_id, data[i].picture, data[i].name);
								$('.result-container').append(html);
							}
							else break;
						}
					}
				}
			}
		);
	});

	CommonOnReady();
});

$(window).resize(function(){
	CommonOnReady();
});

function redirectToProfile(id){
	console.log(id);
	window.location = '/profile.html?user=' + id;
};

function closeLoader(){
	//"#loader").dialog('close');
}
