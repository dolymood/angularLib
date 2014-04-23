'use strict'

define([
	'angular',
	'../browserPrefix',
	'./ImageView',
	'../lang'
	],
	function(angular, browserPrefix, ImageView) {

	var support = browserPrefix.vendor() !== false;

	return angular.module('imageViewer', [])

	.directive('ngdImageviewer', [
		'$timeout',
		'$document',
		function($timeout, $document) {

			return {
				replace: true,
				template: [
					'<div class="imageViewer" id="imageViewer">',
						'<div class="viewerT">',
							'<a class="dialogX" ng-click="close()"></a>',
							'<div class="title">{{imgs[currentIndex].name}}</div>',
						'</div>',
						'<div class="viewerC">',
							'<div class="leftH" title="上一张" ng-click="prevImg()" ng-class="{noVis:currentIndex==0}"><span class="cr"></span></div>',
							'<div class="rightH" title="下一张" ng-click="nextImg()" ng-class="{noVis:currentIndex==imgs.length - 1}"><span class="cr"></span></div>',
							'<div class="viewer">',
								'<div class="imgBder" ng-class="{imgLoading:loading}" id="imgBder">',
									'<img id="preImg" ng-src="{{imgs[currentIndex].bsrc}}">',
								'</div>',
								'<div class="imgOpbar">',
									'<div class="imgOp">',
										'<a target="_blank" ng-href="{{imgs[currentIndex].oriUrl}}" class="op" title="查看原图"><i class="i iImgOp"></i></a>',
										'<button class="op" title="放大（shift+鼠标滚轮）" ng-click="zoom(1)"><i class="i iImgOp iImgOp2"></i></button>',
										'<button class="op" title="缩小（shift+鼠标滚轮）" ng-click="zoom(-1)"><i class="i iImgOp iImgOp3"></i></button>',
										'<button class="op" title="左旋转" ng-hide="!support" ng-click="rotate(-1)"><i class="i iImgOp iImgOp4"></i></button>',
										'<button class="op" title="右旋转" ng-hide="!support" ng-click="rotate(1)"><i class="i iImgOp iImgOp5"></i></button>',
										'<button class="op" title="删除" ng-click="broadOp(\'delete\')"><i class="i iImgOp iImgOp6"></i></button>',
									'</div>',
									'<div class="imgOp">',
										'<button class="op" title="下载" ng-click="broadOp(\'download\')"><i class="i iImgOp iImgOp7"></i></button>',
										'<button class="op" title="分享" ng-click="broadOp(\'share\')"><i class="i iImgOp iImgOp8"></i></button>',
									'</div>',
								'</div>',
							'</div>',
						'</div>',
						'<div class="viewerB">',
							'<div class="mc">',
								'<div class="Bc" ng-style="tiStyle" id="Bc">',
									'<div class="imgc" ng-click="cIndex($index + ms)" ng-class="{active:$index == ciIndex}" ng-repeat="cimg in currentImgs">',
										'<div class="imgWrap">',
											'<img ng-src="{{cimg.src}}">',
										'</div>',
									'</div>',
								'</div>',
							'</div>',
						'</div>',
					'</div>'
				].join(''),

				link: function(scope, ele, attrs) {
					
					var mousewheelName = 'mousewheel'
					try {
						document.createEvent('MouseScrollEvents')
						mousewheelName = 'DOMMouseScroll'
					} catch (e) {}

					scope.close = function() {
						ele.remove();
						scope.overlay.remove();
						scope.$destroy();
						$document.off('keydown', keydowne);
						iwindow.off('resize', resize);
						ele.off(mousewheelName);
					};

					scope.broadOp = function(opType) {
						scope.$emit('opHandler', opType, {
							img: scope.imgs[scope.currentIndex]
						});
					};

					scope.support = support;

					scope.zoom = function(o) {
						if (imageview) {
							imageview.scale(o > 0 ? 0.1 : -0.1);
						}
					};

					var rotateO = 0;

					scope.rotate = function(o) {
						if (imageview) {
							imageview.rotate(o > 0 ? (rotateO+= 90) : (rotateO -= 90));
						}
					};

					scope.$on('deletedFiles', function(e, fScopes) {
						var img = fScopes[0].img;
						var idex = scope.imgs.indexOf(img);
						scope.imgs.splice(idex, 1);
						if (idex < scope.currentIndex) {
							idex = scope.currentIndex - 1;
						} else {
							idex = scope.currentIndex;
						}
						scope.cIndex(idex, true);
					});

					scope.prevImg = function() {
						scope.cIndex(scope.currentIndex - 1);
					};

					scope.nextImg = function() {
						scope.cIndex(scope.currentIndex + 1);
					};

					var placeH = [];
					for (var i = 0; i < 20; i++) {
						placeH.push('<p class="imgc imgcp"></p>');
					}

					var preImg;

					var to = $timeout(function() {
						angular.element(document.getElementById('Bc')).append(placeH.join(''));
						preImg = document.getElementById('preImg');
						$timeout.cancel(to);
						var el = ele.getElementsByClassName('viewer')[0];
						var w = el.offsetWidth;
						var h = el.offsetHeight;
						scope.options.parseImgs(scope.imgs, w, h);
					}, 0);
					

					var tiStyle = scope.tiStyle = {}

					var imageview;

					scope.loading = false;

					scope.cIndex = function(index, hard) {
						if (scope.imgs.length < 1) {
							// 此时应该关闭
							scope.close();
							return;
						}
						index || (index = 0);
						if (index < 0) index = 0;
						if (index >= scope.imgs.length) index = scope.imgs.length - 1

						if (!hard && index === scope.currentIndex) return;
						scope.currentIndex = index;
						scope.loading = true;
						var currentImgs = [];
						var ms = Math.max(0, index - 15);
						var me = Math.min(scope.imgs.length - 1, index + 15);
						currentImgs = scope.imgs.slice(ms, me + 1);
						scope.currentImgs = currentImgs;
						scope.ciIndex = scope.currentIndex - ms;
						scope.ms = ms;

						var tid = -(scope.ciIndex) * 70;
						tiStyle['text-indent'] = tid + 'px';
						if (imageview) {
							imageview.destroy();
							imageview = null;
						}
						setTimeout(function() {
							rotateO = 0;
							imageview = new ImageView(document.getElementById('preImg'), {
								movingCheck: false,
								scaleNum: 1,
								shiftWheelZoom: true,
								onload: function() {
									scope.loading = false;
									if (!scope.$$phase) {
										scope.$apply()
									}
								}
							});
						}, 0);
						
						if (!scope.$$phase) {
							scope.$apply()
						}
					};

					scope.currentImgs = [];
					scope.ciIndex = 0;
					scope.ms = 0;

					var lto, sw = 0, lto1;
					ele.on(mousewheelName, function(e) {
						e.preventDefault();
						e.stopPropagation();
						var delta;
						if (e.wheelDelta) {
							delta = e.wheelDelta;
						} else if ('detail' in e) {
							delta = (-e.detail * 40);
						}
						if (e.shiftKey) {
							// 缩放
							if (lto1) {
								clearTimeout(lto1);
							}
							lto1 = setTimeout(function() {
								scope.zoom(delta);
								lto1 = null;
							}, 30);
							return
						}
						if (lto) {
							clearTimeout(lto);
							sw += delta;
						} else {
							sw = delta;
						}
						lto = setTimeout(function() {
							scope.cIndex(scope.currentIndex + (-sw/120));
							lto = null;
						}, 50);
					});

					var keydowne = function(evt) {
						var which = angular.isDefined(evt.which) ? evt.which : evt.keyCode;
						if (which == 38 || which == 37) {
							scope.prevImg();
							evt.preventDefault();
							evt.stopPropagation();
						} else if (which == 39 || which == 40) {
							scope.nextImg();
							evt.preventDefault();
							evt.stopPropagation();
						}
					};
					var resizetmo;
					var resize = function() {
						if (resizetmo) clearTimeout(resizetmo);
						resizetmo = setTimeout(function() {
							imageview && imageview.resized();
						}, 20);
					};
					$document.on('keydown', keydowne);

					var iwindow = angular.element(window);
					iwindow.on('resize', resize);
				}
			};
		}
	])

	.provider('$imageViewer', function () {

		var newOverlay = function() {
			return angular.element('<div class="overlay imageViewerOverlay"></div>');
		};

		var $imageViewerProvider = {
			
			options: {
				parseImgs: function(imgs, w, h) {
					w || (w = 600);
					h || (h = 600);
					var src;
					imgs.forEach(function(item) {
						src = item.src;
						item.bsrc = src + '?w=' + w + '&h=' + h;
						item.oriUrl = src;
						item.name = src;
					});
				}
			},

			$get: ['$rootScope', '$q', '$compile', '$timeout',
				function ($rootScope, $q, $compile, $timeout) {

					var $imgViewer = {};

					$imgViewer.open = function(i, imgs, options) {
						options = angular.extend({}, $imageViewerProvider.options, options);

						var modalScope = (options.scope || $rootScope).$new();
						modalScope.imgs = imgs;
						modalScope.options = options;

						var overlay = newOverlay();
						var modalDomEl = $compile(angular.element('<div ngd-imageviewer></div>'))(modalScope);
						var body = angular.element(document.body);
						body.append(overlay);
						body.append(modalDomEl);

						modalScope.overlay = overlay;

						$timeout(function() {
							modalScope.cIndex(i);
						}, 0);

					};

					return $imgViewer;
				}]
		};

		return $imageViewerProvider;
	});

});
