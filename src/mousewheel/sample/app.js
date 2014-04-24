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
	'../mousewheel'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['mousewheel'])

	.run(['$rootScope', function($rootScope) {

		$rootScope.wheels = [];

		$rootScope.handerWheel = function(e, wheelDelta) {
			$rootScope.wheels.push({
				name: 'wheels--' + $rootScope.wheels.length + '--' + wheelDelta
			});
		};

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});