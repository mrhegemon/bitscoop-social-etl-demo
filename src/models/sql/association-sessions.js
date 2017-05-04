'use strict';

const Sequelize = require('sequelize');


let schema = {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true
	},
	token: {
		type: Sequelize.STRING
	},
	connectionId: {
		type: Sequelize.STRING,
		field: 'connection_id'
	}
};


module.exports = function(db) {
	let model = db.define('association_sessions', schema, {
		timestamps: false
	});

	return model.sync()
		.then(function() {
			return model;
		});
};
