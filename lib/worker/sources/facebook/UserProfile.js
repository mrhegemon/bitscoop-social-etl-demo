'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let nextPageToken, next;

	let api = bitscoop.api(map.id);
	let cursor = api.endpoint(sourceName).method('GET');

	let options = {
		parameters: {},
		headers: {
			'X-Connection-Id': connectionId,
			"X-Populate": "*"
		}
	};

	return cursor(options)
		.then(function(result) {
			let [data, response] = result;

			results = data;

			return Promise.resolve();
		})
		.then(function() {
			return new Promise(function(resolve, reject) {
				s3.putObject({
					Bucket: bucketname,
					Key: user.id + '/' + provider + '/' + sourceName + '/' + moment().utc().format('YYYY-MM-DDThh:mm:sssz'),
					Body: JSON.stringify(results)
				}, function(err, data) {
					if (err) {
						reject(err);
					}
					else {
						resolve(data);
					}
				})
			});
		})
		.catch(function(err) {
			console.log(err);
			return Promise.reject(err);
		})

}


module.exports = call;