function GetQueryValue(name)
{
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regexS = "[\\?&]" + name + "=([^&#]*)";
	var regex = new RegExp(regexS);
	var results = regex.exec(window.location.search);
	if(results == null)
		return "";
	else
		return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function CalculateSearchBarWidth(containerSelector){
	var inputElement = $(containerSelector).find("input");
	var containerWidth = $(containerSelector).width();
	var paddingLeft = parseInt(inputElement.css('padding-left'));
	var paddingRight = parseInt(inputElement.css('padding-right'));
	var searchWidth = containerWidth - (paddingLeft + paddingRight);
	inputElement.css('width', searchWidth + 'px');
}

function SetOpaqueBackgroundDimensions(){
	var documentWidth = $(document).width();
	var documentHeight = $(document).height();
	var background = $("body .opaque-background")[0];
	$(background).width(documentWidth);
	$(background).height(documentHeight);
}

function SetMainBackgroundPosition(){
	if (window.pathname != "/index.html"){
		var topBarHeight = $('.top-bar').outerHeight();
		$('body').css('background-position', '0 ' + topBarHeight + 'px');
	}
}

function SetOverlayDimensions(){
	var overlay = $('.ui-widget-overlay');
	if (overlay.length > 0){
		$(overlay).width($(document).width()).height($(document).height());
	}
}

function GetSessionValue(name){
	var sValue = sessionStorage.getItem('asoul_' + name);
	if (sValue != "undefined" && sValue){
		return JSON.parse(sValue);
	}
	else{
		return undefined;
	}
}

function SetSessionValue(name, value){
	sessionStorage.setItem('asoul_' + name, JSON.stringify(value));
}

function CommonOnReady(){
	CalculateSearchBarWidth(".search-bar.type-1");
	SetOpaqueBackgroundDimensions();
	SetMainBackgroundPosition();
	SetOverlayDimensions();
}

function saveTrustScore(evaluatedUser, value){
	$.ajax({
		url: '/actions/setTrust',
		type: "POST",
		data: {
			evaluatedUser: evaluatedUser,
			value: value,
		},
		processData: true,
		dataType: "json",
		success: function(data) {

		}
	});
}

window.fbAsyncInit = function() {
	FB.init({
		//appId: '342673305815897',
		appId : '215408475283068',
		status: true,
		cookie: true,
		xfbml: true
	});
};

String.prototype.capitalize = function(){
 	return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
 };

function wordToUpper(strSentence) {
    return strSentence.toLowerCase().replace(/\b[a-z]/g, convertToUpper);
}

function convertToUpper() {
	return arguments[0].toUpperCase();
}

function generalSearch(event){
	var fullname = wordToUpper( $("#generalSearch").val() );

	lastTimeStamp = event.timeStamp + '';
	$.ajax({
		url: '/requests/searchAsoul',
		type: "POST",
		data: {
			tstamp: event.timeStamp + '',
			searchStr: fullname
		},
		processData: true,
		dataType: "json",
		success: function(data) {
			if (  (lastTimeStamp.indexOf(data.timestamp)) == 0  ){
				$(".result-container").empty();
				var MaxSuggest = 10;
				if($('#generalSearch').val() != ""){
					for(var i=0; i<data.users.length; i++){
						if(i < MaxSuggest){
							var html = templates.AutocompleteResultTemplate(data.users[i].fb_id, data.users[i].picture, data.users[i].name);
							$('.result-container').append(html);
						}
					}
				}
			}
		}
	});
}

function isNumber(event){
	if ( event.keyCode == 86 || event.keyCode == 67 || event.keyCode == 17 || event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 || (event.keyCode == 65 && event.ctrlKey === true) ||  (event.keyCode >= 35 && event.keyCode <= 39)) {
			return;
	} else {
		if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
			event.preventDefault(); 
		} 
	}
}

// Load the SDK Asynchronously
(function(d){
var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
if (d.getElementById(id)) {return;}
js = d.createElement('script'); js.id = id; js.async = true;
js.src = "//connect.facebook.net/en_US/all.js";
ref.parentNode.insertBefore(js, ref);
}(document));
