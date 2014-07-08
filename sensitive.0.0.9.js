Sensitive = {
	helpers: {},
	views: {},
	section: {},
	last_route: null,
	config: {
		debug: false,
		hash_method: false,
		default_app_outlet: null,
		default_controller: null,
		view_extension: '.tpl',
		source_extension: '.json',
		model_path: null,
		view_path: null,
		controller_path: null,
		refresh_message: "Are you sure you want to leave or refresh this application? Unsaved data will be lost!",
		beforeRouteChange: null,
		afterRouteChange: null,
		loading_element: null
	},
	application: function(settings) {
		Sensitive.app = this;

		if (Sensitive.helpers.type(settings) === 'object') {
			for (i in settings) {
				Sensitive.config[i] = settings[i];
			}
		}

		if (Sensitive.config.hash_method) {
			$(function() {
				var hashchange = function(e) {
					Sensitive.application.prototype.routechange(location.href.split("#")[1]);
				}
				if (!('onhashchange' in window)) {
					var oldHref = location.href;
					setInterval(function() {
						var newHref = location.href;
						if (oldHref !== newHref) {
							oldHref = newHref;
							hashchange.call(window, {
								'type': 'hashchange',
								'newURL': newHref,
								'oldURL': oldHref
							});
						}
					}, 100);
				} else if (window.addEventListener) {
					window.addEventListener("hashchange", hashchange, false);
				} else if (window.attachEvent) {
					window.attachEvent("onhashchange", hashchange);
				}
			});
		} else {
			window.onpopstate = function(event) {
				Sensitive.application.prototype.routechange(document.location.pathname + document.location.search);
			};
		}

		if (Sensitive.config.hash_method) {
			if (location.href.split("#")[1]) {
				Sensitive.application.prototype.routechange(location.href.split("#")[1]);
			} else {
				if (Sensitive.config.default_controller) {
					Sensitive.application.prototype.routechange('/' + Sensitive.config.default_controller);
					window.location.hash = '/' + Sensitive.config.default_controller;
				}
			}
		} else {
			if (document.location.pathname === '/') {
				if (Sensitive.config.default_controller) {
					history.pushState({
						cache: Math.random()
					}, null, Sensitive.config.default_controller);
				}
			} else {
				Sensitive.application.prototype.routechange(document.location.pathname + document.location.search);
			}
		}

		/*if (Sensitive.config.debug === false) {
			window.onbeforeunload = function() {
				return Sensitive.config.refresh_message;
			}
		}*/
	}
};

Sensitive.create = function(id, settings) {
	Sensitive.config.default_app_outlet = $('#' + id + '-outlet');
	return window[id] = new Sensitive.application(settings);
};

Sensitive.application.prototype.routechange = function(route) {

	var fragments = null;
	var controller_name = null;

	var last_fragments = null;
	var last_controller_name = null;

	if (route) {
		fragments = Sensitive.helpers.get_route_data(route);
		if (fragments['controller']) {
			require([Sensitive.helpers.controller_path(fragments['controller'])], function() {

				controller_name = Sensitive.helpers.fix_name(fragments['controller'], 'Controller');

				if (Sensitive.app[controller_name]) {

					if (!Sensitive.app[controller_name].settings.container && Sensitive.config.default_app_outlet) {
						Sensitive.app[controller_name].container(Sensitive.config.default_app_outlet);
					}

					if (Sensitive.helpers.type(Sensitive.config.beforeRouteChange) === 'function') {

						if (Sensitive.last_route) {

							last_fragments = Sensitive.helpers.get_route_data(Sensitive.last_route);
							last_controller_name = Sensitive.helpers.fix_name(last_fragments['controller'], 'Controller');
							Sensitive.config.beforeRouteChange(Sensitive.app[last_controller_name]);
						}
					}

					Sensitive.app[controller_name].routerender(fragments['action'], fragments['parameters'], Sensitive.app[controller_name].settings.routerender);
					Sensitive.last_route = route;
				}

			}, function(err) {
				var failedId = err.requireModules && err.requireModules[0];
				Sensitive.helpers.log('ERROR: Controller "' + failedId + '" not found into controllers path (' + Sensitive.config.controller_path + '). Redirection to default controller "' + Sensitive.config.default_controller + '"');
				if (Sensitive.config.default_controller) {
					window.location.hash = "/" + Sensitive.config.default_controller;
				}
			});
		} else {
			if (Sensitive.helpers.type(Sensitive.config.beforeRouteChange) === 'function') {
				if (Sensitive.last_route) {
					last_fragments = Sensitive.helpers.get_route_data(Sensitive.last_route);
					last_controller_name = Sensitive.helpers.fix_name(last_fragments['controller'], 'Controller');
					Sensitive.config.beforeRouteChange(Sensitive.app[last_controller_name]);
				}
			}
		}
	}
};

