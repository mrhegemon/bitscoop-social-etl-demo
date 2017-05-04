'use strict';

const assert = require('assert');

const AWS = require('aws-sdk');
const _ = require('lodash');
const moment = require('moment');
const Sequelize = require('sequelize');

let lambda = new AWS.Lambda;


exports.handler = function() {
	let dateNow = moment().utc().format('YYYY-MM-DD');
	let sequelize, users;

	return Promise.resolve()
		.then(function() {
			try {
				assert(process.env.BITSCOOP_API_KEY != null, 'Unspecified BitScoop API key.');
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

			users = sequelize.define('user', {
				id: {
					type: Sequelize.INTEGER,
					primaryKey: true,
					autoIncrement: true
				},
				username: {
					type: Sequelize.STRING
				},
				googleId: {
					type: Sequelize.STRING,
					field: 'google_id'
				},
				dribbbleConnectionId: {
					type: Sequelize.STRING,
					field: 'dribbble_connection_id'
				},
				facebookConnectionId: {
					type: Sequelize.STRING,
					field: 'facebook_connection_id'
				},
				githubConnectionId: {
					type: Sequelize.STRING,
					field: 'github_connection_id'
				},
				googleConnectionId: {
					type: Sequelize.STRING,
					field: 'google_connection_id'
				},
				linkedinConnectionId: {
					type: Sequelize.STRING,
					field: 'linkedin_connection_id'
				},
				twitterConnectionId: {
					type: Sequelize.STRING,
					field: 'twitter_connection_id'
				},
				email: {
					type: Sequelize.STRING
				},
				upperEmail: {
					type: Sequelize.STRING,
					field: '_upper_email'
				},
				joined: {
					type: Sequelize.DATE
				},
				accountConnectionId: {
					type: Sequelize.STRING,
					field: 'account_connection_id'
				}
			}, {
				timestamps: false
			});

			return users.sync()
				.then(function() {
					return users.findAll();
				});
		})
		.then(function(users) {
			let promises = [];

			_.each(users, function(userResult) {
				let user = userResult.dataValues;

				if (user.dribbbleConnectionId != null) {
					let params = {
						FunctionName: process.env.WORKER_FUNCTION_ARN,
						InvocationType: 'Event',
						Payload: JSON.stringify({
							connectionId: user.dribbbleConnectionId,
							provider: 'dribbble',
							userId: user.id
						})
					};

					promises.push(
						new Promise(function(resolve, reject) {
							console.log('Invoking Lambda worker for Dribbble');

							lambda.invoke(params, function (err, data) {
								if (err) {
									reject(err);
								}
								else {
									resolve(data);
								}
							});
						})
					)
				}

				if (user.facebookConnectionId != null) {
					let params = {
						FunctionName: process.env.WORKER_FUNCTION_ARN,
						InvocationType: 'Event',
						Payload: JSON.stringify({
							connectionId: user.facebookConnectionId,
							provider: 'facebook',
							userId: user.id
						})
					};

					promises.push(
						new Promise(function(resolve, reject) {
							console.log('Invoking Lambda worker for Facebook');

							lambda.invoke(params, function (err, data) {
								if (err) {
									reject(err);
								}
								else {
									resolve(data);
								}
							});
						})
					)
				}

				if (user.githubConnectionId != null) {
					let params = {
						FunctionName: process.env.WORKER_FUNCTION_ARN,
						InvocationType: 'Event',
						Payload: JSON.stringify({
							connectionId: user.githubConnectionId,
							provider: 'github',
							userId: user.id
						})
					};

					promises.push(
						new Promise(function(resolve, reject) {
							console.log('Invoking Lambda worker for GitHub');

							lambda.invoke(params, function (err, data) {
								if (err) {
									reject(err);
								}
								else {
									resolve(data);
								}
							});
						})
					)
				}

				if (user.googleConnectionId != null) {
					let params = {
						FunctionName: process.env.WORKER_FUNCTION_ARN,
						InvocationType: 'Event',
						Payload: JSON.stringify({
							connectionId: user.googleConnectionId,
							provider: 'google',
							userId: user.id
						})
					};

					promises.push(
						new Promise(function(resolve, reject) {
							console.log('Invoking Lambda worker for Google');

							lambda.invoke(params, function (err, data) {
								if (err) {
									reject(err);
								}
								else {
									resolve(data);
								}
							});
						})
					)
				}

				if (user.linkedinConnectionId != null) {
					let params = {
						FunctionName: process.env.WORKER_FUNCTION_ARN,
						InvocationType: 'Event',
						Payload: JSON.stringify({
							connectionId: user.linkedinConnectionId,
							provider: 'linkedin',
							userId: user.id
						})
					};

					promises.push(
						new Promise(function(resolve, reject) {
							console.log('Invoking Lambda worker for LinkedIn');

							lambda.invoke(params, function (err, data) {
								if (err) {
									reject(err);
								}
								else {
									resolve(data);
								}
							});
						})
					)
				}

				if (user.twitterConnectionId != null) {
					let params = {
						FunctionName: process.env.WORKER_FUNCTION_ARN,
						InvocationType: 'Event',
						Payload: JSON.stringify({
							connectionId: user.twitterConnectionId,
							provider: 'twitter',
							userId: user.id
						})
					};

					promises.push(
						new Promise(function(resolve, reject) {
							console.log('Invoking Lambda worker for Twitter');

							lambda.invoke(params, function (err, data) {
								if (err) {
									reject(err);
								}
								else {
									resolve(data);
								}
							});
						})
					)
				}
			});

			return Promise.all(promises);
		})
		.then(function() {
			console.log('SUCCESSFUL');
			sequelize.close();

			return Promise.resolve();
		})
		.catch(function(err) {
			console.log('UNSUCCESSFUL');

			if (sequelize) {
				sequelize.close();
			}

			return Promise.reject(err);
		});
};
