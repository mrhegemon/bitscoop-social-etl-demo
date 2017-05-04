'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const moment = require('moment');
const uuid = require('uuid');


module.exports = function(event, context, callback) {
	let associationSessions, sequelize;

	return Promise.resolve()
		.then(function() {
			try {
				assert(process.env.HOST != null, 'Unspecified RDS host.');
				assert(process.env.PORT != null, 'Unspecified RDS port.');
				assert(process.env.USER != null, 'Unspecified RDS user.');
				assert(process.env.PASSWORD != null, 'Unspecified RDS password.');
				assert(process.env.DATABASE != null, 'Unspecified RDS database.');
			} catch(err) {
				return Promise.reject(err);
			}

			sequelize = new Sequelize(process.env.DATABASE, process.env.USER, process.env.PASSWORD, {
				host: process.env.HOST,
				port: process.env.PORT,
				dialect: 'mysql',
				logging: false
			});

			return require('../models/sql/association-sessions')(sequelize)
				.then(function(model) {
					associationSessions = model;

					return Promise.resolve();
				});
		})
		.then(function() {
			let mapId = process.env.GOOGLE_SIGN_IN_MAP_ID;

			//Create a Connection using the appropriate Map ID.
			//This will return an object containing the Connection ID and a redirect URL that you need to redirect the user to
			//so that they can authorize your app to access their information.
			//The redirect URL specified in the Map can be overridden by passing one in the body when creating the Connection.
			//In this demo, this is useful for setting the 'type' parameter based on whether the user is signing up or logging in,
			//which changes how the login completion logic should function.
			let bitscoop = global.env.bitscoop;

			return bitscoop.createConnection(mapId, {
				redirect_url: process.env.SITE_URL + '/complete-login?type=signup'
			});
		})
		.then(function(result) {
			let connectionId = result.id;
			let redirectUrl = result.redirectUrl;

			let token = uuid().replace(/-/g, '');
			let expiration = moment.utc().add(30, 'seconds').toDate();

			let domainRegex = /^https:\/\/([\w.-]+)/g;
			let match = domainRegex.exec(process.env.SITE_URL);
			let siteDomain = match[1];

			let cookieString = 'brix_session_id=' + token + '; domain=' + siteDomain + '; expires=' + expiration + '; secure=true; http_only=true';

			return associationSessions.create({
				token: token,
				connectionId: connectionId
			})
				.then(function() {
					sequelize.close();

					var response = {
						statusCode: 302,
						headers: {
							'Set-Cookie' : cookieString,
							Location: redirectUrl
						}
					};

					callback(null, response);
				});
		})
		.catch(function(err) {
			if (sequelize) {
				sequelize.close();
			}

			console.log(err);

			callback(null, {
				statusCode: 404,
				body: err.toString()
			});

			return Promise.reject(err);
		});
};
