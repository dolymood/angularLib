'use strict'

define(['angular'], function(angular) {

	angular.module('mousewheel', [])

	.directive('ngdMousewheel', [
			'$parse',
			function($parse) {
			
				return function($scope, iEle, iAttrs) {
					var handler = $parse(iAttrs.ngdMousewheel);
					var evtName = 'mousewheel';
					try {
						document.createEvent('MouseScrollEvents')
						mousewheelName = 'DOMMouseScroll'
					} catch (e) {}
					iEle.on(evtName, function(evt) {
						var delta;
						if (evt.wheelDelta) {
							delta = evt.wheelDelta;
						} else if ('detail' in evt) {
							delta = (-evt.detail * 40);
						}
						try {
							evt.ngWheelDelta = delta;
						} catch (e) {}
						handler($scope, {$event: evt, $wheelDelta: delta});
						if (!$scope.$$phase) {
							$scope.$apply()
						}
					});
				};

			}
		]
	);

});