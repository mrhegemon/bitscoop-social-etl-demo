'use strict';

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let nextPageToken;
	let perPage = 100;

	let api = bitscoop.api(map.id);
	let cursor = api.endpoint(sourceName).method('GET');
	let cursorRaw = api.endpoint(sourceName + 'Raw').method('GET');

	let options = {
		parameters: {
			max_results: perPage
		},
		headers: {
			'X-Connection-Id': connectionId,
			"X-Populate": "*"
		}
	};

	if (user.googleMailQuery != null) {
		options.parameters.q = user.googleMailQuery;
	}

	if (pagination.pageToken) {
		options.parameters.page_token = pagination.pageToken
	}

	return Promise.all([
		cursor(options),
		cursorRaw(options)
	])
		.then(function(combinedResults) {
			let [result, rawResult] = combinedResults;

			let [data, response] = result;
			let [dataRaw, responseRaw] = rawResult;

			if (results == null) {
				results = [];
			}

			results = results.concat(data);

			nextPageToken = dataRaw.nextPageToken;

			return Promise.resolve();
		})
		.then(function() {
			if (nextPageToken != null) {
				return call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, {
					pageToken: nextPageToken
				}, results);
			}
			else {
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
				})
					.then(function() {
						return users.update(
							{
								googleMailQuery: 'after:' + moment().utc().format('YYYY/MM/DD')
							},
							{
								where: {
									id: user.id
								}
							});
					});
			}
		})
		.catch(function(err) {
			console.log(err);
			return Promise.reject(err);
		})

}


module.exports = call;