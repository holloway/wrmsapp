(function($){
	var show_message = function(text, callback){
		var current_callback = callback,
			$dialog_message = $("#dialog_message"),
			fadeOut = function(){
				$dialog_message.fadeOut();
				if(current_callback){
					current_callback();
				}
			};
		$dialog_message_text = $dialog_message.find("div").text(text);
		$dialog_message.css("top", $("body").scrollTop());
		$dialog_message.fadeIn(function(){setTimeout(fadeOut,2000);});
	},
	webservice_prefix = "https://wrms.catalyst.net.nz/",
	webservice = {
		debug: false,
		debug_ticket_id: 203650,
		debug_check_params: function(params){
			if(webservice.debug && params){
				if(params.request_id) {
					params.request_id = webservice.debug_ticket_id;
				} else if(params.request_id_range) {
					params.request_id_range = webservice.debug_ticket_id;
				} else if(params.search_for){
					params.search_for = webservice.debug_ticket_id;
				}
			}
			return params;
		},
		error: function(status, response, text){
			//show_message(response + "\n" + text);
		},
		post: function(url, params, callback){
			params = webservice.debug_check_params(params);
			return jQuery.post(webservice_prefix + url, params, callback).error(webservice.error);
		},
		get: function(url, params, callback){
			params = webservice.debug_check_params(params);
			return jQuery.get(webservice_prefix + url, params, callback).error(webservice.error);
		},
		search: function(search_string, callback){
			if(webservice.previous_search && webservice.previous_search.abort) {
				webservice.previous_search.abort();
			}
			webservice.previous_search = webservice.get('api2/search', {"q":search_string,"limit":100,"format":"json","columns":"request_id,description"}, callback);
			return webservice.previous_search;
		},
		ticket: function(wrms_ticket_id, callback){
			webservice.get('api2/report', {
				"report_type":"request",
				"request_id_range":wrms_ticket_id,
				"format":"json",
				"page_size":"1",
				"page_no":"1",
				"display_fields":"request_id,parent_request_id,parent_link_type,last_activity_epoch,status_desc,brief,detailed,created_by_fullname,requester_id_fullname,allocated_to_count,allocated_to_fullnames,interested_users_fullnames,request_on_epoch,urgency_desc,importance_desc,request_type_desc,tags,has_quote,has_approved_quote,organisation_id,organisation_code,system_name",
				"order_by":"request_id",
				"random_field_to_block_cache": Math.random(99999),
				"order_direction":"desc"}, callback);
		},
		ticket_comments: function(wrms_ticket_id, callback){
			webservice.get('api2/report', {
				"request_id": wrms_ticket_id,
				"report_type":"activity",
				"page_size":"9999",
				"page_no":"1",
				"display_fields":"source,fullname,note,date_epoch",
				"order_by":"source",
				"random_field_to_block_cache": Math.random(99999),
				"order_direction":"desc"}, callback);
		},
		ticket_relationships: function(wrms_ticket_id, callback){
			//webservice.get('api2/report', {"parent_request_id": wrms_ticket_id, "report_type":"request", "page_size":"200", "page_no":"1", "display_fields":"request_id,parent_request_id,status_desc,brief"}, callback);
			//regular API doesn't do both parents and children
			webservice.get('wr.php', {"request_id": wrms_ticket_id}, callback);
		},
		scrape_blank_wr_dot_php: function(callback){
			webservice.get('wr.php', null, callback);
		},
		scrape_particular_wr_dot_php: function(wrms_ticket_id, callback){
			webservice.get('wr.php', {"request_id":wrms_ticket_id}, callback);
		},
		get_organisation_relationships: function(wrms_ticket_id, org_code, callback){
			webservice.get('js.php', {"org_code":org_code, "request_id":wrms_ticket_id}, callback);
		}
	},
	webservice_helper = {
		_get_defaults: function(){
			var $ticket = $("#ticket");
				response = {
				"request_id": $ticket.find(".request_id").text().replace(/#/, ''),
				"brief": $ticket.find(".brief").text(),
				"status_code": $ticket.find("#status_code").val(),
				"detailed": $ticket.find("textarea.detailed").text(),
				"org_code": $ticket.find("#org_code").val(),
				"system_id": $ticket.find("#system_id").val(),
				"requester_id": $ticket.find("#requester_id").val(),
				"old_last_activity": $ticket.find("#old_last_activity").val(),
				"submit": 'Update',
				"preserve_html":"off",
				"edit":"1"
			};
			if($ticket.find(".send_no_email").prop("checked")){
				response.send_no_email = "on";
			}
			return response;
		},
		change_brief: function(wrms_ticket_id, brief, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.brief = brief;
			return webservice.post('wr.php', params, callback);
		},
		change_details: function(wrms_ticket_id, details, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.detailed = details;
			return webservice.post('wr.php', params, callback);
		},
		change_organisation: function(wrms_ticket_id, org_code, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.org_code = org_code;
			return webservice.post('wr.php', params, callback);
		},
		change_status_of_ticket: function(wrms_ticket_id, status_code, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.status_code = status_code;
			return webservice.post('wr.php?edit=1&request_id=' + wrms_ticket_id, params, callback);
		},
		allocate_user_to_ticket: function(wrms_ticket_id, user_id, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params['new_allocations[]'] = user_id;
			return webservice.post('wr.php?edit=1&request_id=' + wrms_ticket_id, params, callback);
		},
		deallocate_user_from_ticket: function(wrms_ticket_id, user_id, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.action = "deallocate";
			params.user_no = user_id;
			return webservice.get('wr.php', params, callback);
		},
		subscribe_user_to_ticket: function(wrms_ticket_id, user_id, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params['new_subscriptions[]'] = user_id;
			return webservice.post('wr.php?edit=1&request_id=' + wrms_ticket_id, params, callback);
		},
		unsubscribe_user_from_ticket: function(wrms_ticket_id, user_id, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.action = "unsubscribe";
			params.user_no = user_id;
			return webservice.get('wr.php', params, callback);
		},
		change_requester: function(wrms_ticket_id, requester_id, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.requester_id = requester_id;
			return webservice.post('wr.php', params, callback);
		},
		change_system_id: function(wrms_ticket_id, system_id, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.system_id = system_id;
			return webservice.post('wr.php', params, callback);
		},
		add_note_to_ticket: function(wrms_ticket_id, note_detail, callback){
			var params = this._get_defaults();
			params.request_id = wrms_ticket_id;
			params.note_detail = note_detail;
			return webservice.post('wr.php', params, callback);
		}
	},
	templates = {},
	cache,
	quiet_update = false,
	temporary_cache = {
		"ticket":{},
		"organisation": {},
		"system": {}
	},
	timezone_offset_in_milliseconds = (new Date()).getTimezoneOffset() * 60 * 1000,
	session_id = null,
	callback = {
		scrape_details: function(data, success, jqXHR){
			var html = make_html_jquery_parsable(jqXHR.responseText),
				$html = $(html);
			cache.status_code = extract_select_list_as_dictionary($html.find("select[name='status_code']"));
			cache.allocatable = extract_select_list_as_dictionary($html.find("select[name='allocatable']"));
			cache.subscribable = extract_select_list_as_dictionary($html.find("select[name='subscribable']"));
			cache.request_type = extract_select_list_as_dictionary($html.find("select[name='request_type']"));
			cache.requester_id = extract_select_list_as_dictionary($html.find("select[name='requester_id']"));
			cache.org_code = extract_select_list_as_dictionary($html.find("select[name='org_code']"));
			localStorage['cache'] = JSON.stringify(cache);
			scrape_any_response_from_wr_dot_php($html);
		},
		search_ticket_id: function(event){
			var wrms_ticket_id = $("#wrms_id").val();
			$("body").addClass("loading");
			webservice.ticket(wrms_ticket_id, callback.display_ticket);
		},
		search_wrms: function(event){
			var search_string = $("#search_box").val();
			$("#search_results").addClass("loading");
			webservice.search(search_string, callback.search_results);
		},
		search_results: function(data, success, jqXHR){
			var tickets = JSON.parse(jqXHR.responseText),
				$search_results = $("#search_results"),
				i;
			$("#search_results").removeClass("loading");
			if(!tickets.response || !tickets.response.body) {
				console.log("Unable to search", jqXHR.responseText);
				return show_message("Unable to search. Try logging out?");
			}
			for(i = 0; i < tickets.response.body.length; i++){
				tickets.response.body[i].description = tickets.response.body[i].description.toString();
			}
			$search_results.html(templates.search_results_template(tickets.response)).show();
		},
		display_ticket: function(data, success, jqXHR){
			var ticket = JSON.parse(jqXHR.responseText),
				$ticket = $("#ticket"),
				request_id,
				status_code,
				org_code,
				requester_id,
				request_type,
				allocated_to_fullnames_array,
				subscribed_to_fullnames_array,
				i,
				select_person_id_by_fullname = function(people, fullname){
					var person,
						fullname_length = fullname.length,
						j;
					for(j = 0; j < people.length; j++){
						person = people[j];
						if(person.text.substr(0, fullname_length) === fullname) {
							return person.value;
						}
					}
					return undefined;
				};
			//alert(JSON.stringify(ticket));
			$("body").removeClass("loading");
			if(!ticket.response || !ticket.response.results) {
				return show_message("Unable to display ticket.");
			}
			ticket.response.results = sanitise_results(ticket.response.results);
			request_id = ticket.response.results[0].request_id.toString();
			
			if(cache.status_code) {
				ticket.response.results[0].select_status_code = select_by_text(clone_obj(cache.status_code), ticket.response.results[0].status_desc);
				ticket.response.results[0].select_org_code = select_by_value(clone_obj(cache.org_code), ticket.response.results[0].organisation_id);
				ticket.response.results[0].select_allocated_to = clone_obj(cache.allocatable);
				ticket.response.results[0].select_subscribed_to = clone_obj(cache.subscribable);
				ticket.response.results[0].allocated_to = [];
				allocated_to_fullnames_array = ticket.response.results[0].allocated_to_fullnames.split(",");
				//console.log(allocated_to_fullnames_array);
				for(i = 0; i < allocated_to_fullnames_array.length; i++) {
					ticket.response.results[0].allocated_to.push({
						fullname: $.trim(allocated_to_fullnames_array[i]),
						id: select_person_id_by_fullname(cache.requester_id, $.trim(allocated_to_fullnames_array[i]))
					});
				}
				//console.log(ticket.response.results[0].allocated_to);

				ticket.response.results[0].subscribed_to = [];
				subscribed_to_fullnames_array = ticket.response.results[0].interested_users_fullnames.split(",");
				//console.log(allocated_to_fullnames_array);
				for(i = 0; i < allocated_to_fullnames_array.length; i++) {
					if($.trim(subscribed_to_fullnames_array[i]).length > 0) {
						ticket.response.results[0].subscribed_to.push({
							fullname: $.trim(subscribed_to_fullnames_array[i]),
							id: select_person_id_by_fullname(cache.requester_id, $.trim(subscribed_to_fullnames_array[i]))
						});
					}
				}
				
				if(quiet_update === true){
					ticket.response.results[0].send_no_email_checked_attribute = ' checked="checked" what="what" ';
				} else {
					ticket.response.results[0].send_no_email_checked_attribute = '';
				}

				//console.log("quiet_update? 1", localStorage["quiet_update"]);
			}
			ticket.response.results[0].old_last_activity = format_epoch_as_wrms_timestamp(ticket.response.results[0].last_activity_epoch);
			ticket.response.results[0].detailed_html = highlight_text(ticket.response.results[0].detailed).replace(/\n/gi,'<br>');
			ticket.response.results[0]['wrms-app-version'] = wrms_app_version;
			

			if(!temporary_cache.ticket[request_id]){
				temporary_cache.ticket[request_id] = {
					"results": undefined,
					"relationships": undefined
				};
			}

			temporary_cache.ticket[request_id] = ticket.response.results[0];

			$ticket.show().html(templates.ticket_template(ticket.response));
			if($(window).width() < 500) {
				$("#show_slideout_navigation").prop("checked",false);
			}
			$ticket.find("p.select_row select").each(function(index, element){
				update_label_select($(element));
			});
			login_status.set(true);
			webservice.ticket_relationships(request_id, callback.display_ticket_relationships_from_wr_dot_php);
			webservice.get_organisation_relationships(request_id, ticket.response.results[0].organisation_id, callback.update_organisation_relationships);
			set_history(request_id, ticket.response.results[0].brief);
			window.location = "#wr" + request_id;
			window.scrollTo(0,0);
		},
		
		update_organisation_relationships: function(data, success, jqXHR){
			var $requester_id = $("#requester_id"),
				$system_id = $("#system_id"),
				relationships = {},
				org_code = this.url.toString().match(/org_code=([^&]+)/)[1],
				request_id = this.url.toString().match(/request_id=([^&]+)/)[1],
				requester_id_fullname = temporary_cache.ticket[request_id].requester_id_fullname,
				system_name = temporary_cache.ticket[request_id].system_name;

			if(!temporary_cache.organisation[org_code]) {
				temporary_cache.organisation[org_code] = {};
			}
			if(!temporary_cache.organisation[org_code].relationships){
				temporary_cache.organisation[org_code].relationships = {};
			}

			jqXHR.responseText.replace(/(.*?):(.*?)\n/gi,  function(match, contents1, contents2, offset, string){
				contents1 = $.trim(contents1);
				contents2 = $.trim(contents2);
				if(!relationships[contents1]) {
					relationships[contents1] = [];
				}
				relationships[contents1].push({
					"value": contents2.match(/value="([^"]+)"/)[1],
					"text": $.trim(contents2.match(/>(.*?)</)[1])
				});
			});

			temporary_cache.organisation[org_code].relationships.requester_select_id = select_by_text_prefix(
				relationships.Person,
				requester_id_fullname
			);

			temporary_cache.organisation[org_code].relationships.system_select_id = select_by_text_prefix(
				relationships.System,
				system_name
			);

			$requester_id.html(
				'<option value="(none)">Choose person</option> ' +
				templates.options_template({options: temporary_cache.organisation[org_code].relationships.requester_select_id})
			);

			$system_id.html(
				'<option value="(none)">Choose system</option> ' +
				templates.options_template({options: temporary_cache.organisation[org_code].relationships.system_select_id})
			);

			update_label_select($requester_id);
			update_label_select($system_id);
			//console.log(temporary_cache.ticket[last_wrms_ticket_id].results.select_requester_id);
		},
		display_ticket_relationships: function(data, success, jqXHR){
			var ticket_relationships = JSON.parse(jqXHR.responseText),
				wrms_id = parseInt(ticket_relationships.request.parent_request_id, 10),
				$ticket = $("#ticket"),
				ticket_relationship,
				indexes_to_delete = [],
				i;
			for(i = 0; i < ticket_relationships.response.results.length; i++){
				ticket_relationship = ticket_relationships.response.results[i];
				if(ticket_relationship.request_id == wrms_id){
					indexes_to_delete.push(i);
				}
			}
			//console.log("ticket relationships", ticket_relationships);
			indexes_to_delete.sort();
			indexes_to_delete.reverse();
			for(i = 0; i < indexes_to_delete.length; i++){
				ticket_relationships.response.results.splice(indexes_to_delete[i], 1);
			}
			$ticket.find(".relationships").replaceWith(templates.ticket_relationships_template(ticket_relationships.response));
			webservice.ticket_comments(wrms_id, callback.display_ticket_comments);
		},
		display_ticket_relationships_from_wr_dot_php: function(data, success, jqXHR){
			var html = make_html_jquery_parsable(data),
				$html = $(html),
				$heading = $html.find(":contains(Related Requests)"),
				$row_segment,
				$rows,
				$ticket = $("#ticket"),
				response = {"results":[]},
				relationships = {};
			
			if($heading.length === 0) {
				return show_message("Unable to find related requests");
			}
			$row_segment = $heading.parent().next("tr");
			while($row_segment.text().match(/brief/i)){
				$rows = $row_segment.find("tbody tr");
				callback._process_relationship_table($rows, relationships);
				$row_segment = $row_segment.next("tr");
			}
			response.results = relationships;
			console.log(response.results);
			$ticket.find(".relationships").replaceWith(templates.ticket_relationships_template(response));
		},
		_process_relationship_table: function($rows, relationships){
			var cell_headings = [],
				$firstRow,
				table_type;
			if($rows.length === 0) {
				return show_message("Unable to find related requests.");
			}
			$firstRow = $($rows.get(0));
			$firstRow.find("th,td").each(function(index, Element){
				var $row_header = $(Element),
					text = $row_header.text().toLowerCase();

				if(text.match(/parent/ig)){
					table_type = "parent";
					console.log("found parent in: ", text);
				} else if(text.match(/child/ig)){
					table_type = "child";
					console.log("found child in: ", text);
				}

				if(text.match(/child/i) || text.match(/parent/gi) ){
					text = "wr";
				}
				cell_headings[text] = index;
			});
			$rows = $rows.slice(1);
			if(table_type === undefined) {
				console.log("Unable to detect table type in ", $firstRow.html());
			}
			relationships[table_type] = [];
			$rows.each(function(index, Element){
				var $cells = $(Element).find("td");
				relationships[table_type].push({
					"request_id": $($cells.get(cell_headings.wr)).text(),
					"brief": $($cells.get(cell_headings.brief)).text(),
					"status": $($cells.get(cell_headings.status)).text()
				});
			});
		},
		display_ticket_comments: function(data, success, jqXHR){
			var ticket_comments = JSON.parse(jqXHR.responseText),
				wrms_id = parseInt(ticket_comments.request.request_id, 10),
				wrms_comments_and_attachments = [],
				wrms_attachment,
				$ticket = $("#ticket");
			for(i = 0; i < ticket_comments.response.results.length; i++){
				if(ticket_comments.response.results[i].source === "note"){
					wrms_comments_and_attachments.push({
						"fullname": ticket_comments.response.results[i].fullname,
						"date_epoch": ticket_comments.response.results[i].date_epoch,
						"formatted_date": format_epoch_as_wrms_timestamp(ticket_comments.response.results[i].date_epoch),
						"note_sanitised": highlight_text(ticket_comments.response.results[i].note),
						"is_comment": true,
						"is_attachment": false,
						"wrms_domain": webservice_prefix.substr(0, webservice_prefix.length - 1)
					});
				}
			}
			//console.log(ticket_comments);
			//console.log("attachments", wrms_id, cache.attachments[wrms_id]);
			if(cache.attachments && cache.attachments[wrms_id]){
				for(i = 0; i < cache.attachments[wrms_id].length; i++){
					wrms_attachment = cache.attachments[wrms_id][i];
					wrms_comments_and_attachments.push({
						"fullname": wrms_attachment.fullname,
						"date_epoch": wrms_attachment.date_epoch,
						"formatted_date": format_epoch_as_wrms_timestamp(wrms_attachment.date_epoch),
						"description": wrms_attachment.description,
						"path": wrms_attachment.path,
						"is_comment": false,
						"is_attachment": true,
						"wrms_domain": webservice_prefix.substr(0, webservice_prefix.length - 1)
					});
				}
			}

			wrms_comments_and_attachments.sort(function(a, b){
				var index;
				if(a.date_epoch < b.date_epoch) {
					return -1;
				} else if(a.date_epoch > b.date_epoch){
					return 1;
				}
				return 0;
			});

			ticket_comments.response.results = wrms_comments_and_attachments;
			//console.log(ticket_comments.response.results);

			$ticket.find(".comments_and_attachments").replaceWith(templates.ticket_comments_template(ticket_comments.response));
			$ticket.find("a").attr({"target":"_blank", "rel": "external"});
		},
		close_app: function(){
			window.location = "index.html";
			navigator.device.exitApp();
		},
		console_log_any_messages: function(data, success, jqXHR){
			var html = make_html_jquery_parsable(jqXHR.responseText),
				$html = $(html),
				$messages = $html.find("#messages"),
				messages_html = $messages.html(),
				messages_plaintext;

			scrape_any_response_from_wr_dot_php($html);

			if($messages.length) {
				messages_plaintext = $.trim(messages_html.replace(/<.*?>/gi, '')),
				console.log(messages_plaintext);
				show_message(messages_plaintext);
				return messages_html;
			} else {
				show_message("Error: Expected message but received none");
			}
		},
		scrape_wr_dot_php_response: function(data, success, jqXHR){
			scrape_any_response_from_wr_dot_php(
				$(make_html_jquery_parsable(jqXHR.responseText))
			);
		},
		add_allocation: function(data, success, jqXHR){
			var messages_html = callback.console_log_any_messages(data, success, jqXHR),
				$ticket = $("#ticket"),
				$being_allocated = $ticket.find(".being-allocated"),
				allocated_to = "Allocated to ",
				allocated_to_indexOf,
				remainder_messages_html,
				user_fullname;
			if(messages_html) {
				allocated_to_indexOf = messages_html.indexOf(allocated_to) + allocated_to.length;
				remainder_messages_html = messages_html.substr(allocated_to_indexOf);
				user_fullname = remainder_messages_html.substr(0, remainder_messages_html.indexOf("<")).replace(/\./gi, '');
				$being_allocated.each(function(index, element){
					var $element = $(element),
						element_text = $.trim($element.text());
					if(element_text.substr(0, user_fullname.length) == user_fullname){
						$element.removeClass("being-allocated");
					}
				});
			}
		},
		add_subscription: function(data, success, jqXHR){
			var messages_html = callback.console_log_any_messages(data, success, jqXHR),
				$ticket = $("#ticket"),
				$being_subscribed = $ticket.find(".being-subscribed"),
				subscribed_to = "Subscribed to ",
				subscribed_to_indexOf,
				remainder_messages_html,
				user_fullname;
			if(messages_html) {
				subscribed_to_indexOf = messages_html.indexOf(subscribed_to) + subscribed_to.length;
				remainder_messages_html = messages_html.substr(subscribed_to_indexOf);
				user_fullname = remainder_messages_html.substr(0, remainder_messages_html.indexOf("<")).replace(/\./gi, '');
				$being_subscribed.each(function(index, element){
					var $element = $(element),
						element_text = $.trim($element.text());
					if(element_text.substr(0, user_fullname.length) == user_fullname){
						$element.removeClass("being-subscribed");
					}
				});
			}
		}
	},
	last_scroll_top = 0,
	last_speed,
	currently_scrolling,
	$scroll_top_element,
	$scroll_bottom_element,
	set_display_opacity = function(event){
		$this = $(this);
		if($this.css("opacity") < 0.1) {
			$this.hide();
		} else {
			$this.show();
		}
	},
	lifecycle = {
		scroll: function(event){
			var doc = document.documentElement,
				body = document.body,
				new_scroll_top = (doc && doc.scrollTop || body && body.scrollTop || 0);
			if(last_scroll_top != new_scroll_top){
				lifecycle.scroll_acceleration(new_scroll_top - last_scroll_top);
				last_scroll_top = new_scroll_top;
			}
			if(currently_scrolling) {
				clearTimeout(currently_scrolling);
			}
			currently_scrolling = setTimeout(lifecycle.scroll_end, 500);

		},
		scroll_end: function(){
			$scroll_top_element.removeClass("visible");
			$scroll_bottom_element.removeClass("visible");
			last_speed = undefined;
		},
		scroll_acceleration: function(speed){
			if(speed > 0 && (!last_speed || last_speed < 0)) {
				$scroll_top_element.removeClass("visible");
				$scroll_bottom_element.show().addClass("visible");
			} else if(speed < 0 && (!last_speed || last_speed > 0)) {
				$scroll_top_element.show().addClass("visible");
				$scroll_bottom_element.removeClass("visible");
			} else {
				// it's not a change in direction so we don't care
			}
			last_speed = speed;
			
			//console.log($scroll_top_element.length, $scroll_bottom_element.length)
		},
		ready: function(){
			var previous_session_id = localStorage['session_id'],
				$search_box = $("#search_box"),
				search_offset = $search_box.height() + $search_box.offset().top + 40,
				$tabs = $("#tabs"),
				history_offset = $tabs.height() + $tabs.offset().top + 13,
				quiet_update_json = localStorage["quiet_update"];
			if(previous_session_id !== null && previous_session_id !== "null") {
			} else {
				//window.location = "index.html";
				//return;
			}
			$scroll_top_element = $("#scroll-top").click(function(){
				window.scrollTo(0,0);
			});
			$scroll_bottom_element = $("#scroll-bottom").click(function(){
				window.scrollTo(0,10000);
			});

			$scroll_top_element.get(0).addEventListener('webkitTransitionEnd', set_display_opacity);
			$scroll_bottom_element.get(0).addEventListener('webkitTransitionEnd', set_display_opacity);

			if(localStorage['cache']){
				cache = JSON.parse(localStorage['cache']);
			} else {
				cache = {};
			}

			$("#search_results, #history_results").on("click", "li.ticket", function(event){
				var $ticket = $(event.target).closest(".ticket"),
					wrms_id_text = $ticket.attr("id"),
					wrms_id = parseInt(wrms_id_text.replace(/[^0-9]/g,""), 10);
				$ticket.siblings().removeClass("current");
				$ticket.addClass("current");
				$("body").addClass("loading");
				webservice.ticket(wrms_id, callback.display_ticket);
				webservice.scrape_particular_wr_dot_php(wrms_id, callback.scrape_wr_dot_php_response);
			});

			$("#ticket").on("click", "div.relationship", function(event){
				var $relationship = $(event.target).closest(".relationship"),
					css_prefix = "child_wr_",
					css_class = get_css_prefix($relationship.attr("class"), css_prefix),
					wrms_id = css_class.substr(css_prefix.length);
				$("#slideout_navigation").find(".current").removeClass("current");
				$("body").addClass("loading");
				webservice.ticket(wrms_id, callback.display_ticket);
				window.scrollTo(0,0);
			}).on("click", "a.goto-ticket-is-considered-harmful", function(event){
				var $this = $(this),
					wrms_id = $this.attr("href").substr(3);
				$("#slideout_navigation").find(".current").removeClass("current");
				$("body").addClass("loading");
				webservice.ticket(wrms_id, callback.display_ticket);
				return false;
			}).on("click", "a.deallocate-user", function(event){
				var $this = $(this),
					$ticket = $("#ticket"),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, ''),
					user_fullname = $.trim($this.html()),
					user_id = $this.attr("href").substr(1),
					confirm_deallocate;
				user_fullname = user_fullname.replace(/<span.*?\/span>/gi, '');
				confirm_deallocate = confirm("Deallocate " + user_fullname + "?");
				if(confirm_deallocate){
					webservice_helper.deallocate_user_from_ticket(wrms_ticket_id, user_id, callback.console_log_any_messages);
					$this.remove();
				}
				return false;
			}).on("click", "a.unsubscribe-user", function(event){
				var $this = $(this),
					$ticket = $("#ticket"),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, ''),
					user_fullname = $.trim($this.html()),
					user_id = $this.attr("href").substr(1),
					confirm_unsubscribe;
				user_fullname = user_fullname.replace(/<span.*?\/span>/gi, '');
				confirm_unsubscribe = confirm("Unsubscribe " + user_fullname + "?");
				if(confirm_unsubscribe){
					webservice_helper.unsubscribe_user_from_ticket(wrms_ticket_id, user_id, callback.console_log_any_messages);
					$this.remove();
				}
				return false;
			}).on("change", "#allocatable", function(event){
				var $ticket = $("#ticket"),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, ''),
					$allocatable = $ticket.find("#allocatable"),
					$allocatable_option = $allocatable.find(":selected"),
					user_fullname = $.trim($allocatable_option.text().replace(/\(.*?\)/, '')),
					user_id = $allocatable_option.attr("value"),
					confirm_allocate;
				if(user_id.match("(none)")) {
					return;
				}
				confirm_allocate = confirm("Allocate " + user_fullname + "?");
				if(confirm_allocate) {
					webservice_helper.allocate_user_to_ticket(wrms_ticket_id, user_id, callback.add_allocation);
					$ticket.find(".allocated_to").append('<a href="#' + user_id + '" class="deallocate-user being-allocated">' + user_fullname + ' <span>&times;</span></a> ');
				} else {
				}
				$allocatable_option.prop('selected', false);
				//$allocatable.closest(".add_allocatable").find("label span").text("");
			}).on("change", "#subscribable", function(event){
				var $ticket = $("#ticket"),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, ''),
					$subscribable = $ticket.find("#subscribable"),
					$subscribable_option = $subscribable.find(":selected"),
					user_fullname = $.trim($subscribable_option.text().replace(/\(.*?\)/, '')),
					user_id = $subscribable_option.attr("value"),
					confirm_subscribe;
				if(user_id.match("(none)")) {
					return;
				}
				confirm_subscribe = confirm("Subscribe " + user_fullname + "?");
				if(confirm_subscribe) {
					webservice_helper.subscribe_user_to_ticket(wrms_ticket_id, user_id, callback.add_subscription);
					$ticket.find(".subscribed_to").append('<a href="#' + user_id + '" class="unsubscribe-user being-subscribed">' + user_fullname + ' <span>&times;</span></a> ');
				} else {
				}
				$subscribable_option.prop('selected', false);
			}).on("change", "#status_code", function(event){
				var $this = $(this),
					status_code = $this.val(),
					$ticket = $("#ticket"),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, '');
				webservice_helper.change_status_of_ticket(wrms_ticket_id, status_code, callback.console_log_any_messages);
			}).on("change", "p.select_row select", function(event){
				update_label_select($(event.target));
			}).on("change", "#org_code", function(event){
				var wrms_ticket_id = $("#ticket").find(".request_id").text().replace(/#/, '');
					org_code = $(this).val();
				webservice.get_organisation_relationships(wrms_ticket_id, org_code, callback.update_organisation_relationships);
			}).on("change", "#requester_id", function(event){
				var $ticket = $("#ticket"),
					$requester_id = $ticket.find("#requester_id"),
					requester_id = $requester_id.val(),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, '');
				webservice_helper.change_requester(wrms_ticket_id, requester_id, callback.console_log_any_messages);
			}).on("change", "#system_id", function(event){
				var $ticket = $("#ticket"),
					$system_id = $ticket.find("#system_id"),
					system_id = $system_id.val(),
					wrms_ticket_id = $ticket.find(".request_id").text().replace(/#/, '');
				webservice_helper.change_system_id(wrms_ticket_id, system_id, callback.console_log_any_messages);
			}).on("blur", "#note_detail", function(event){
				var $this = $(this),
					note_detail = $.trim($this.val()),
					confirm_note_detail,
					wrms_ticket_id = $("#ticket").find(".request_id").text().replace(/#/, '');
					
				if(note_detail.length === 0) return;
				confirm_note_detail = confirm("Do you want to add this note?");
				if(!confirm_note_detail) return;
				webservice_helper.add_note_to_ticket(wrms_ticket_id, note_detail, callback.console_log_any_messages);
				$this.val("");
				webservice.ticket_comments(wrms_ticket_id, callback.display_ticket_comments);
			}).on("click", ".brief", function(event){
				var $this = $(this),
					brief_text = $this.text(),
					new_brief_text,
					$ticket = $("#ticket"),
					wrms_ticket_id;
				new_brief_text = prompt('Change brief (title)', brief_text);
				if(new_brief_text) {
					wrms_ticket_id =  $ticket.find(".request_id").text().replace(/#/, '');
					$this.text(new_brief_text);
					webservice_helper.change_brief(wrms_ticket_id, new_brief_text, callback.console_log_any_messages);
				} else {
					$this.text(brief_text);
				}
			}).on("click", "p.detailed", function(event){
				var $this = $(this),
					$detailed_textarea = $this.next("textarea.detailed"),
					detailed_textarea_value;
				if($detailed_textarea.length !== 1) return alert("Unable to find textarea.detailed");
				$this.hide();
				detailed_textarea_value = $detailed_textarea.css("display", "block").focus().height($this.height() + 30).width($this.width()).val();
				cache.previous_detailed = detailed_textarea_value;
				$detailed_textarea.get(0).setSelectionRange(detailed_textarea_value.length, detailed_textarea_value.length);
			}).on("blur", "textarea.detailed", function(event){
				var $this = $(this),
					$detailed_paragraph = $this.prev("p.detailed"),
					this_value = $this.val(),
					$ticket = $("#ticket"),
					save_result,
					wrms_ticket_id;
				$this.hide();
				$detailed_paragraph.show();
				//console.log(cache.previous_detailed, this_value);
				if(cache.previous_detailed === this_value) return;
				save_result = confirm("Update details?");
				if(save_result) {
					wrms_ticket_id =  $ticket.find(".request_id").text().replace(/#/, '');
					webservice_helper.change_details(wrms_ticket_id, this_value, callback.console_log_any_messages);
						$detailed_paragraph.html(
						$("<div/>").text(this_value).html().replace(/\n/g, '<br>')
					);
				}
			}).on("click", "ul.filterlist li", function(event){
				var $this = $(this),
					filterlist = $this.data("filterlist"),
					$comments_and_attachments = $(".comments_and_attachments");
				$comments_and_attachments.find(".filterlist-hidden").removeClass("filterlist-hidden");
				if(filterlist !== "(off)") {
					$comments_and_attachments.find("." + filterlist).addClass("filterlist-hidden");
				}
				$this.siblings().removeClass("current");
				$this.addClass("current");
			}).on("change", ".send_no_email", function(event){
				var $this = $(this);
				quiet_update = $this.prop("checked");
				localStorage["quiet_update"] = JSON.stringify({"quiet_update":quiet_update});
				//console.log("quiet_update?", localStorage["quiet_update"]);
			});

			$(window).resize(function(){
				$("#search_results").height($(window).height() - search_offset);
				$("#history_results").height($(window).height() - history_offset);
				
				//console.log($(window).height() + " - " + height_offset)
			}).resize();

			$("body").on("click", "a", function(event){
				var $target = $(this),
					href = $target.attr("href");

				if(href && (href.substr(0, 5) === "http:" || href.substr(0, 6) === "https:")) {
					var ref = window.open(href, '_blank');
					//ref.addEventListener('loadstart', function(event) { alert(event.type + ' - ' + event.url); } );
					//ref.addEventListener('loadstop', function(event) { alert(event.type + ' - ' + event.url); } );
					//ref.addEventListener('exit', function(event) { alert(event.type); } );
					return false;
				}
				return false;
			});

			window.addEventListener("hashchange", function(){
				var hash = location.hash.toString().replace(/#/g, ""),
					wmrs_request_id,
					existing_work_request;
				if(hash.substring(0, 2) === "wr"){
					wmrs_request_id = parseInt(hash.substring(2), 10);
					existing_work_request = parseInt($("#ticket").find(".request_id").text().replace(/#/g, ""), 10);
					if(wmrs_request_id !== existing_work_request) {
						$("#slideout_navigation").find(".current").removeClass("current");
						webservice.ticket(wmrs_request_id, callback.display_ticket);
						webservice.scrape_particular_wr_dot_php(wmrs_request_id, callback.scrape_wr_dot_php_response);
						window.scrollTo(0,0);
					}
				}
			}, false);
			
			window.fix_position_fixed_not_working_in_old_androids($("#slideout_navigation"), 0);
			window.fix_position_fixed_not_working_in_old_androids($(".arrow-end"), 200);

			$("#tabs").on("click", "li", function(event){
				var $this = $(this),
					$search_tab_content = $("#search_tab_content"),
					$history_tab_content = $("#history_tab_content");
				if($this.is("#search-tab")){
					$search_tab_content.show();
					$history_tab_content.hide();
					$("#search_box").focus();
				} else {
					$history_tab_content.show();
					$search_tab_content.hide();
					$("#history_results").html(templates.history_template({
						items: get_history()
					}));
				}
				$this.addClass("current").siblings().removeClass("current");
			});

			$("#wrms_id").keyup(callback.search_ticket_id);
			$("#search_box").keyup(callback.search_wrms);
			$('#page_login :submit').click(function(){
				webservice.login($("#username").val(), $("#password").val(), callback.login);
			});
			$("#logout").on("ontouchstart click", function(event){
				var confirm_logout = confirm("Are you sure you want to logout?");
				if(confirm_logout) {
					session_id = null;
					login_status.set(false);
					localStorage.setItem('session_id', session_id);
					$("#toolbar").slideUp();
					show_message("Bye!", callback.close_app);

				}
			});
			templates.search_results_template = Handlebars.compile($("#search_results_template").html());
			templates.history_template = Handlebars.compile($("#history_template").html());
			
			templates.ticket_template = Handlebars.compile($("#ticket_template").html());
			templates.ticket_relationships_template = Handlebars.compile($("#ticket_relationships_template").html());
			templates.ticket_comments_template = Handlebars.compile($("#ticket_comments_template").html());
			templates.options_template = Handlebars.compile($("#options_template").html());
			webservice.scrape_blank_wr_dot_php(callback.scrape_details);
			if(quiet_update_json) {
				quiet_update = JSON.parse(quiet_update_json).quiet_update;
			}
			window.onorientationchange = lifecycle.orientation_change;
			$(window).scroll(lifecycle.scroll);
			//window.touchScroll('search_results');
		}
	},
	sanitise_results = function(rows){
		var response = [],
			response_row,
			row;
		for(var i = 0; i < rows.length; i++){
			row = rows[i];
			response_row = {};
			for (var key in row){

				if($.isArray(row[key])) {
					response_row[key] = sanitise_results(row[key]);
				} else {
					response_row[key] = row[key].toString();
				}
				
			}
			response.push(response_row);
		}
		return response;
	},
	get_css_prefix = function(css_string, prefix){
		var parts = css_string.split(" "),
			i;
		for(i = 0; i < parts.length; i++){
			if(parts[i].substr(0,prefix.length) === prefix) return parts[i];
		}
	},
	extract_select_list_as_dictionary = function($select){
		var response = [];
		$select.find("option").each(function(index, element){
			var $element = $(element),
				value = $element.attr("value");
			if(value) {
				response.push({
					"value": value,
					"text": $element.text(),
					"selected": false
				});
			}
		});
		return response;
	},
	clone_obj = function(obj){
		if(obj === undefined) return undefined;
		return JSON.parse(JSON.stringify(obj));
	},
	highlight_text = function(text){
		return jQuery
			.trim(text)
			.replace(/\n/g, "<br>")
			.replace(/(wr)#?([0-9]+)/gi, '<a href="#wr$2" class="goto-ticket-is-considered-harmful">$1$2</a>')
			.replace(/(https?:[^:" \t\r\n\[\]>&<\(\)]+)/gi, '<a href="$1" target="_blank">$1</a>')
			.replace(/([^:" \t\[\]\r\n>;&<\(\)]+@[^:" \t\[\]\r\n>;&<\(\)]+)/gi, '<a href="mailto:$1">$1</a>');

	},
	select_by_value = function(list, value){
		for(var i = 0; i < list.length; i++){
			if(list[i].value === value) {
				list[i].selected = true;
				list[i].selected_attribute_string = ' selected="true" ';
			}
		}
		return list;
	},
	make_html_jquery_parsable = function(html_string){
		return html_string.replace(/^[\s\S]*<body(.*?)>/g, '<div$1>')
							.replace(/<\/body>[\s\S]*$/g, '</div>') // jQuery can't parse entire pages http://stackoverflow.com/a/12848798
							.replace(/<img.*?>/gi, '')
							.replace(/<style.*?\/style>/gi, '');
	},
	select_by_text = function(list, text){
		for(var i = 0; i < list.length; i++){
			//alert(list[i].text + " === " + text + " = " + (list[i].text === text));
			if(list[i].text === text) {
				list[i].selected = true;
				list[i].selected_attribute_string = ' selected="true" ';
			}
		}
		return list;
	},
	select_by_text_prefix = function(list, text) {
		if(!list)return;
		var text_length = text.length;
		for(var i = 0; i < list.length; i++){
			//alert(list[i].text + " === " + text + " = " + (list[i].text === text));
			if(list[i].text.substr(0, text_length) === text) {
				list[i].selected = true;
				list[i].selected_attribute_string = ' selected="true" ';
			}
		}
		return list;
	},
	zero_fill = function (number, width) {
		width -= number.toString().length;
		if(width > 0) {
			return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
		}
		return number + ""; // always return a string
	},
	format_epoch_as_wrms_timestamp = function(epoch){
		var epoch_date = new Date(epoch * 1000);
		return epoch_date.getFullYear() + "-" +
				zero_fill(epoch_date.getMonth() + 1, 2) + "-" +
				zero_fill(epoch_date.getDate(), 2) + " " +
				zero_fill(epoch_date.getHours(), 2) + ":" +
				zero_fill(epoch_date.getMinutes(), 2) + ":" +
				zero_fill(epoch_date.getSeconds(), 2);
	},
	update_label_select = function($select_element){
		var $selected = $select_element.find(":selected"),
			text = $selected.text(),
			value = $selected.val(),
			$label = $select_element.prevAll("label"),
			$span = $label.find("span.button");
		if($label.length === 0) {
			return alert("Error: Unable to find label");
		}
		if($.trim(text).length === 0 || value === "(none)") {
			return $span.hide();
		}
		$span.text(text).show();
	},
	parse_formatted_date_for_attachment = function(date_string){
		var date_parts = date_string.match(/(\d+):(\d+) (\d+)-(\d+)-(\d+)/i),
			named_date_parts = {
			"hours": date_parts[1],
			"minutes": date_parts[2],
			"day": date_parts[3],
			"month": date_parts[4],
			"year": date_parts[5]
		},
			date,
			local_date;

		//console.log("offset", timezone_offset_in_milliseconds, (new Date).getTimezoneOffset() * 60 * 1000 );

		try {
			date = new Date(
				named_date_parts.year,
				parseInt(named_date_parts.month, 10) - 1,
				named_date_parts.day,
				named_date_parts.hours,
				named_date_parts.minutes,
				0,
				0);
			local_date = new Date(date.getTime() + timezone_offset_in_milliseconds);
			//console.log(named_date_parts, local_date, date);
			return date.getTime() / 1000;
		} catch(Exception){
			return 0;
		}
		
	},
	scrape_any_response_from_wr_dot_php = function($html, wrms_ticket_id){
		var	old_last_activity = $.trim($html.find("input[name='old_last_activity']").val()),
			$attachments = $html.find("a[href*='attachment.php']");

		if(!wrms_ticket_id) {
			wrms_ticket_id = $html.find("input[name='request_id']").val();
		}

		if(old_last_activity.length > 0){
			$("#old_last_activity").val(old_last_activity);
		}

		if($attachments.length && wrms_ticket_id && parseInt(wrms_ticket_id, 10) > 0){
			if(!cache.attachments) {
				cache.attachments = {};
			}
			cache.attachments[wrms_ticket_id] = [];
			$attachments.each(function(index, element){
				var $element = $(element),
					element_description = $.trim($element.parent("td").next("td").text());
				cache.attachments[wrms_ticket_id].push({
					path: $element.attr("href"),
					fullname: $element.parent("td").next("td").next("td").text(),
					description: element_description || $element.text(),
					date_epoch: parse_formatted_date_for_attachment($element.parent("td").next("td").next("td").next("td").text())
				});
			});
		}
		//console.log("scraped", cache.attachments);
	},
	set_history = function(wrms_ticket_id, title){
		var wrms_history_json = localStorage['wrms-history'],
			wrms_history,
			wrms_history_by_ticket = {},
			wrms_ticket,
			epoch = (new Date()).getTime() / 1000,
			unique_wrms_history,
			i;
		if(wrms_history_json === undefined){
			wrms_history = [];
		} else {
			wrms_history = JSON.parse(wrms_history_json);
		}
		
		wrms_history.push({
			"epoch": epoch,
			"wrms_ticket_id": wrms_ticket_id,
			"title": title
		});

		for(i = 0; i < wrms_history.length; i++){
			wrms_ticket = wrms_history[i];
			if(wrms_history_by_ticket[wrms_ticket.wrms_ticket_id] === undefined){
				wrms_history_by_ticket[wrms_ticket.wrms_ticket_id] = wrms_ticket;
			} else {
				if(wrms_history_by_ticket[wrms_ticket.wrms_ticket_id].epoch < wrms_ticket.epoch) {
					wrms_history_by_ticket[wrms_ticket.wrms_ticket_id] = wrms_ticket;
				}
			}
		}
		wrms_history = [];
		$.each(wrms_history_by_ticket, function(index, item){
			wrms_history.push(item);
		});
		wrms_history.sort(function(a, b){
			if(a.epoch < b.epoch){
				return 1;
			} else if(a.epoch > b.epoch){
				return -1;
			}
			return 0;
		});
		while(wrms_history.length > 99){
			wrms_history.pop();
		}
		localStorage['wrms-history'] = JSON.stringify(wrms_history);
	},
	get_history = function(){
		var wrms_history_json = localStorage['wrms-history'],
			wrms_history,
			wrms_history_item,
			i,
			current_epoch;
		if(wrms_history_json === undefined) {
			return [];
		}
		current_epoch = (new Date()).getTime() / 1000;
		wrms_history = JSON.parse(wrms_history_json);
		for(i = 0; i < wrms_history.length; i++){
			wrms_history[i].formatted_date = format_epoch_as_wrms_timestamp(wrms_history[i].epoch);
			wrms_history[i].smart_date = format_epoch_as_smart_date(
				wrms_history[i].epoch,
				current_epoch
			);
			
		}
		return wrms_history;
	},
	format_epoch_as_smart_date = function(epoch, current_epoch){
		// Modified version of http://ejohn.org/files/pretty.js
		// Copyright (c) 2011 John Resig (ejohn.org)
		// MIT licence

		var diff = (current_epoch - epoch),
			day_diff = Math.floor(diff / 86400),
			response;
				
		if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
			return ;
				
		response = day_diff === 0 && (
				diff < 10 && "just now" ||
				diff < 60 && Math.floor(diff) + " seconds ago" ||
				diff < 120 && "1 minute ago" ||
				diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
				diff < 7200 && "1 hour ago" ||
				diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
				day_diff == 1 && "Yesterday";

		if(response === undefined || response === false || $.trim(response).length === 0) {
			response = format_epoch_as_wrms_timestamp(epoch);
		}
		return response;
	};

	window.pageload(lifecycle.ready);
}(jQuery));
