'use strict'

define(['angular'], function(angular) {

	var md = angular.module('placeholder', []);
	var supportPlaceHoder = 'placeholder' in document.createElement('input');

	if (!supportPlaceHoder) {
		var changeInputType = function(oldObject, oType) {
			var newObject = document.createElement('input');
			newObject.type = oType;
			if(oldObject.className) newObject.className = oldObject.className;
			oldObject.parentNode.insertBefore(newObject, oldObject);
			return newObject;
		}
		md.directive('placeholder', ['$timeout', function($timeout) {
		
			return function(scope, elem, attrs) {
				var txt = attrs.placeholder;
				if (!txt) return;
				var newInput;
				newInput = angular.element(changeInputType(elem[0], 'text'));
				newInput.val(txt);
				newInput.on('focus', function() {
					newInput.css('display', 'none');
					elem.css('display', 'inline-block')[0].focus();
				});
				elem.css('display', 'none');

				var modelT = attrs.ngModel;

				elem.on('focus', function() {
					if (modelT ? !scope.$eval(modelT) : !elem.val()) {
						elem.val('');
					}
					scope.$apply();
				});

				elem.on('blur', function() {
					if (elem.val() === '') {
						newInput.css('display', 'inline-block');
						elem.css('display', 'none');
					}
					scope.$apply();
				});

				$timeout(function() {
					if (!elem.val()) {
						newInput.css('display', 'inline-block');
						elem.css('display', 'none');
					} else {
						newInput.css('display', 'none');
						elem.css('display', 'inline-block');
					}
					scope.$apply();
				});
			}
			
		}])
	}

	return md;

})
