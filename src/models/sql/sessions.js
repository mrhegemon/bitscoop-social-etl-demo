'use strict';

const Sequelize = require('sequelize');


let schema = {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true
	},
	user: {
		type: Sequelize.INTEGER
	},
	token: {
		type: Sequelize.STRING
	}
};


module.exports = function(db) {
	let model = db.define('sessions', schema, {
		timestamps: false
	});

	return model.sync()
		.then(function() {
			return model;
		});
};
