'use strict'

define(['angular'], function(angular) {

	angular.module('keydown', [])

	.directive('ngdKeydown', [
			'$parse',
			function($parse) {
			
				return function($scope, iEle, iAttrs) {
					var handler = $parse(iAttrs.ngdKeydown);
					var keyCode = iAttrs.keyCode;
					if (keyCode === '' || typeof keyCode === 'undefined') {
						keyCode = 13;
					}
					keyCode = keyCode - 0;
					var keydowne = function(evt) {
						var which = angular.isDefined(evt.which) ? evt.which : evt.keyCode;
						if (which == keyCode) {
							handler($scope, {$event:evt})
						}
					};
					iEle.on('keydown', keydowne);
				};

			}
		]
	);

});