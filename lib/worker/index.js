'use strict';

const assert = require('assert');

const AWS = require('aws-sdk');
const BitScoop = require('bitscoop-sdk');
const Sequelize = require('sequelize');
const _ = require('lodash');
const moment = require('moment');

const sources = require('./sources');


let s3 = new AWS.S3();
let bucketname = 'brix-bitscoop-data';


exports.handler = function(event, context, callback) {
	let bitscoop;
	let connection, map, sequelize, users;

	let connectionId = event.connectionId;
	let provider = event.provider;
	let userId = event.userId;

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
				googleCalendarSyncToken: {
					type: Sequelize.STRING,
					field: 'google_calendar_sync_token'
				},
				googleDrivePageToken: {
					type: Sequelize.STRING,
					field: 'google_drive_page_token'
				},
				googleMailQuery: {
					type: Sequelize.STRING,
					field: 'google_mail_query'
				},
				linkedinConnectionId: {
					type: Sequelize.STRING,
					field: 'linkedin_connection_id'
				},
				redditConnectionId: {
					type: Sequelize.STRING,
					field: 'reddit_connection_id'
				},
				twitterConnectionId: {
					type: Sequelize.STRING,
					field: 'twitter_connection_id'
				},
				twitterTweetsSinceId: {
					type: Sequelize.STRING,
					field: 'twitter_tweets_since_id'
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

			bitscoop = new BitScoop(process.env.BITSCOOP_API_KEY);

			return bitscoop.getConnection(connectionId);
		})
		.then(function(result) {
			connection = result;

			return bitscoop.getMap(connection.map_id)
		})
		.then(function(result) {
			map = result;

			return users.findOne({
				where: {
					id: userId
				}
			})
		})
		.then(function(user) {
			let promises = [];

			console.log(provider);
			_.each(sources[provider], function(source, name) {
				console.log(name);
				promises.push(source(user, users, provider, name, connectionId, bitscoop, map, sequelize, bucketname, s3, {}, []));
			});

			return Promise.all(promises);
		})
		.then(function() {
			console.log('SUCCESSFUL');

			return Promise.resolve();
		})
		.catch(function(err) {
			console.log(err);
			console.log('UNSUCCESSFUL');

			return Promise.reject(err);
		});
};
