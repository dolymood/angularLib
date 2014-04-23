define(['./flow', './fusty-flow'], function(a, FustyFlow) {
	function fustyFlowFactory(opts) {
		var flow = new Flow(opts);
		if (flow.support) {
			return flow;
		}
		return new FustyFlow(opts);
	}
	window.fustyFlowFactory = fustyFlowFactory;
	return fustyFlowFactory;
})
