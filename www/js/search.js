$(document).ready(function(){
	CommonOnReady();
	var searchType = GetQueryValue('type');
	$("#loggedUser").html(GetSessionValue("user").name);
	$("#loggedUser").attr('href', '/profile.html?user=' + GetSessionValue("user").fbID);

	$(".trust-bar .slider").slider({
		min: 0.1,
		max: 1,
		step: 0.01,
		value: 0.1,
		start: function(event, ui) { console.log('on slidestart'); console.log(this); },
		slide: function(event, ui) { console.log('on slide'); console.log(this); },
		stop: function(event, ui) { console.log('on slidestop'); console.log(this); }
	});
	$(".trust-bar .slider").find(".ui-slider-handle").addClass("icon selector");

	if (searchType != 'friends'){
		$('#searchUser').keyup(function() {
	  		$.ajax({
				url: '/Search',
				type: "GET",
				data: {
					name: $('#searchUser').val().toLowerCase()
				},
				processData: true,
				dataType: "json",
				success: function(data) {
					console.log(window.location.href);
					$(".result-container").empty();
					var MaxSuggest = 10;
					console.log(data.foundUsers.length);
					if($('#searchUser').val() != ""){
						for(var i=0; i<data.foundUsers.length; i++){
							if(i < MaxSuggest){
								var html = templates.AutocompleteResultTemplate(data.foundUsers[i].id, data.foundUsers[i].picture, data.foundUsers[i].name);
								$('.result-container').append(html);
							}
							else break;
						}
					}
				}
			});
		});
	}

});

$(window).resize(function(){
	CommonOnReady();
});