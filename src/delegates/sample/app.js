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
	'../angular-delegates'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['DelegateEvents'])

	.run(['$rootScope', function($rootScope) {
		
		var list = []
		for (var i = 0; i < 100; i++) {
			list.push({
				name: 'xxx_' + i
			})
		}
		$rootScope.list = list;

		$rootScope.itemClick = function(e, item) {
			item.name += 'XXXX'
		};

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});