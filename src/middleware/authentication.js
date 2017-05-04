'use strict';


module.exports = function(sequelize, cookie) {
	return Promise.all([
		require('../models/sql/sessions')(sequelize),
		require('../models/sql/users')(sequelize)
	])
		.then(function(models) {
			let [sessions, users] = models;

			return sessions.findOne({
				where: {
					token: cookie
				}
			})
			.then(function(session) {
				if (session) {
					return users.findOne({
						where: {
							id: session.user
						}
					})
						.then(function(user) {
							return Promise.resolve([session, user]);
						});
				}
				else {
					return Promise.resolve([null, null]);
				}
			});
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
};
