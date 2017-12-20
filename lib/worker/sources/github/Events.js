'use strict';

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let dataLength, page;
	let perPage = 30;

	let api = bitscoop.api(map.id);
	let cursor = api.endpoint(sourceName).method('GET');

	return cursor({
		parameters: {
			page: pagination.page
		},
		headers: {
			'X-Connection-Id': connectionId,
			"X-Populate": "*"
		}
	})
		.then(function(result) {
			let [data, response] = result;

			dataLength = data.length;

			if (results == null) {
				results = [];
			}

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (page == null) {
				page = 2;
			}
			else {
				page = page + 1;
			}

			if (dataLength >= perPage) {
				return call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, {
					page: page
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
							resolve(data)
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