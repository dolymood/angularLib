'use strict'

define(['angular'], function(angular) {

	return angular.module('selection', [])
		.directive('ngdSelection', function() {

			var selectSE = function(ele, start, end) {
				if (ele.setSelectionRange) {
					ele.focus();
					ele.setSelectionRange(start, end);
				} else if ('selectionStart' in ele) {
					ele.selectionStart = start;
					ele.selectionEnd = end;
					ele.focus();
				} else if (ele.createTextRange) {
					var range = ele.createTextRange();
					range.collapse(true);
					range.moveEnd('character', end);
					range.moveStart('character', start);
					range.select();
				}
			};

			return {
				scope: {},

				link: function($scope, ele, attrs) {
					setTimeout(function() {
						var start = $scope.$parent.$eval(attrs.sln);
						var end = $scope.$parent.$eval(attrs.slnEnd);
						if (!angular.isNumber(start)) start = 0;
						if (!angular.isNumber(end)) end = ele.val().length;
						selectSE(ele[0], start, end);
					}, 100)

				}
			}
		})

})
