'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let after;
	let perPage = 100;

	let api = bitscoop.api(map.id);
	let cursor = api.endpoint(sourceName).method('GET');
	let cursorRaw = api.endpoint(sourceName + 'Raw').method('GET');

	let options = {
		parameters: {
			limit: perPage
		},
		headers: {
			'X-Connection-Id': connectionId,
			"X-Populate": "*"
		}
	};

	if (pagination.after) {
		options.parameters.after = pagination.after;
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

			after = dataRaw.data.after;

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (after != null) {
				return call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, {
					after: after
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
				});
			}
		})
		.catch(function(err) {
			console.log(err);
			return Promise.reject(err);
		})

}


module.exports = call;