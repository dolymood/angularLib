define(['angular', './init'], function() {

angular.module('flow.transfers', ['flow.init'])
.directive('flowTransfers', [function() {
	return {
		'scope': true,
		'require': '^flowInit',
		'link': function(scope) {
			scope.transfers = scope.$flow.files;
			scope.parsedTransfers = scope.$flow.parsedFiles;
		}
	};
}]);

})

