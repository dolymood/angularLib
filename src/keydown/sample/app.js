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
	'../keydown'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['keydown'])

	.run(['$rootScope', function($rootScope) {

		$rootScope.name = 'XXXX';

		$rootScope.handerEnter = function(e, name) {
			alert(name)
		};

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});