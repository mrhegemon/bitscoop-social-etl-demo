'use strict';

const _ = require('lodash');
const moment = require('moment');


function call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, pagination, results) {
	let dataLength, lastItem, mostRecent;
	let perPage = 100;

	let api = bitscoop.api(map.id);
	let cursor = api.endpoint(sourceName).method('GET');

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

	if (user.twitterTweetsSinceId != null) {
		options.parameters.since_id = user.twitterTweetsSinceId;
	}

	console.log(options);

	return cursor(options)
		.then(function(result) {
			let [data, response] = result;

			if (results == null) {
				results = [];
			}

			results = results.concat(data);

			console.log(data);

			dataLength = data.length;
			lastItem = data[data.length - 1];

			return Promise.resolve();
		})
		.then(function() {
			if (dataLength === perPage) {
				return call(user, users, provider, sourceName, connectionId, bitscoop, map, sequelize, bucketname, s3, {
					maxId: lastItem.id_str
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
						if (results.length > 0) {
							return users.update(
								{
									twitterTweetsSinceId: results[0].id_str
								},
								{
									where: {
										id: user.id
									}
								});
						}
						else {
							return Promise.resolve();
						}
					});
			}
		})
		.catch(function(err) {
			console.log(err);
			return Promise.reject(err);
		})

}


module.exports = call;