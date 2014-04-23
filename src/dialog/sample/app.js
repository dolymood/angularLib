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
	'../confirm'
], function(angular) {
	var appName = 'app'

	angular.module(appName, ['dialog'])

	.run([
		'$rootScope', '$dialog', '$confirm',
		function($rootScope, $dialog, $confirm) {
		
		$rootScope.showDialog = function() {
			$dialog.open({
				title: '弹框',
				classname: 'dialog2',
				template: '<div class="dialogC">内容<p>{{content}}</p></div>',
				resolve: {
					data: function() {
						return '数据内容'
					}
				},
				controller: [
					'$scope', '$dialogInstance', 'data',
					function($scope, $dialogInstance, data) {
						$scope.content = data;
					}
				]
			});
		};

		$rootScope.showConfirm = function() {
			$confirm.open({
				title: 'confirm确认',
				template: '确定？',
				onConfirm: function() {
					alert('确定了')
				},
				onCancel: function() {
					alert('取消了')
				}
			});
		};

	}]);

	// 启动
	angular.element().ready(function(){
		angular.bootstrap(document, [appName]);
	})

});