Sensitive.application.prototype.Model = function(model_id, reference_id) {
	var self = this,
		settings;

	settings = {},
	reference_id = reference_id || 'id';

	self.id = model_id;

	settings.model = null;
	settings.targets = {};
	settings.trigger = null;

	self.refresh = function() {
		self.change('refresh', null, false, false);
	};

	self.trigger = function(callback) {
		if (Sensitive.helpers.type(callback) === "function") {
			settings.trigger = callback;
		}
	};
	self.change = function(action, data, callback, callchange, rendercontroller) {
		var callchange_final = true;

		if (Sensitive.helpers.type(callchange) === 'boolean') {
			callchange_final = callchange;
		} else if (Sensitive.helpers.type(callchange) === 'function') {
			callback = callchange;
		}

		//callchange = Sensitive.helpers.type(callchange) === 'boolean' ? callchange : true;
		rendercontroller = Sensitive.helpers.type(rendercontroller) === 'boolean' ? rendercontroller : true;

		if (Object.keys(settings.targets).length && rendercontroller) {
			log(settings.targets)
			for (i in settings.targets) {
				settings.targets[i].render();
			}
		}

		if (Sensitive.helpers.type(settings.trigger) === "function" && callchange_final) {
			settings.trigger(action, data, callback);
		}
	};

	self.target = function(controller) {
		if (Sensitive.helpers.type(controller) === "object") {
			settings.targets[controller.id] = controller;
		}
	};

	self.edit = function(data, callchange) {
		var edit_object = null;

		if (Sensitive.helpers.type(data) === "object") {
			if (settings.model[this.id]) {
				for (i in data) {
					if (settings.model[this.id][data[reference_id]][i] !== data[i]) {
						settings.model[this.id][data[reference_id]][i] = data[i];
					}
				}
			} else {
				edit_object = function(self_model, self_data) {
					for (i in self_data) {
						if (Sensitive.helpers.type(self_model[i]) === "object") {
							edit_object(self_model[i], self_data[i]);
						} else if (self_model[i] !== self_data[i]) {
							self_model[i] = self_data[i];
						}
					}
				};
				edit_object(settings.model, data);
			}

			self.change('edit', data, false, callchange);
		}
	};

	self.remove = function(data, callchange) {
		if (data[reference_id]) {
			if (Sensitive.helpers.type(data[reference_id]) === "string" || Sensitive.helpers.type(data[reference_id]) === "number") {
				if (settings.model[this.id]) {
					if (settings.model[this.id][data[reference_id]]) {

						delete settings.model[this.id][data[reference_id]];

						self.change('remove', data, false, callchange);
					}
				}
			}
		}
	};

	self.add = function(data, callchange) {
		if (Sensitive.helpers.type(data) === "object") {
			if (settings.model[this.id]) {
				settings.model[this.id][data[reference_id]] = data;
			}

			self.change('add', data, false, callchange);
		} else if (Sensitive.helpers.type(data) === "array") {
			for (i in data) {
				if (settings.model[this.id]) {
					settings.model[this.id][data[i][reference_id]] = data[i];
				}
			}
			self.change('add', data, false, callchange);
		}
	};

	self.set = function(data, merge) {

		var recurse = function(source, obj) {
			for (i in obj) {
				if (Sensitive.helpers.type(obj[i]) === "object") {
					if (!source[i]) {
						source[i] = {};
					}
					recurse(source[i], obj[i]);
				} else {
					source[i] = obj[i];
				}
			}
		};

		if (merge && settings.model) {

			if (Sensitive.helpers.type(data) === "object") {
				recurse(settings.model, data);
			} else if (Sensitive.helpers.type(data) === "array" && data.length) {
				for (i in data) {
					recurse(settings.model[this.id][data[i][reference_id]], data[i]);
				}
			}

			self.change('set', data, false, false);
		} else {
			if (Sensitive.helpers.type(data) === "object") {
				settings.model = data;
			} else if (Sensitive.helpers.type(data) === "array" && data.length) {
				settings.model = {};
				settings.model[this.id] = {};

				for (i in data) {
					log(data[i])
					settings.model[this.id][data[i][reference_id]] = data[i];
				}
			}
		}

	};

	self.get = function(id) {
		var data = {};

		/*if (Sensitive.helpers.type(settings.trigger) === "function") {
			settings.trigger('get', data, settings);
		}*/

		if (Sensitive.helpers.type(id) === "string" || Sensitive.helpers.type(id) === "number") {

			if (settings.model[this.id]) {
				if (settings.model[this.id][id]) {
					return settings.model[this.id][id];
				}
			}
		} else {
			return settings.model;
			/*if (settings.model && settings.model[this.id]) {
				if (Object.keys(settings.model[this.id]).length) {
					data[this.id] = [];
					for (i in settings.model[this.id]) {
						data[this.id].push(settings.model[this.id][i]);
					}
					return data;
				}
			} else {
				return settings.model;
			}*/
		}
	};

	self.source = function(source, val, callback, data) {
		var type = 'json';
		var merge = Sensitive.helpers.type(val) === "boolean" ? val : false;

		if (Sensitive.helpers.type(val) === "string") {
			type = val;
		}

		if (Sensitive.helpers.type(source) === "string") {

			self.set(Sensitive.helpers.ajax(source, type, data), merge);

			if (Sensitive.helpers.type(callback) === 'function') {
				callback(self);
			}
		} else if (Sensitive.helpers.type(source) === "object" || Sensitive.helpers.type(source) === "array") {

			self.set(source, merge);

			if (Sensitive.helpers.type(callback) === 'function') {
				callback(self);
			}
		}
	};
};

