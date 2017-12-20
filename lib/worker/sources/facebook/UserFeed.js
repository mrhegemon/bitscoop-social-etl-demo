'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let nextPageToken, next;
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

	if (pagination.pagingToken) {
		options.parameters.paging_token = pagination.pagingToken;
	}

	if (pagination.since) {
		options.parameters.since = pagination.since;
	}

	if (pagination.until) {
		options.parameters.until = pagination.until;
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

			next = dataRaw.paging ? dataRaw.paging.next : null;

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (next != null) {
				let parsed = url.parse(next);
				let params = querystring.parse(parsed.query);

				return call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, {
					pagingToken: params.__paging_token,
					since: params.since,
					until: params.until
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