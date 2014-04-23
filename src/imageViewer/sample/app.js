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
	'../imageViewer'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['imageViewer'])

	.run(['$rootScope', '$imageViewer', function($rootScope, $imageViewer) {
		
		$rootScope.showImgs = function() {
			var bsrc = './imgs/';
			var imgs = []
			for (var i = 1; i <= 15; i++) {
				imgs.push({
					src: bsrc + i + '.jpg'
				});
			}
			$imageViewer.open(1, imgs, {
				//parseImgs:function(imgs, w, h) {}
			});
		};

		$rootScope.$on('opHandler', function(e, optype, obj) {
			// do sth..
			if (optype == 'delete') {
				$rootScope.$broadcast('deletedFiles', [{
					img: obj.img
				}]);
			}
		})

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});