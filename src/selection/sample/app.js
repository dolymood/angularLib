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
	'../selection'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['selection'])

	.run([
		'$rootScope',
		function($rootScope) {
			$rootScope.endS = 5
		}
	])

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});