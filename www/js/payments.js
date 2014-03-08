
$(document).ready(function(){
	$("#form").validate({
	  rules: {
	    field: {
	      required: true,
	      creditcard: true
	    }
	  }
	});
});