'use strict'

define(['angular', './dialog'], function(angular, dialogModule) {

	return dialogModule.provider('$confirm', function() {

		var $confirmProvider = {

			$get: ['$dialog', function($dialog) {

				var $confirm = {};

				$confirm.open = function(options) {

					var controller = options.controller;
					var controllerFun, args;
					if (angular.isArray(controller)) {
						controllerFun = controller[controller.length - 1];
						args = controller.slice(0, controller.length - 1);
					} else {
						controllerFun = controller;
						args = [];
					}
					delete options.controller;

					args.unshift('$dialogInstance');
					args.unshift('$scope');

					args.push(function($scope, $dialogInstance) {
						if (controllerFun) controllerFun.apply(this, [].slice.call(arguments, 2));

						$scope.pending = false;

						$scope.$ok = function() {
							if (options.onConfirm) {
								if (options.onConfirm.call($scope, $scope, $dialogInstance) === false) {
									$scope.pending = true;
									return;
								}
							}
							$dialogInstance.close();
						};

						var dismiss = $scope.$dismiss;

						$scope.$cancel = $dialogInstance.dismiss = $scope.$dismiss = function(reason) {
							if (options.onCancel) {
								if (options.onCancel.call($scope, $scope, $dialogInstance) === false) {
									return;
								}
							}
							dismiss.call(this, reason);
						};

					});

					var classname = options.classname || '';
					delete options.classname;

					var ret = $dialog.open(angular.extend({}, {
						overlay: true,
						keyboard: true,
						title: angular.isDefined(options.title) ? options.title : '提醒',
						classname: ' confirmDialog '+ classname,
						// 参数是注入的
						controller: args,
						_insertClass: 'dialogC',
						_insert: [
							'<div class="dialogC" ng-class="{confirmLoading: pending}"></div>',
							'<div class="dialogB btns3">',
								'<button class="btn" ng-class="{btn_disable: pending}" ng-disabled="pending" ng-click="$ok()">确定</button>',
								'<button class="btn btn_minor" ng-click="$cancel()">取消</button>',
							'</div>'].join('')
					}, options));

					return ret;
				};

				return $confirm;

			}]
		};

		return $confirmProvider;

	});

});