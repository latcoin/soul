function SetContentHeight(){
	var documentHeight = $(window).height();
	var content = $("body .content")[0];
	$(content).height(documentHeight);
}

$(document).ready(function(){
	CommonOnReady();
	SetContentHeight();
	$('#loginButton').click(function(){
		if (typeof FB !== "undefined"){
			FB.login(function(response){
				if (response.authResponse){
					SetSessionValue('user', {token: response.authResponse.accessToken});
					FB.api('/me', function(response){
				    	var user = GetSessionValue('user');
				    	user.fbID = response.id;
				    	user.name = response.name;
				    	user.picture = 'https://graph.facebook.com/' + response.id + '/picture?type=large';
				    	SetSessionValue('user', user);
				    	$.post('/requests/login', {token: user.token}, function(data){
				    		$.post('/actions/getMyCredits', {}, function(creditData){
				    			if(!creditData){
				    				creditData = 0;
				    			}
				    			SetSessionValue('credits', creditData);
					    		if (data.success){
					    			$('#loginButton').fadeOut('slow');
					    			window.location = data.redirect_url;
					    		}
				    		});
				    	}, 'json');
				    });
				}
				else {
				}
			}, {scope: 'user_about_me,user_birthday,user_location,user_photos,friends_about_me,friends_birthday,friends_location,friends_photos,publish_stream'});
		}
		else{
		}
	});
	
	$('#userSearchFb').keydown(function(event){
		if (event.which == 13){
			event.preventDefault();
			validateURL();
		}
	});

	$("#btn_search").click(function(){
		validateURL();
	});

});

function validateURL(){
	var url = $("#userSearchFb").val().toLowerCase();
	if(url != ''){
		var correctDomain= url.search("facebook.com/");
		var id ='';
		//var path = '/profile.html?user=';
		if(correctDomain >-1 ){
			var parameters = url.split('/');
			if( parameters[parameters.length - 1].length > 0 && parameters[parameters.length - 2].indexOf('facebook.com') > -1 ){
				id = parameters[parameters.length - 1];
				redirectToProfile(id);
			}
			else{
			}
		}
		else {
			id = $("#userSearchFb").val().toLowerCase();
			redirectToProfile(id);
		}
	}
}

function redirectToProfile(id){
	var path = '/profile.html?user=';
	if (!isNaN(id)){
		window.location = path + id;
	}
	else if (id.indexOf('profile.php') > -1){
		var fb = id.split("profile.php?id=")[1];
		window.location = path + fb;
	}
	else{
		getFbId(id, function(fbID){
			window.location = path + fbID;
		});
	}
	//window.location = '/visitor.html?user=' + id;
};

function getFbId(fbUserName, callback){
	FB.api('/' + fbUserName, function(response){
		callback(response.id);
	});
}

$(window).resize(function(){
	CommonOnReady();
	SetContentHeight();
});