Sensitive.application.prototype.Model.create = function(model_id, reference_id) {
	if (Sensitive.helpers.type(model_id) === "string" || Sensitive.helpers.type(model_id) === "number") {
		var model = new this(model_id, reference_id);
		return Sensitive.app[Sensitive.helpers.fix_name(model.id, 'Model')] = model;
	} else {
		return null;
	}
};

Sensitive.application.prototype.Controller = function(controller_id, setups) {
	var self = this,
		settings = {};

	self.id = controller_id;

	settings.view = Sensitive.helpers.view_path(controller_id, true); //$('#' + controller_id);
	settings.container = '#' + self.id;
	settings.model = null;
	settings.model_id = null;
	settings.scope = null;
	settings.scope_data = {};
	settings.onrender = null;
	settings.render_scope = null;
	settings.routerender = true;
	settings.action = null;
	settings.parameters = null;
	settings.form_has_change = false;
	settings.model_data = null;

	self.settings = settings;

	if (setups) {
		if (Sensitive.helpers.type(setups.routerender) === "boolean") {
			settings.routerender = setups.routerender;
		}
	}

	self.view = function(view) {
		if (view) {
			settings.view = Sensitive.helpers.view_path(view, true);
		} else {
			settings.view = null;
		}
	};

	self.container = function(target) {
		if (target === 'modal' || Sensitive.helpers.type(target) === "object") {
			settings.container = target;
		} else if (Sensitive.helpers.type(target) === "string" && $(target).length) {
			settings.container = $(target);
		}
	};

	self.data = function(model, data_id, model_data) {

		if (data_id) {
			settings.model_id = data_id;
		}

		if (model_data && (Sensitive.helpers.type(model_data) === "array" || Sensitive.helpers.type(model_data) === "object")) {
			settings.model_data = model_data;
		}

		if (Sensitive.helpers.type(model) === "object" && model['target']) {
			settings.model = model;
			settings.model.target(self);
		} else {
			settings.model = model;
		}
	};

	self.get_data = function(model_id, callback) {
		require([Sensitive.helpers.model_path(model_id)], function() {
			var model_name = Sensitive.helpers.fix_name(model_id, 'Model');

			settings.model = Sensitive.app[model_name];

			if (settings.model_data) {
				settings.model.set(settings.model_data, false);
			}

			settings.model.target(self);

			callback();

		}, function(err) {
			Sensitive.helpers.log('WARNING: Model "' + model + '" not found into model path (' + Sensitive.config.model_path + ')');
		});
	};

	self.scope = function(scope) {
		if (Sensitive.helpers.type(scope) === "function") {
			settings.scope = scope;
		}
	};

	self.onrender = function(onrender) {
		if (Sensitive.helpers.type(settings.onrender) !== "function" && onrender) {
			settings.onrender = onrender;
		}
	};

	self.routerender = function(action, parameters, routerender) {
		/*if (!Sensitive.app[Sensitive.helpers.fix_name(controller_id, 'Model')]) {
			require([Sensitive.helpers.model_path(controller_id)], function() {
				if (Sensitive.app[Sensitive.helpers.fix_name(controller_id, 'Model')]) {
					self.data(Sensitive.app[Sensitive.helpers.fix_name(controller_id, 'Model')]);
				}
				self.render(null, action, parameters, routerender);
			}, function() {
				self.render(null, action, parameters, routerender);
				Sensitive.helpers.log('WARNING: Model "' + controller_id + '" not found into model path (' + Sensitive.config.model_path + ')');
			});
		} else {
			self.render(null, action, parameters, routerender);
		}*/
		self.render(null, action, parameters, routerender);
	};

	self.render = function(onrender, action, parameters, routerender) {

		var data = {};
		var scope_data = {};
		var view = null;
		var scope = null;

		var fn_render = function() {

			if (Sensitive.helpers.type(parameters) === 'object') {
				settings.scope_data = {};
				for (i in parameters) {
					settings.scope_data[i] = parameters[i];
				}
			}

			if (Sensitive.helpers.type(settings.scope) === "function") {
				settings.render_scope = new settings.scope(settings.scope_data, settings.model, settings.container);
			}

			if (data && Object.keys(data).length) {
				for (i in settings.scope_data) {
					data[i] = settings.scope_data[i];
				}
			} else {
				data = settings.scope_data;
			}

			Sensitive.helpers.log(data, 'RENDER-DATA: ' + self.id);

			if (routerender !== false) {

				if (settings.container === 'modal' || settings.container.length) {
					if (settings.view) {
						view = Handlebars.compile(Sensitive.views[settings.view]);
						view = $(view(data));

						view.find('form').andSelf().change(function() {
							settings.form_has_change = true;
						});

						view.find('a[href^="/"]').unbind('click').bind('click', function(event) {

							if (Sensitive.config.hash_method) {
								window.location.hash = $(this).attr('href');
							} else {
								history.pushState({
									cache: Math.random()
								}, null, $(this).attr('href'));

								window.onpopstate();
							}

							return false;
						});

						if (Sensitive.helpers.type(settings.container) === "object") {
							settings.container.html(view);
						}

						if (settings.render_scope) {
							if (action) {
								if (settings.render_scope[action]) {
									settings.render_scope[action](data, view);
								} else {
									Sensitive.helpers.log('WARNING: Action "' + action + '" is not defined within "scope"!');
								}
							} else {
								view.find('*').andSelf().each(function() {
									var element = $(this);
									$.each(this.attributes, function() {
										if (this.name.indexOf('s-action-') > -1) {

											var p = {
												element: element,
												bind: this.name.replace(/s-action-/g, ''),
												action: this.value
											};
											p.element.unbind(p.bind).bind(p.bind, function(e) {
												e.preventDefault();

												if (jQuery.type(settings.render_scope[p.action]) === 'function') {
													var s_data = {};

													$.each(this.attributes, function() {
														if (this.name.indexOf('s-data-') > -1) {
															var key = this.name.replace(/s-data-/g, '');
															s_data[key] = this.value;
														}
													});

													//if (s_data && Object.keys(s_data).length) {
													//$.extend(true, data, s_data);
													//}

													settings.render_scope[p.action](s_data, $(this), data);
												}
											});
										}
									});
								});
							}
						}
					}
				} else if (!settings.container.length) {
					Sensitive.helpers.log('WARNING: Container not available for controller "' + self.id + '"');
				}

				if (Sensitive.helpers.type(settings.onrender) === "function") {
					settings.onrender((view ? view : settings.container), data, settings.model);
				} else if (Sensitive.helpers.type(onrender) === "function") {
					onrender((view ? view : settings.container), data, settings.model);
				}

			} else {
				//settings.routerender = true;

				if (Sensitive.helpers.type(settings.scope) === "function") {
					settings.render_scope = new settings.scope(settings.scope_data, settings.model, settings.container);

					if (action) {
						if (settings.render_scope[action]) {
							settings.render_scope[action]({}, view, data);
						} else {
							Sensitive.helpers.log('WARNING: Action "' + action + '" is not defined within "scope"!');
						}
					}
				}
			}
		}


		if (Sensitive.helpers.type(settings.onrender) !== "function" && Sensitive.helpers.type(onrender) === 'function') {
			settings.onrender = onrender;
		}

		if (!Sensitive.views[settings.view]) {
			if (Sensitive.helpers.type(settings.view) === "object") {
				Sensitive.views[settings.view] = $(settings.view).html();
			} else {
				Sensitive.views[settings.view] = Sensitive.helpers.ajax(settings.view);
			}
		}

		if (settings.model && settings.model['get']) {
			data = settings.model.get(settings.model_id);
			fn_render();
		} else if (Sensitive.helpers.type(settings.model) === "string") {
			self.get_data(settings.model, function() {
				data = settings.model.get(settings.model_id);
				fn_render();
			});
		} else {
			fn_render();
		}
	};
};

