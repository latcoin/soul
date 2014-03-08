function Template(){
	this.TraitInfoTemplate = function(id, name, lowText, highText){
		var html = '<div id="' + id + '" class="trait-info-wrapper">' +
						'<div class="trait-name">' + name + '</div>' +
						'<div class="trait-value">' +
							'<div class="trait-slider-wrapper">' +
								'<div class="trait-slider"></div>' +
							'</div>' +
							'<div class="value-description-wrapper">' +
								'<div class="value-description low"><div class="text">' + lowText + '</div></div>' +
								'<div class="value-description high"><div class="text">' + highText +'</div></div>' +
								'<div class="clear"></div>' +
							'</div>' +
						'</div>' +
					'</div>';
		return html;
	}

	this.FriendInfoTemplate = function(id, pic, name){
		var html = '<div id="' + id + '" class="black-container friend">' +
						'<div class="friendsearch-info-wrapper">' +
							'<div class="profile-pic" style="background-image: url(' + pic + ');" onclick="showProfile(' + id + ')"></div>' +
							'<a class="name" href="/profile.html?user=' + id + '">' + name + '</a>' +
							'<div class="clear"></div>' +
						'</div>' + 
						'<div class="trust-bar">' +
							'<div class="trust-slider"></div>' +
							'<div class="icon bar-end"></div>' +
							'<div class="clear"></div>' +
						'</div>' +
					'</div>';
		return html;
	}

	this.FriendSearchInfoTemplate = function(id, pic, name){
		var html = '<div id="' + id + '" class="blackSearch-container search">' +
						'<div class="friend-info-wrapper">' +
							'<div class="profile-pic" style="background-image: url(' + pic + ');" onclick="redirectToProfile(' + id + ')"></div>' +
							'<div class="name" onclick="redirectToProfile(' + id + ')">' + name + '</div>' +
							'<div class="clear"></div>' +
						'</div>' + 
						'<div class="trust-bar">' +
							'<div class="trust-slider"></div>' +
							'<div class="icon bar-end"></div>' +
							'<div class="clear"></div>' +
						'</div>' +
					'</div>';
		return html;
	}

	this.FriendTrustInfoTemplate = function(id){
		var html = '<div id="' + id + '" class="blackSearch-container search" style="margin-left:25px; height:75px; border-radius:2px;">' +
						'<div class="friend-info-wrapper">' +
							'<div class="text" >How well do they know you?</div>' +
							'<div class="clear"></div>' +
						'</div><br />' + 
						'<div class="trust-bar">' +
							'<div class="trust-slider"></div>' +
							'<div class="icon bar-end"></div>' +
							'<div class="clear"></div>' +
						'</div>' +
					'</div>';
		return html;
	}

	this.AutocompleteResultTemplate = function(id, pic, name){
		var html = '<div class="item">' +
						'<a href="/profile.html?user=' + id + '">' +
							'<img src="' + pic + '">' +
							'<span class="text">' + name + '</span>' +
						'</a>' +
					'</div>';
		return html;
	}

	this.OverallValueMeterTemplate = function(percentValue){
		var extraCSS = '';
		if (navigator.appName.indexOf("Opera") > -1 || navigator.userAgent.search("Opera") > -1){
			extraCSS = ' opera-hack';
			if (percentValue >= 97){
				extraCSS += ' full';
			}
		}
		var html = '<div class="overall-meter-wrapper">' +
						'<div class="overall-meter' + extraCSS + '" style="width: ' + percentValue + '%"></div>' +
					'</div>';
		return html;
	}

	this.SelectTagOptionTemplate = function(value, text){
		var html = '<option value="' + value + '">' + text + '</option>';
		return html;
	}

	this.ShowComments = function(id, commentingUserId, isMyProfile, comment, commentId, approvals, disapprove, countApprove, countDisappr){
		var deleteComment = '';
		var approvalsValue = '';
		var disapproveValue = '';
		if(commentingUserId == GetSessionValue("user").fbID ){
			deleteComment = '<div class="float: right"> <input type="button" value="Delete" class="deleteComment"></button></div>';
		}

		if(approvals == -1 && disapprove == -1){
		} else {
			if(approvals >= 0){ approvalsValue = '2'; } else { disapproveValue = '2'; }
		}
		var html = '<div class="comment-container" id="' + commentId + '"">' +
						'<p>' + comment + '</p>' +
							'<img class="likeButton" src="/css/images/like'+approvalsValue+'.png" style="width:20px; height:20px; float: left"/>' + 
							'<div class="countApprove" style="float: left">' + countApprove + '</div>'  +
							'<img class="unlikeButton" src="/css/images/unlike'+disapproveValue+'.png" style="width:20px; height:20px; float: left"/>' + 
							'<div class="countDisappr" style="float: left">' + countDisappr + '</div>'  +
							deleteComment +
						'<div class="clear"></div>' +
						'<div class="reply"></div>'+
						'<div class="clear"></div>';
						if(isMyProfile == true){
							html +='<input type="button" value="Reply" class="replyComment"></button>' + 
							'<div id="effect" style="display:none" class="ui-widget-content ui-corner-all">' + 
								'<textarea class="txtReply" rows="3" cols="15" maxlength="200"></textarea>' + 
								'<input type="button" value="Send" class="putComment" />' + 
							'</div>';
						}
						html += '<hr class="gradient" />' + 
					'</div>' ;
		return html;
	}

	this.showCommentReply = function(id, commentingUserId, isMyProfile, comment, commentId, approvals, disapprove, countApprove, countDisappr){
		var deleteComment = ''; var approvalsValue = '';
		var disapproveValue = ''; var html = '';
		if(commentingUserId == GetSessionValue("user").fbID )
			deleteComment = '<input type="button" value="Delete" class="deleteReply"></button>';
				
		if(approvals == -1 && disapprove == -1){
		} else {
			if(approvals >= 0){ approvalsValue = '2'; } else { disapproveValue = '2'; }
		}
		html = '<div id="' + commentId + '"> <p>' + comment + '</p>' + 
					'<img class="likeButton" src="/css/images/like'+approvalsValue+'.png" style="width:20px; height:20px; float: left"/>' + 
					'<div class="countApprove" style="float: left"> ' + countApprove + '</div>'  +
					'<img class="unlikeButton" src="/css/images/unlike'+disapproveValue+'.png" style="width:20px; height:20px; float: left"/>' + 
					'<div class="countDisappr" style="float: left"> ' + countDisappr + '</div>'  +
					deleteComment +
					'<hr />' + 
				'</div>';
		return html;
	}

}

var templates = new Template();
