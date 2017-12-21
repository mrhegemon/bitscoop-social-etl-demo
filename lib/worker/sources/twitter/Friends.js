'use strict';

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let nextCursor;
	let perPage = 100;

	let api = bitscoop.api(map.id);
	let cursor = api.endpoint(sourceName).method('GET');
	let cursorRaw = api.endpoint(sourceName + 'Raw').method('GET');

	let options = {
		parameters: {
			count: perPage,
			max_id: pagination.maxId
		},
		headers: {
			'X-Connection-Id': connectionId,
			"X-Populate": "*"
		}
	};

	if (pagination.cursor != null) {
		options.parameters.cursor = pagination.nextCursor;
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

			nextCursor = dataRaw.next_cursor_str;

			return Promise.resolve();
		})
		.then(function() {
			if (nextCursor !== '0') {
				return call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, {
					cursor: nextCursor
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