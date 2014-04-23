'use strict'

require.config({
	paths: {
		angular: '../../../angular/1.2.15'
	},
	shim: {
		angular: {
			exports: 'angular'
		}
	}
});

require([
	'angular',
	'../placeholder'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['placeholder'])

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});