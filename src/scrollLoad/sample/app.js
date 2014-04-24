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
	'../scrollLoad'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['scrollLoad'])

	.run(['$rootScope', '$timeout', function($rootScope, $timeout) {
		var base = 0;
		var rows = 100;
		var moreList = function() {
			var list = []
			var len = base > 300 ? 50 : rows;
			for (var i = 0; i < len; i++) {
				list.push({
					name: 'xxx_' + base++
				});
			}
			return list
		}

		$rootScope.loadedFinish = false;

		$rootScope.busy = false;

		$rootScope.loadMore = function() {
			$rootScope.busy = true;
			var to = $timeout(function() {
				$rootScope.busy = false;
				var list = moreList();
				if (list.length < rows) {
					$rootScope.loadedFinish = true;
				}
				if (!$rootScope.list) {
					$rootScope.list = list;
				} else {
					list.push.apply($rootScope.list, list);
				}
				$timeout.cancel(to);
			}, 300)
		};

		var base1 = 0;
		var moreList1 = function() {
			var list = []
			var len = base1 > 300 ? 50 : rows;
			for (var i = 0; i < len; i++) {
				list.push({
					name: 'xxx_' + base1++
				});
			}
			return list
		}

		$rootScope.loadedFinish1 = false;

		$rootScope.busy1 = false;

		$rootScope.loadMore1 = function() {
			$rootScope.busy1 = true;
			var to = $timeout(function() {
				$rootScope.busy1 = false;
				var list = moreList1();
				if (list.length < rows) {
					$rootScope.loadedFinish1 = true;
				}
				if (!$rootScope.list1) {
					$rootScope.list1 = list;
				} else {
					list.push.apply($rootScope.list1, list);
				}
				$timeout.cancel(to);
			}, 300)
		};

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});