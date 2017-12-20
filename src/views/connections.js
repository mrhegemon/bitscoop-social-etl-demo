'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');

const authenticate = require('../middleware/authentication');


function create(event, context, callback) {
	let connectionId, sequelize, user, users;

	let query = event.queryStringParameters || {};
	let service = query.service;

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

			return require('../models/sql/users')(sequelize)
				.then(function(model) {
					users = model;

					return Promise.resolve();
				});
		})
		.then(function() {
			let cookies = _.get(event, 'headers.Cookie', '');
			let sessionId = cookie.parse(cookies).brix_session_id;

			return authenticate(sequelize, sessionId);
		})
		.then(function(result) {
			let mapId;

			let options = {
				redirect_url: process.env.SITE_URL + '/complete-service'
			};

			[, user] = result;

			switch(service) {
				case 'dribbble':
					mapId = process.env.DRIBBBLE_MAP_ID;
					options.redirect_url += '?service=dribbble';
					connectionId = 'dribbbleConnectionId';
					break;

				case 'facebook':
					mapId = process.env.FACEBOOK_MAP_ID;
					options.redirect_url += '?service=facebook';
					connectionId = 'facebookConnectionId';
					break;

				case 'github':
					mapId = process.env.GITHUB_MAP_ID;
					options.redirect_url += '?service=github';
					connectionId = 'githubConnectionId';
					break;

				case 'google':
					mapId = process.env.GOOGLE_MAP_ID;
					options.redirect_url += '?service=google';
					connectionId = 'googleConnectionId';
					break;

				case 'linkedin':
					mapId = process.env.LINKEDIN_MAP_ID;
					options.redirect_url += '?service=linkedin';
					connectionId = 'linkedinConnectionId';
					break;

				case 'reddit':
					mapId = process.env.REDDIT_MAP_ID;
					options.redirect_url += '?service=reddit';
					connectionId = 'redditConnectionId';
					break;

				case 'twitter':
					mapId = process.env.TWITTER_MAP_ID;
					options.redirect_url += '?service=twitter';
					connectionId = 'twitterConnectionId';
					break;
			}

			let bitscoop = global.env.bitscoop;

			return bitscoop.createConnection(mapId, options);
		})
		.then(function(result) {
			let options = {
				[connectionId]: result.id
			};

			return users.update(options, {
				where: {
					id: user.id
				}
			})
				.then(function() {
					sequelize.close();

					callback(null, {
						statusCode: 302,
						headers: {
							Location: result.redirectUrl
						}
					});
				});
		})
		.catch(function(err) {
			if (sequelize) {
				sequelize.close();
			}

			console.log(err);

			callback(null, {
				statusCode: 500,
				body: err.toString()
			});

			return Promise.reject(err);
		});
}



function del(event, context, callback) {
	let connectionId, sequelize, user, users;
	let options = {};

	let query = event.queryStringParameters || {};
	let service = query.service;

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

			return require('../models/sql/users')(sequelize)
				.then(function(model) {
					users = model;

					return Promise.resolve();
				});
		})
		.then(function() {
			let cookies = _.get(event, 'headers.Cookie', '');
			let sessionId = cookie.parse(cookies).brix_session_id;

			return authenticate(sequelize, sessionId);
		})
		.then(function(result) {
			[, user] = result;

			return users.findOne({
				where: {
					id: user.id
				}
			});
		})
		.then(function(result) {
			let bitscoop = global.env.bitscoop;

			switch(service) {
				case 'dribbble':
					connectionId = result.dribbbleConnectionId;
					options.dribbbleConnectionId = null;
					break;

				case 'facebook':
					connectionId = result.facebookConnectionId;
					options.facebookConnectionId = null;
					break;

				case 'github':
					connectionId = result.githubConnectionId;
					options.githubConnectionId = null;
					break;

				case 'google':
					connectionId = result.googleConnectionId;
					options.googleConnectionId = null;
					break;

				case 'linkedin':
					connectionId = result.linkedinConnectionId;
					options.linkedinConnectionId = null;
					break;

				case 'reddit':
					connectionId = result.redditConnectionId;
					options.redditConnectionId = null;
					break;

				case 'twitter':
					connectionId = result.twitterConnectionId;
					options.twitterConnectionId = null;
					break;

			}

			return bitscoop.deleteConnection(connectionId);
		})
		.then(function() {
			return users.update(options, {
				where: {
					id: user.id
				}
			});
		})
		.then(function() {
			sequelize.close();

			callback(null, {
				statusCode: 204
			});
		})
		.catch(function(err) {
			if (sequelize) {
				sequelize.close();
			}

			console.log(err);

			return Promise.resolve();
		});
}


module.exports = {
	create: create,
	delete: del
};
