'use strict';

const assert = require('assert');

const AWS = require('aws-sdk');
const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const moment = require('moment');

let s3 = new AWS.S3();
let bucketname = 'brix-bitscoop-data';

let sources = {
	dribbble: [
		'AuthenticatedUserLikes',
		'AuthenticatedUserProjects',
		'AuthenticatedUserShots'
	],
	facebook: [
		'UserProfile',
		'UserFeed',
		'UserBusinessActivities',
		'UserOutbox',
		'UserConversations'
	],
	github: [
		'Events'
	],
	google: [
		'GmailInbox',
		'DriveChanges',
		'CalendarList'
	],
	twitter: [
		'Tweets'
	]
};


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
			} catch(err) {
				return Promise.reject(err);
			}

			bitscoop = new BitScoop(process.env.BITSCOOP_API_KEY);

			return bitscoop.getConnection(connectionId)
		})
		.then(function(result) {
			connection = result;

			return bitscoop.getMap(connection.map_id)
		})
		.then(function(result) {
			map = result;

			return Promise.resolve();
		})
		.then(function() {
			let promises = [];
			let api = bitscoop.api(map.id);

			_.each(sources[provider], function(name) {
				let cursor = api.endpoint(name).method('GET');

				promises.push(
					cursor({
						headers: {
							'X-Connection-Id': connectionId,
							"X-Populate": "*"
						}
					})
						.then(function(result) {
							let [data, response] = result;

							return Promise.resolve({
								endpoint: name,
								data: data
							})
						})
				)
			});

			return Promise.all(promises);
		})
		.then(function(results) {
			let promises = [];

			_.each(results, function(result) {
				promises.push(
					new Promise(function(resolve, reject) {
						s3.putObject({
							Bucket: bucketname,
							Key: userId + '/' + provider + '/' + result.endpoint + '/' + moment().utc().format('YYYY-MM-DD'),
							Body: JSON.stringify(result.data)
						}, function(err, data) {
							if (err) {
								reject(err);
							}
							else {
								resolve(data)
							}
						})
					})
				)
			})

			return Promise.all(promises);
		})
		.then(function() {
			console.log('SUCCESSFUL');

			return Promise.resolve();
		})
		.catch(function(err) {
			console.log('UNSUCCESSFUL');

			return Promise.reject(err);
		});
};
