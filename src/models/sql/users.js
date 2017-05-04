'use strict';

const Sequelize = require('sequelize');


let schema = {
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
	linkedinConnectionId: {
		type: Sequelize.STRING,
		field: 'linkedin_connection_id'
	},
	twitterConnectionId: {
		type: Sequelize.STRING,
		field: 'twitter_connection_id'
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
};


module.exports = function(db) {
	let model = db.define('users', schema, {
		timestamps: false
	});

	return model.sync()
		.then(function() {
			return model;
		});
};
