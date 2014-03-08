var wholeData;

$(document).ready(function(){
	CommonOnReady();
	verifyData();
	var wholeData;
	var currentName = '';
	var usernameSearch = '';
	$("#loggedUser").html(GetSessionValue("user").name);
	$("#loggedUser").attr('href', '/profile.html?user=' + GetSessionValue("user").fbID);
	
	loadData();
	$("#generalSearch").keyup(function(event) {
		generalSearch(event);
	});
});

function loadData(){
	$.ajax({
		url: '/actions/searchFriends',
		type: "POST",
		data: {
			requestedUser: 'me'
		},
		processData: true,
		dataType: "json",
		success: function(data) {	
			var filterData = [];
			$('.left-column').empty();
			wholeData = data;
			createItems(wholeData);
			
			$('#searchUser').keyup(function() {
				filterData = [];
				usernameSearch = $('#searchUser').val();
				for (var i=0; i< data.length; i++ ){
					currentName = wholeData[i].name;
					if( currentName.toLowerCase().search( usernameSearch.toLowerCase() ) > -1 ) {
						$('#' + data[i].id).show();
					} else {
						$('#' + data[i].id).hide();
					}
				}
			});	
		}
	});
}

function createItems(data){
	var html = '';
	var numFriends = data.length;
	for(var i=0; i<numFriends; i++){
		if(typeof data[i].picture === 'object'){
			html = templates.FriendSearchInfoTemplate(data[i].id, data[i].picture.data.url, data[i].name);
		} else {
			html = templates.FriendSearchInfoTemplate(data[i].id, data[i].picture, data[i].name);
		}

		$('.left-column').append(html);
		$(".trust-bar .trust-slider").last().slider({
			min: 1,
			max: 100,
			step: 1,
			value: data[i].trustScore,
			start: function(event, ui) { },
			slide: function(event, ui) { },
			stop: function(event, ui) { saveTrustScore( $(this).parent().parent().attr("id"), $(this).slider( "option", "value") ); }
		});
	}
}

function redirectToProfile(id){
	window.location = '/profile.html?user=' + id ;
};

$(window).resize(function(){
	CommonOnReady();
});