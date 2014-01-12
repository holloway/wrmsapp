(function($){
	var show_message = function(text, callback){
		var current_callback = callback,
			dialog_message = $("#dialog_message"),
			dialog_message_text = $("#dialog_message div").text(text);
			fadeOut = function(){
				dialog_message.fadeOut();
				if(current_callback){
					current_callback();
				}
			};
		console.log(text);
		dialog_message.fadeIn(function(){setTimeout(fadeOut,1000);});
	},
	webservice_prefix = "https://wrms.catalyst.net.nz/",
	webservice = {
		previous_request: null,
		cancel_any_previous_request: function(){
			if(!webservice.previous_request || !webservice.previous_request["abort"]) return;
			webservice.previous_request.abort();
		},
		error: function(status, response, text){
			//show_message(response + "\n" + text);
		},
		get: function(url, params, callback){
			webservice.cancel_any_previous_request();
			webservice.previous_request = jQuery.get(webservice_prefix + url, params, callback).error(webservice.error);
		},
		post: function(url, params, callback){
			webservice.cancel_any_previous_request();
			webservice.previous_request = jQuery.post(webservice_prefix + url, params, callback).error(webservice.error);
		},
		login: function(username, password, callback){
			webservice.post('', {"username":username,"password":password, "submit":"GO!", "remember": "1"}, callback);
		}
	},
	cache = {},
	session_id = null,
	callback = {
		login: function(data, success, jqXHR){
			$("body").removeClass("loading");
			if(data.match(/You must log in/i) || data.match(/Invalid username or password/i)){
				return show_message("Bad username or password");
			}
			webservice.get('wr.php', null, callback.check_access);
		},
		check_access: function(data, success, jqXHR){
			if(data.match(/You must log in/i) || data.match(/Invalid username or password/i)){
				$("body").removeClass("loading");
				login_status.set(false);
				return show_message("Bad username or password.");
			}
			// if we've made it this far then we're actually logged in
			// however the browser may be hiding cross-site cookies
			var cookie_string = jqXHR.getResponseHeader('Set-Cookie');
			if(cookie_string !== null) {
				session_id = read_cookie('sid', cookie_string);
				if(session_id === null) {
					session_id = read_cookie('lsid', cookie_string);
				}
				if(session_id !== null) {
					localStorage['session_id'] = session_id;
				}
			} else {
				//$("body").append(jqXHR.getAllResponseHeaders() + "<hr>" + data.replace(/</gi, "&lt;").replace(/>/gi, "&gt;"));
				//return show_message("Unable to access " + webservice_prefix + " (no cookie) ");
			}
			login_status.set(true);
			document.location = "ticket.html";
		}
	},
	lifecycle = {
		ready: function(){
			var previous_session_id = localStorage.getItem('session_id');
			if(previous_session_id !== null && previous_session_id !== "null") {
				document.location = "ticket.html";
				return true;
			}
			$("#page_login").show();
			$('#page_login :submit').click(function(){
				var username = $("#username").val(),
					password = $("#password").val();
				$("body").addClass("loading");
				if(username.length === 0 && password.length === 0){
					return webservice.get('wr.php', null, callback.check_access);
				}
				webservice.login(username, password, callback.login);
			});
			if(login_status.get() === true){
				//document.location = "ticket.html";
			}
		}
	},
	read_cookie = function(name, cookie_string) {
		var nameEQ = name + "=";
		if(!cookie_string) return null;
		var ca = cookie_string.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	};

	window.pageload(lifecycle.ready);
}(jQuery));