'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');

const authenticate = require('../middleware/authentication');


function del(event, context, callback) {
	let sequelize, user, users;

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

			if (!user) {
				return Promise.reject(new Error('Not Found'));
			}

			let bitscoop = global.env.bitscoop;

			let promises = [
				bitscoop.deleteConnection(user.accountConnectionId)
			];

			if (result.googleAnalyticsConnectionId) {
				promises.push(bitscoop.deleteConnection(user.googleAnalyticsConnectionId));
			}

			return Promise.all(promises);
		})
		.then(function() {
			return users.destroy({
				where: {
					id: user.id
				}
			});
		})
		.then(function() {
			sequelize.close();

			var response = {
				statusCode: 200
			};

			callback(null, response);

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


function patch(event, context, callback) {
	let sequelize, users;
	let updateData = JSON.parse(event.body);

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
			let [, user] = result;

			if (!user) {
				return Promise.reject(new Error('Not Found'));
			}

			return users.update(updateData, {
				where: {
					id: user.id
				}
			});
		})
		.then(function() {
			sequelize.close();

			var response = {
				statusCode: 200
			};

			callback(null, response);

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


module.exports = {
	delete: del,
	patch: patch
};
