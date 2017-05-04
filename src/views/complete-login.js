'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');
const moment = require('moment');
const uuid = require('uuid');


module.exports = function(event, context, callback) {
	let associationSessions, filter, promise, sequelize, sessions, users;

	let cookies = _.get(event, 'headers.Cookie', '');
	let associationId = cookie.parse(cookies).brix_session_id;

	let query = event.queryStringParameters || {};
	let type = query.type;

	if (!associationId || (type !== 'signup' && type !== 'login')) {
		callback(null, {
			statusCode: 404,
			body: JSON.stringify({
				sessionId: associationId,
				type: type,
				event: event,
				cookies: cookies
			})
		});
	}
	else {
		promise = Promise.resolve()
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

				return Promise.all([
					require('../models/sql/association-sessions')(sequelize),
					require('../models/sql/sessions')(sequelize),
					require('../models/sql/users')(sequelize)
				])
					.then(function(models) {
						[associationSessions, sessions, users] = models;

						return Promise.resolve();
					});
			})
			.then(function() {
				filter = {
					where: {
						token: associationId,
						connectionId: query.connection_id
					}
				};

				return associationSessions.count(filter)
					.then(function(n) {
						if (n === 0) {
							return Promise.reject(new Error('Invalid association session or association session timeout'));
						}

						let bitscoop = global.env.bitscoop;

						return Promise.all([
							associationSessions.destroy(filter),

							bitscoop.getConnection(query.existing_connection_id || query.connection_id)
						]);
					});
			})
			.then(function(result) {
				let [, connection] = result;

				if (connection == null) {
					return Promise.reject(new Error('Invalid connection'));
				}

				if (!_.get(connection, 'auth.status.authorized', false)) {
					return Promise.reject(new Error('Connection is not authorized. In order to use this account you must grant the requested permissions.'));
				}

				return Promise.resolve(connection);
			});

		if (type === 'login') {
			promise = promise
				.then(function(connection) {
					return users.find({
						where: {
							accountConnectionId: connection.id
						}
					});
				});
		}
		else if (type === 'signup') {
			promise = promise
				.then(function(connection) {
					return users.count({
						where: {
							accountConnectionId: connection.id
						}
					})
						.then(function(n) {
							if (n > 0) {
								return Promise.reject(new Error('It looks like you\'ve already associated this account with BitScoop. Try logging in with it instead.'));
							}

							return Promise.resolve(connection);
						});
				});

			promise = promise
				.then(function(connection) {
					let email, promise;

					let user = {
						accountConnectionId: connection.id,
						joined: moment.utc().toDate()
					};

					user.googleId = connection.metadata.id;

					if (connection.metadata.email) {
						email = connection.metadata.email;
					}

					if (email) {
						promise = users.count({
							where: {
								upperEmail: email.toUpperCase()
							}
						});
					}
					else {
						promise = Promise.resolve(0);
					}

					return promise
						.then(function(n) {
							if (email) {
								if (n === 0) {
									user.email = email;
									user.upperEmail = email.toUpperCase();
								}
							}

							return users.create(user);
						});
				});
		}

		promise = promise
			.then(function(user) {
				if (!user) {
					return Promise.reject(new Error('Not Found'));
				}

				return sessions.create({
					user: user.id,
					token: uuid().replace(/-/g, '')
				});
			});

		promise
			.then(function(session) {
				sequelize.close();

				let domainRegex = /^https:\/\/([\w.-]+)/g;
				let match = domainRegex.exec(process.env.SITE_URL);
				let siteDomain = match[1];

				let cookieString = 'brix_session_id=' + session.token + '; domain=' + siteDomain + '; expires=' + 0 + '; secure=true; http_only=true';

				callback(null, {
					statusCode: 302,
					headers: {
						'Set-Cookie': cookieString,
						Location: '/prod'
					}
				});

				return Promise.resolve();
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
	}
};
