'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');


module.exports = function(event, context, callback) {
	let sequelize, sessions;

	let cookies = _.get(event, 'headers.Cookie', '');
	let sessionId = cookie.parse(cookies).brix_session_id;

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

			return require('../models/sql/sessions')(sequelize)
				.then(function(model) {
					sessions = model;

					return Promise.resolve();
				});
		})
		.then(function() {
			return sessions.sync()
				.then(function() {
					return sessions.destroy({
						where: {
							token: sessionId
						}
					});
				});
		})
		.then(function() {
			sequelize.close();

			let domainRegex = /^https:\/\/([\w.-]+)/g;
			let match = domainRegex.exec(process.env.SITE_URL);
			let siteDomain = match[1];

			let cookieString = 'brix_session_id=; domain=' + siteDomain + '; expires=' + 0 + '; secure=true; http_only=true';

			var response = {
				statusCode: 302,
				headers: {
					'Set-Cookie' : cookieString,
					Location: '/prod'
				}
			};

			callback(null, response);
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
