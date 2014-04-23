'use strict'

define(['angular'], function(angular) {

	var md = angular.module('placeholder', []);
	var supportPlaceHoder = 'placeholder' in document.createElement('input');

	if (!supportPlaceHoder) {
		md.directive('placeholder', ['$timeout', function($timeout) {
		
			return function(scope, elem, attrs) {
				var txt = attrs.placeholder;
				if (!txt) return;
				var modelT = attrs.ngModel;
				elem.on('focus', function() {
					if (modelT ? !scope.$eval(modelT) : (elem.val() === txt)) {
						elem.val('');
					}
					scope.$apply();
				});

				elem.on('blur', function() {
					if (elem.val() === '') {
						elem.val(txt);
					}
					scope.$apply();
				});

				$timeout(function() {
					if (!elem.val()) elem.val(txt);
					scope.$apply();
				});
			}
			
		}])
	}

	return md;

})
