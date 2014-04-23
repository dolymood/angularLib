define([
		'./flow',
		'./fusty-flow-factory',
		'./provider',
		'./directives/init',
		'./directives/btn',
		'./directives/drag-events',
		'./directives/drop',
		'./directives/events',
		'./directives/img',
		'./directives/transfers'
	],
	function() {
	angular.module('flow', ['flow.provider', 'flow.init', 'flow.events', 'flow.btn',
	'flow.drop', 'flow.transfers', 'flow.img', 'flow.dragEvents']);
})
