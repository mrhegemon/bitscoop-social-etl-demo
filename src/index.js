'use strict';

const BitScoop = require('bitscoop-sdk');

const views = require('./views');


global.env = {
	name: 'BitScoop',
	bitscoop: new BitScoop(process.env.BITSCOOP_API_KEY)
};


exports.handler = function(event, context, callback) {
	let path = event.path;
	let method = event.httpMethod;

	if (path === '/') {
		views.home(event, context, callback);
	}
	else if (path === '/complete-login') {
		views.completeLogin(event, context, callback);
	}
	else if (path === '/complete-service') {
		views.completeService(event, context, callback);
	}
	else if (path === '/connections') {
		if (method === 'GET') {
			views.connections.create(event, context, callback);
		}
		else if (method === 'DELETE') {
			views.connections.delete(event, context, callback);
		}
	}
	else if (path === '/login') {
		views.login(event, context, callback);
	}
	else if (path === '/logout') {
		views.logout(event, context, callback);
	}
	else if (path === '/signup') {
		views.signup(event, context, callback);
	}
	else if (path === '/users') {
		if (method === 'DELETE') {
			views.users.delete(event, context, callback);
		}
		else if (method === 'PATCH') {
			views.users.patch(event, context, callback);
		}
	}
};
