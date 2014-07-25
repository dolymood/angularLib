'use strict'
/**
 * 在angular ui 中的$modal基础上修改而来 
 * dialog 弹框
 * 原地址：https://github.com/angular-ui/bootstrap/tree/master/src/modal
 */
define(['angular', '../lang'], function(angular) {

	return angular.module('dialog', [])

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
	.factory('$$stackedMap', function () {
		return {
			createNew: function () {
				var stack = [];

				return {
					add: function (key, value) {
						stack.push({
							key: key,
							value: value
						});
					},
					get: function (key) {
						for (var i = 0; i < stack.length; i++) {
							if (key == stack[i].key) {
								return stack[i];
							}
						}
					},
					keys: function() {
						var keys = [];
						for (var i = 0; i < stack.length; i++) {
							keys.push(stack[i].key);
						}
						return keys;
					},
					top: function () {
						return stack[stack.length - 1];
					},
					remove: function (key) {
						var idx = -1;
						for (var i = 0; i < stack.length; i++) {
							if (key == stack[i].key) {
								idx = i;
								break;
							}
						}
						return stack.splice(idx, 1)[0];
					},
					removeTop: function () {
						return stack.splice(stack.length - 1, 1)[0];
					},
					length: function () {
						return stack.length;
					}
				};
			}
		};
	})

/**
 * A helper directive for the $modal service. It creates a backdrop element.
 */
	.directive('ngdDialogOverlay', ['$dialogStack', '$timeout', function ($dialogStack, $timeout) {
		return {
			restrict: 'EA',
			replace: true,
			template: '<div class="overlay fade" ng-class="{in: animate}" ng-style="{\'z-index\': 1040 + index*10}" ng-click="close($event)"></div>',
			link: function (scope, element, attrs) {

				//trigger CSS transitions
				$timeout(function () {
					scope.animate = true;
				});

				scope.close = function (evt) {
					var modal = $dialogStack.getTop();
					if (modal && modal.value.overlay && modal.value.overlay != 'static') {
						evt.preventDefault();
						evt.stopPropagation();
						modal.key && modal.key.dismiss('overlay click');
						// $dialogStack.dismiss(modal.key, 'overlay click');
					}
				};
			}
		};
	}])

	.directive('ngdDialogWindow', ['$timeout', function ($timeout) {
		return {
			restrict: 'EA',
			scope: {
				index: '@'
			},
			replace: true, // 替换
			transclude: true, // 嵌入
			template: '<div class="dialog fade dialogLoading" ng-class="{in: animate}" ng-style="{\'z-index\': 1050 + index*10}" ng-transclude></div>',
			link: function (scope, element, attrs) {
				scope.$on('dataLoaded', function() {
					element.removeClass('dialogLoading');
					if (attrs.insert) {
						var eles = element.getElementsByClassName(attrs.insert);
						if (eles.length) {
							angular.element(eles[0]).removeClass('loading2');
						}
					}
				});
				if (attrs.insert) {
					element.removeClass('dialogLoading');
				}
				//trigger CSS transitions
				$timeout(function () {
					scope.animate = true;
				});
			}
		};
	}])

	.factory('$dialogStack', ['$document', '$compile', '$rootScope', '$q', '$injector', '$controller', '$templateCache', '$http', '$timeout' ,'$$stackedMap',
		function ($document, $compile, $rootScope, $q, $injector, $controller, $templateCache, $http, $timeout, $$stackedMap) {

			var backdropjqLiteEl, backdropDomEl;
			var backdropScope = $rootScope.$new(true);
			var body = $document.find('body').eq(0);
			var openedWindows = $$stackedMap.createNew();
			var $dialogStack = {};

			function backdropIndex() {
				var topBackdropIndex = -1;
				var opened = openedWindows.keys();
				for (var i = 0; i < opened.length; i++) {
					if (openedWindows.get(opened[i]).value.overlay) {
						topBackdropIndex = i;
					}
				}
				return topBackdropIndex;
			}

			$rootScope.$watch(backdropIndex, function(newBackdropIndex){
				backdropScope.index = newBackdropIndex;
			});

			function removeModalWindow(modalInstance) {

				var modalWindow = openedWindows.get(modalInstance).value;

				//clean up the stack
				openedWindows.remove(modalInstance);

				//remove window DOM element
				modalWindow.modalDomEl.remove();

				//remove backdrop if no longer needed
				if (backdropDomEl && backdropIndex() == -1) {
					backdropDomEl.remove();
					backdropDomEl = undefined;
				}

				//destroy scope
				modalWindow.modalScope.$destroy();
			}

			$document.on('keydown', function (evt) {
				var modal;
				var which = angular.isDefined(evt.which) ? evt.which : evt.keyCode;
				modal = openedWindows.top();
				if (which === 27) {
					if (modal && modal.value.keyboard) {
						$rootScope.$apply(function () {
							modal.key && modal.key.dismiss('overlay click');
							// $dialogStack.dismiss(modal.key);
						});
					}
				}
				if (modal && which === 8) {
					var tname = evt.target.tagName.toLowerCase();
					if (tname != 'input' && tname != 'textarea') {
						// 此时有dialog 禁止 回退
						evt.preventDefault();
						evt.stopPropagation();
					}
				}

			});

			function getTemplatePromise(options) {
				return options.template ? $q.when(options.template) :
					$http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
						return result.data;
					});
			}

			function getResolvePromises(resolves) {
				var promisesArr = [];
				angular.forEach(resolves, function (value, key) {
					if (angular.isFunction(value) || angular.isArray(value)) {
						promisesArr.push($q.when($injector.invoke(value)));
					}
				});
				return promisesArr;
			}

			var dragable = {

				downed: false,

				x: null,

				y: null,

				target: null,

				dialog: null,

				tH: 0,

				bH: 0,

				mousedown: function(e) {
					dragable.downed = true;
					e.preventDefault();
					var target = dragable.target = angular.element(e.currentTarget || this);
					var dialog = dragable.dialog = target.parent();
					var dialogB = dialog.getElementsByClassName('dialogB');
					var dialogF = dialog.getElementsByClassName('dialogF');
					dragable.tH = target[0].offsetHeight;
					dragable.bH = dialogB.length > 0 ?
													dialogB[0].offsetHeight :
												dialogF.length > 0 ?
													dialogF[0].offsetHeight	:
													0;
					var offset = dialog.offset();
					var pager = angular.getEvtPageObj(e);
					dragable.x = pager.pageX - offset.left;
					dragable.y = pager.pageY - offset.top;
					target.css({
						cursor: 'move'
					});
					$document.on('mousemove', dragable.mousemove);
					$document.on('mouseup', dragable.mouseup);
				},

				mousemove: function(e) {
					if (dragable.downed) {
						e.preventDefault();
						var offset = 3,
								left = e.clientX - dragable.x,
								top = e.clientY - dragable.y,
								selfWidth = dragable.dialog[0].offsetWidth + offset,
								selfHeight = dragable.dialog[0].offsetHeight + offset,
								maxWidth = $document[0].documentElement.clientWidth,
								maxHeight = $document[0].documentElement.clientHeight;
						if (left - offset <= 0) {
							left = offset;
						}
						if (left + selfWidth >= maxWidth) {
							left = maxWidth - selfWidth;
						}
						if (top - offset <= dragable.tH) {
							top = offset + dragable.tH;
						}
						if (top + selfHeight + dragable.bH >= maxHeight) {
							top = maxHeight - selfHeight - dragable.bH;
						}
						dragable.dialog.css({
							left: left + 'px',
							top: top + 'px',
							margin: '0 0 0 0'
						});
					}
				},

				mouseup: function(e) {
					dragable.downed = false;
					dragable.x = null;
					dragable.y = null;
					dragable.tH = 0;
					dragable.bH = 0;
					dragable.target.css({
						cursor: ''
					});

					e.preventDefault();
					$document.off('mousemove', dragable.mousemove);
					$document.off('mouseup', dragable.mouseup);
				}

			};

			function bindDragable(dialogT) {
				dialogT.on('mousedown', dragable.mousedown);
			}

			$dialogStack.open = function (modalInstance, modal) {

				var modalOptions = modal.modalOptions;
				var templateAndResolvePromise = $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));

				templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

					var ctrlInstance, ctrlLocals = {};
					var resolveIter = 1;

					$timeout(function() {
						modal.scope.$broadcast('dataLoaded');
					}, 0);
					

					//controllers
					if (modalOptions.controller) {
						ctrlLocals.$scope = modal.scope;
						ctrlLocals.$dialogInstance = modalInstance;
						ctrlLocals.$element = modalDomEl;
						angular.forEach(modalOptions.resolve, function (value, key) {
							ctrlLocals[key] = tplAndVars[resolveIter++];
						});

						ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
					}
					
					var tempEle = angular.element('<div></div>');
					tempEle.html(tplAndVars[0]);
					var ele = $compile(tempEle)(modal.scope);
					if (modalDomEl) {
						if (modalOptions._insertClass) {
							var eles = modalDomEl.getElementsByClassName(modalOptions._insertClass);
							if (eles.length) {
								angular.element(eles[0]).append(ele.contents());
							} else {
								modalDomEl.append(ele.contents());
							}
						} else {
							modalDomEl.append(ele.contents());
						}
						if (modalOptions.dragable) {
							var dialogT = modalDomEl.getElementsByClassName('dialogT');
							if (dialogT.length) {
								bindDragable(dialogT);
							}
						}
						
					}
				}, function resolveError(reason) {
					modal.deferred.reject(reason);
					$timeout(function() {
						modalInstance.close();
					}, 0);
					alert('加载失败，请重试');
				});

				templateAndResolvePromise.then(function () {
					modal.loadedDeferred.resolve(true);
				}, function () {
					modal.loadedDeferred.reject(false);
				});

				openedWindows.add(modalInstance, {
					deferred: modal.deferred,
					modalScope: modal.scope,
					overlay: modalOptions.overlay,
					dragable: modalOptions.dragable,
					keyboard: modalOptions.keyboard
				});
					
				if (backdropIndex() >= 0 && !backdropDomEl) {
					backdropjqLiteEl = angular.element('<div ngd-dialog-overlay></div>');
					backdropDomEl = $compile(backdropjqLiteEl)(backdropScope);
					body.append(backdropDomEl);
				}

				modalInstance.updateTitle = function(title) {
					if (!modalDomEl) return;
					var dialogT = modalDomEl.getElementsByClassName('dialogT');
					if (dialogT.length) {
						dialogT.html(title);
					}
				};

				var outerHtml = !modalOptions.hideClose ?
					('<div ngd-dialog-window><a class="dialogX dialog-close" href="javascript:;" ng-click=$oclose() title="{0}"></a>'.format('关闭') + '<div class="dialogT">' + (modalOptions.title || '提示') + '</div>' + (modalOptions._insert || '') + '</div>') :
					('<div ngd-dialog-window><div class="dialogT">' + (modalOptions.title || '提示') + '</div>' + (modalOptions._insert || '') + '</div>');
				var angularDomEl = angular.element(outerHtml);
				angularDomEl.addClass(modalOptions.classname);
				// angularDomEl.attr('classname', modalOptions.classname);
				angularDomEl.attr('index', openedWindows.length() - 1);
				angularDomEl.attr('insert', modalOptions._insertClass || '');
				var modalDomEl = $compile(angularDomEl)(modal.scope);
				openedWindows.top().value.modalDomEl = modalDomEl;
				body.append(modalDomEl);
			 
			};

			$dialogStack.close = function (modalInstance, result) {
				var modal = openedWindows.get(modalInstance);
				if (modal) {
					modal.value.deferred.resolve(result);
					removeModalWindow(modalInstance);
				}
			};

			$dialogStack.dismiss = function (modalInstance, reason) {
				var modalWindow = openedWindows.get(modalInstance).value;
				if (modalWindow) {
					modalWindow.deferred.reject(reason);
					removeModalWindow(modalInstance);
				}
			};

			$dialogStack.show = function (modalInstance) {
				var modalWindow = openedWindows.get(modalInstance).value;
				if (modalWindow && modalWindow.modalDomEl) {
					modalWindow.modalDomEl.css({'opacity': '1'});
				}
			};

			$dialogStack.hide = function(modalInstance) {
				var modalWindow = openedWindows.get(modalInstance).value;
				if (modalWindow && modalWindow.modalDomEl) {
					modalWindow.modalDomEl.css({'opacity': '0'});
				}
			};

			$dialogStack.addClass = function(modalInstance, cls) {
				var modalWindow = openedWindows.get(modalInstance).value;
				if (modalWindow && modalWindow.modalDomEl) {
					modalWindow.modalDomEl.addClass(cls);
				}
			};

			$dialogStack.removeClass = function(modalInstance, cls) {
				var modalWindow = openedWindows.get(modalInstance).value;
				if (modalWindow && modalWindow.modalDomEl) {
					modalWindow.modalDomEl.removeClass(cls);
				}
			};

			$dialogStack.getTop = function () {
				return openedWindows.top();
			};

			return $dialogStack;
		}])

	.provider('$dialog', function () {

		var $modalProvider = {
			options: {
				overlay: 'static', //can be also false or 'static'
				keyboard: true,
				dragable: true,
				onClose: angular.noop,
				hideClose: false
			},
			$get: ['$rootScope', '$q', '$dialogStack',
				function ($rootScope, $q, $dialogStack) {

					var $modal = {};

					$modal.open = function (modalOptions) {

						var modalResultDeferred = $q.defer();
						var modalLoadedDeferred = $q.defer();

						//prepare an instance of a modal to be injected into controllers and returned to a caller
						var modalInstance = {
							result: modalResultDeferred.promise,
							loaded: modalLoadedDeferred.promise,
							close: function (result) {
								$dialogStack.close(modalInstance, result);
							},
							dismiss: function (reason) {
								$dialogStack.dismiss(modalInstance, reason);
							},
							hide: function () {
								$dialogStack.hide(modalInstance);
							},
							show: function() {
								$dialogStack.show(modalInstance);
							},
							addClass: function(cls) {
								$dialogStack.addClass(modalInstance, cls);
							},
							removeClass: function(cls) {
								$dialogStack.removeClass(modalInstance, cls);
							}
						};

						//merge and clean up options
						modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
						modalOptions.resolve = modalOptions.resolve || {};

						//verify options
						if (!modalOptions.template && !modalOptions.templateUrl) {
							throw new Error('One of template or templateUrl options is required.');
						}

						var modalScope = (modalOptions.scope || $rootScope).$new();
						modalScope.$close = modalInstance.close;
						modalScope.$dismiss = modalInstance.dismiss;
						modalScope.$hide = modalInstance.hide;
						modalScope.$show = modalInstance.show;
						modalScope.$addClass = modalInstance.addClass;
						modalScope.$removeClass = modalInstance.removeClass;
						modalScope.$oclose = function() {
							if (false !== modalOptions.onClose.call(modalScope, modalScope, modalInstance)) {
								modalScope.$close()
							}
						};

						$dialogStack.open(modalInstance, {
							scope: modalScope,
							deferred: modalResultDeferred,
							loadedDeferred: modalLoadedDeferred,
							modalOptions: modalOptions
						});

						return modalInstance;
					};

					return $modal;
				}]
		};

		return $modalProvider;
	});

});