Sensitive.application.prototype.Controller.create = function(controller_id, settings) {
	if (Sensitive.helpers.type(controller_id) === "string" || Sensitive.helpers.type(controller_id) === "number") {
		var controller = new this(controller_id, settings);
		return Sensitive.app[Sensitive.helpers.fix_name(controller.id, 'Controller')] = controller;
	} else {
		return null;
	}
};

Sensitive.application.prototype.Controller.get = function(controller_id) {
	if (Sensitive.helpers.type(controller_id) === "string" || Sensitive.helpers.type(controller_id) === "number") {
		if (Sensitive.app[Sensitive.helpers.fix_name(controller_id, 'Controller')]) {
			return Sensitive.app[Sensitive.helpers.fix_name(controller_id, 'Controller')];
		} else {
			return null;
		}
	} else {
		return null;
	}
};

Sensitive.application.prototype.Section = function() {
	this.set = function(id, data) {
		Sensitive.app[id] = data
		return this.get(id);
	}
	this.get = function(id, data) {
		return Sensitive.app[id];
	}

	return new this();
};

// HERPERS
Sensitive.helpers.log = function(value, from) {
	if (Sensitive.config.debug) {
		if (console && Sensitive.helpers.type(console) === 'object') {
			console.log('-- SENSITIVE LOG --------------------------------');
			console.log(from);
			console.log(value);
			console.log('-------------------------------------------------');
		}
	}
};

