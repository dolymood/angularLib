'use strict'

define(['angular'], function(angular) {

	angular.module('enter', [])

	.directive('ngdEnter', [
			'$parse',
			function($parse) {
			
				return function($scope, iEle, iAttrs) {
					var handler = $parse(iAttrs.ngdEnter);
					var keydowne = function(evt) {
						var which = angular.isDefined(evt.which) ? evt.which : evt.keyCode;
						if (which == 13) {
							handler($scope, {$event:evt})
						}
					};
					iEle.on('keydown', keydowne);
				};

			}
		]
	);

});