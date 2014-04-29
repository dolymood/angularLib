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
	'../angular-flow'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['flow'])

	.run(['$rootScope', function($rootScope) {
		
		$rootScope.target = '/'
		$rootScope.flowObj = {
			flow: null
		};
		$rootScope.parseTarget = function(target, fileObj) {
			return target = '?xx=' + fileObj.name
		};
		$rootScope.getFolderTarget = function(paths, folderObj, callback) {
			setTimeout(function() {
				var a = {}
				paths.forEach(function(path) {
					a[path] = 'idididididdid11111'
				})
				return callback(a)
			}, 100)
		};
		$rootScope.query = function() {
			return {
				t: 'ttttt'
			};
		};
		$rootScope.fileSuccess = function($file, $message) {
			var id;
			// $message = angular.fromJson($message);
			// do ...
		};
		var parse2N = function(num) {
			if (!num) return '0'
			var k1, k2;
			k1 = 1024 * 1024 * 1024;
			k2 = 1024 * 1024;
			if (num >= k1) {
				return (num / k1).toFixed(2) + 'GB';
			} else if (num >= k2) {
				return (num / k2).toFixed(2) + 'MB';
			} else if (num >= 1024) {
				return (num / 1024).toFixed(2) + 'KB';
			} else {
				return num.toFixed(2) + 'B';
			}
		};
		$rootScope.parseFsize = function(f) {
			var size;
			size = f.isFolder ? f.getSize() : f.size;
			return parse2N(size);
		};
		$rootScope.parseFspeed = function(f) {
			var n;
			n = parse2N(f.aSpeed());
			return n + '/s';
		};

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});