Sensitive.helpers.get_route_data = function(route) {

	var final_route = route;
	var routename;
	var fragments = {};
	var parameters;
	var count_vars = 2;
	var parameters;
	var route_query;
	var url_fragments;

	fragments['controller'] = null;
	fragments['action'] = null;
	fragments['parameters'] = null;

	if (final_route.indexOf('?') !== -1) {
		url_fragments = final_route.split('?');
		final_route = url_fragments[0];
		route_query = url_fragments[1];

		if (route_query.indexOf('&') !== -1) {
			route_query = route_query.split('&').join('/');
		}
		if (route_query.indexOf('=') !== -1) {
			route_query = route_query.split('=').join('/');
		}
		final_route = final_route + '//' + route_query
	}

	routename = final_route.split('/');
	routename.splice(0, 1);

	if (routename[0]) {
		fragments['controller'] = routename[0];
	}

	if (routename[1]) {
		fragments['action'] = routename[1];
	}

	if (routename[2]) {
		fragments['parameters'] = [];
		parameters = {};

		while (routename[count_vars]) {
			parameters[routename[count_vars]] = routename[count_vars + 1];
			count_vars = count_vars + 2;
		}

		fragments['parameters'] = parameters;
	}

	return fragments;
};

Sensitive.helpers.ajax = function(url, type, data, callback) {

	if (url) {

		if (Sensitive.helpers.type(Sensitive.config.loading_element) === 'object' && Sensitive.config.loading_element.length) {
			Sensitive.config.loading_element.addClass('started');
		}

		var response = null;
		var options = {
			url: url,
			async: false,
			cache: false,
			success: function(data) {
				response = data;
				if (Sensitive.helpers.type(callback) === 'function') {
					callback(response);
				}

				if (Sensitive.helpers.type(Sensitive.config.loading_element) === 'object' && Sensitive.config.loading_element.length) {
					Sensitive.config.loading_element.removeClass('started');
				}
			},
			error: function(a, b, c) {
				console.log(a);
				console.log(b);
				console.log(c);
			}
		};

		if (type === 'json') {
			options.DataType = "json";
		} else if (type === 'jsonp') {
			options.DataType = "JSONP";
			options.jsonp = "callback";
		}

		if (data && Sensitive.helpers.type(data) === 'object') {
			options.type = 'post';
			options.data = data;
		}

		$.ajax(options);
		return response;
	}
};

