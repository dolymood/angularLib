'use strict'
/**
 * 滚动加载（支持某个元素的滚动加载）
 * 参考ngInfiniteScroll
 * https://github.com/sroze/ngInfiniteScroll
 */
define(['angular', '../lang'], function(angular) {

	angular.module('scrollLoad', [])

	.directive('ngdScrollElm', function() {
		
		return {

			require: '^ngdScrollLoad',
			
			link: function($scope, iElm, iAttrs, controller) {
				controller.setScrollElm(iElm[0]);
			}
		};
	})

	.directive('ngdScrollLoad', [
		'$timeout',
		'$window',
		'$rootScope',
		'$compile',
		function($timeout, $window, $rootScope, $compile) {
		
		return {
			
			scope: {
				// scrollElm 是否是true
				// false 就是window 
				// 其他就是滚动的元素
				scrollElm: '=',
				scrollDisabled: '=',
				loadedFinish: '='
			},

			controller: [
				'$scope',
				'$element',
				'$attrs',
				function($scope, elem, attrs) {
					var checkWhenEnabled, scrollDistance, timeout, scrollElm;

					scrollDistance = 0;
					checkWhenEnabled = false;

					$scope.scrollEnabled = true;

					$scope.cancelWSD = $scope.$watch('scrollDisabled', function(value) {
						$scope.scrollEnabled = !value;
						if ($scope.scrollEnabled && checkWhenEnabled) {
							checkWhenEnabled = false;
							return checkLoad();
						}
					});

					this.handlerScroll = function() {
						checkLoad();
					};

					this.handlerResize = function() {
						checkLoad();
					};

					this.setScrollElm = function(el) {
						scrollElm = el;
					};

					function timeCheck() {
						if (timeout) {
							$timeout.cancel(timeout);
						}
						timeout = $timeout(checkLoad, 100);
					}

					function getHeight(ele) {
						if (ele.offsetHeight != undefined) {
							return ele.offsetHeight;
						}
						// window
						return ele.document.documentElement.clientHeight;
					}

					function getScrollTop(ele) {
						if (ele.scrollTop != undefined) {
							return ele.scrollTop;
						}
						// window
						// 为了兼容 某版本chrome scrollTop的值不对
						// 所以加了 scrollY 但是在IE中没有scrollY 
						// 故 或 0
						return ele.document.documentElement.scrollTop || ele.scrollY || 0;
					}

					// 校验是否需要load数据
					function checkLoad() {
						if ($scope.loadedFinish) return;
						var scrollEle = $scope.scrollEle[0],
								eleHeight = getHeight(scrollEle),
								elementBottom, remaining, shouldScroll, windowBottom;
						windowBottom = eleHeight + getScrollTop(scrollEle);
						if (scrollEle.offsetHeight) {
							elementBottom = scrollElm.offsetHeight;
						} else {
							// window
							elementBottom = elem.offset().top + elem[0].offsetHeight;
						}
						remaining = elementBottom - windowBottom;
						shouldScroll = remaining <= eleHeight * scrollDistance;

						if (shouldScroll && $scope.scrollEnabled) {
							if ($rootScope.$$phase) {
								return $scope.$parent.$eval(attrs.ngdScrollLoad);
							} else {
								return $scope.$parent.$apply(attrs.ngdScrollLoad);
							}
						} else if (shouldScroll) {
							return checkWhenEnabled = true;
						}
					}

				}
			],

			compile: function(ele, attrs) {

				return function($scope, iElm, iAttrs, controller) {

					var laodingbar = $compile('<div class="loadingbar ng-hide" ng-hide="scrollEnabled">加载中...</div>')($scope);
					var win = angular.element($window);

					iElm.append(laodingbar);
					
					$scope.scrollEle = $scope.scrollElm ? iElm : win;
					$scope.scrollEle.on('scroll', controller.handlerScroll);
					win.on('resize', controller.handlerResize);

					$scope.$on('$destroy', offBind);

					$scope.$emit('scrollLoadingDone', false);

					var loadedFinish = $scope.$watch('loadedFinish', function(newV, oldV) {
						if (newV && !oldV) {
							loadedFinish();
							$scope.cancelWSD && $scope.cancelWSD();
							offBind();
						}
						if (newV) {
							$scope.$emit('scrollLoadingDone', true);
						}
					});

					function offBind() {
						win.off('resize', controller.handlerResize);
						$scope.scrollEle.off('scroll', controller.handlerScroll);
					}

					controller.handlerResize();
				}
			}

		};

	}]);

});