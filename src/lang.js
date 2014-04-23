'use strict'

define(['angular'], function(angular) {

	/***************** 开始语法补丁 *****************/
	// 参考司徒正美的avalon.js
	// https://github.com/RubyLouvre/avalon
	if (!'k'.trim) {
		String.prototype.trim = function() {
			return this.replace(/^[\s\xA0]+/, '').replace(/[\s\xA0]+$/, '')
		}
	}

	function iterator(vars, body, ret) {
		var fun = 'for(var ' + vars + 'i=0,n = this.length; i < n; i++){' + body.replace('_', '((i in this) && fn.call(scope,this[i],i,this))') + '}' + ret
		return Function("fn,scope", fun)
	}

	var rnative = /\[native code\]/;

	if (!rnative.test([].map)) {
			var ap = {
				//定位操作，返回数组中第一个等于给定参数的元素的索引值。
				indexOf: function(item, index) {
					var n = this.length,
							i = ~~index
					if (i < 0)
						i += n
					for (; i < n; i++)
						if (this[i] === item)
							return i
					return -1
				},
				//定位引操作，同上，不过是从后遍历。
				lastIndexOf: function(item, index) {
					var n = this.length,
							i = index == null ? n - 1 : index
					if (i < 0)
						i = Math.max(0, n + i)
					for (; i >= 0; i--)
						if (this[i] === item)
							return i
					return -1
				},
				//迭代操作，将数组的元素挨个儿传入一个函数中执行。Ptototype.js的对应名字为each。
				forEach: iterator('', '_', ''),
				//迭代类 在数组中的每个项上运行一个函数，如果此函数的值为真，则此元素作为新数组的元素收集起来，并返回新数组
				filter: iterator('r=[],j=0,', 'if(_)r[j++]=this[i]', 'return r'),
				//收集操作，将数组的元素挨个儿传入一个函数中执行，然后把它们的返回值组成一个新数组返回。Ptototype.js的对应名字为collect。
				map: iterator('r=[],', 'r[i]=_', 'return r'),
				//只要数组中有一个元素满足条件（放进给定函数返回true），那么它就返回true。Ptototype.js的对应名字为any。
				some: iterator('', 'if(_)return true', 'return false'),
				//只有数组中的元素都满足条件（放进给定函数返回true），它才返回true。Ptototype.js的对应名字为all。
				every: iterator('', 'if(!_)return false', 'return true')
		}
		var aryP = Array.prototype;
		for (var k in ap) {
			aryP[k] = ap[k];
		}

	}

	if (!iterator.bind) {
		Function.prototype.bind = function(scope) {
			if (arguments.length < 2 && scope === void 0)
				return this
			var fn = this,
					argv = arguments
			return function() {
				var args = [],
										i
				for (i = 1; i < argv.length; i++)
					args.push(argv[i])
				for (i = 0; i < arguments.length; i++)
					args.push(arguments[i])
				return fn.apply(scope, args)
			}
		}
	}

	Array.prototype.each = function(fn, scope) {
		scope || (scope = null);
		for (var i = 0, len = this.length; i < len; i++) {
			if (false === fn.call(scope, this[i], i, this)) {
				break;
			}
		}
	};

	if (!'d'.format) {
		String.prototype.format = function() {
			var args = arguments;
			return this.replace(/\{(\d+)\}/g, function($0, $1){
				return args[$1] !== void 0 ? args[$1] : $0;
			});
		}
	}

	

	/***************** 结束语法补丁 *****************/

	/*********** 开始angular 扩展 ***********/
	
	// 得到event对象的pageX pageY位置
	angular.getEvtPageObj = function(event) {
		if ('pageX' in event) {
			return event
		}
		var target = event.target || event.srcElement;
		var doc = target.ownerDocument || document;
		var box = doc.compatMode === 'BackCompat' ? doc.body : doc.documentElement;
		var pageX = event.clientX + (box.scrollLeft >> 0) - (box.clientLeft >> 0);
		var pageY = event.clientY + (box.scrollTop >> 0) - (box.clientTop >> 0);
		return {
			pageX: pageX,
			pageY: pageY
		}
	};

	// 从ary数组中移除某一项
	angular.removeItemFormArray = function(item, ary) {
		var ret = false;
		ary.each(function(v, i) {
			if (v === item) {
				ary.splice(i, 1);
				ret = true;
				return false;
			}
		});
		return ret;
	};

	function getElementsByClassName (searchClass, node, tag) {
		var result = [];
		if (document.getElementsByClassName) {
			var nodes =  (node || document).getElementsByClassName(searchClass);
			for (var i=0; node = nodes[i++]; ) {
				if (tag) {
					if (tag !== '*' && node.tagName === tag.toUpperCase()) {
						result.push(node)
					}
				} else {
					result.push(node)
				}
			}
			return result;
		} else {
			node = node || document;
			tag = tag || '*';
			var classes = searchClass.split(' '),
			elements = (tag === '*' && node.all) ? node.all : node.getElementsByTagName(tag),
			patterns = [],
			current,
			match;
			var i = classes.length;
			while (--i >= 0) {
				patterns.push(new RegExp("(^|\\s)" + classes[i] + "(\\s|$)"));
			}
			var j = elements.length;
			while (--j >= 0) {
				current = elements[j];
				match = false;
				for (var k=0, kl=patterns.length; k < kl; k++) {
					match = patterns[k].test(current.className);
					if (!match)  break;
				}
				if (match) result.push(current);
			}
			return result.reverse();
		}
	}
	if (!angular.element.prototype.getElementsByClassName) {
		angular.element.prototype.getElementsByClassName = function(searchClass, tag) {
			var els = [];
			angular.forEach(this, function(value, key){
				els.push.apply(els, getElementsByClassName(searchClass, value, tag));
			});
			return angular.element(els);
		};
	}

	if (!angular.element.prototype.offset) {
		angular.element.prototype.offset = function() {
			var elem = this[0],
				docElem, win,
				box = {top: 0, left: 0},
				doc = elem && elem.ownerDocument;
			if (!doc) return;
			docElem = doc.documentElement;
			// If we don't have gBCR, just use 0,0 rather than error
			// BlackBerry 5, iOS 3 (original iPhone)
			if (typeof elem.getBoundingClientRect !== 'undefined') {
				box = elem.getBoundingClientRect();
			}
			win = doc.nodeType === 9 ? doc.defaultView || doc.parentWindow : false;
			return {
				top: box.top  + (win.pageYOffset || docElem.scrollTop)  - (docElem.clientTop  || 0),
				left: box.left + (win.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
			};
		};
	}

	angular.getScroll = function() {
		var docElem = document.documentElement;
		return {
			top: window.pageYOffset || docElem.scrollTop,
			left: window.pageXOffset || docElem.scrollLeft
		}
	}

	angular.each = function(obj, fn, scope) {
		scope = scope || null;
		if (angular.isArray(obj)) {
			return Array.prototype.each.call(obj, fn, scope);
		} else if (angular.isObject(obj)) {
			for (var k in obj) {
				if (obj.hasOwnProperty(k)) {
					if (false === fn.call(scope, obj[k], k, obj)) {
						return;
					}
				}
			}
			return;
		}
		return obj;
	};

	if (!angular.element.prototype.each) {
		angular.element.prototype.each = function(fn, scope) {
			return Array.prototype.each.call(this, fn, scope);
		};
	}

	/*********** 结束angular 扩展 ***********/
});