Sensitive.helpers.fix_name = function(string, suffix) {
	var final_name = string.replace(/ |\./g, '-').replace(/(^|\-)([a-z])/g, function(m, p1, p2) {
		return p1 + p2.toUpperCase();
	}).replace(/-/g, '');
	return final_name + suffix;
};

Sensitive.helpers.scape_string = function(string) {
	return string.replace(/-/g, '_');
};

Sensitive.helpers.scape_url = function(url) {
	var final_url = url;
	while (final_url.indexOf('//') !== -1) {
		final_url = final_url.replace(/\/\//g, '/');
	}
	return final_url;
};

Sensitive.helpers.type = function(element) {
	return $.type(element);
};

Sensitive.helpers.model_path = function(source, extension) {
	var final_model_path = null;

	if (Sensitive.config.model_path) {
		final_model_path = Sensitive.config.model_path + '/' + source + (extension ? Sensitive.config.source_extension : '');
	} else {
		final_model_path = source + (extension ? Sensitive.config.source_extension : '');
	}

	return Sensitive.helpers.scape_url(final_model_path);
};

Sensitive.helpers.view_path = function(view, extension) {
	var final_view_path = null;

	if (Sensitive.config.view_path) {
		final_view_path = Sensitive.config.view_path + '/' + view + (extension ? Sensitive.config.view_extension : '');
	} else {
		final_view_path = view + (extension ? Sensitive.config.view_extension : '');
	}

	return Sensitive.helpers.scape_url(final_view_path);
};

Sensitive.helpers.controller_path = function(controller, extension) {
	var final_controller_path = null;

	if (Sensitive.config.controller_path) {
		final_controller_path = Sensitive.config.controller_path + '/' + controller + (extension ? Sensitive.config.controller_extension : '');
	} else {
		final_controller_path = controller + (extension ? Sensitive.config.source_extension : '');
	}

	return Sensitive.helpers.scape_url(final_controller_path);
};