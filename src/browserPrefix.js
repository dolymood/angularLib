'use strict'

define(function(){

	var dummyStyle = document.createElement('div').style,
		vendor = function() {
			var vendors = 't,webkitT,MozT,msT,OT'.split(','),
				t,
				i = 0,
				l = vendors.length;

			for ( ; i < l; i++ ) {
				t = vendors[i] + 'ransform';
				if (t in dummyStyle) {
					return vendors[i].substr(0, vendors[i].length - 1);
				}
			}

			return false;
		}(),
		cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',
		
		prefixStyle = function(style) {
			if (vendor === '') return style;

			style = style.charAt(0).toUpperCase() + style.substr(1);
			return vendor + style;
		};
	
	var BrowserPrefix = {

		/**
		 * 返回当前的架上前缀之后的style
		 * @param style {String} style
		 * @return {String} prefixStyle
		 *
		 * @example
		 * prefixStyle('transform') => 'transform'|'webkitTransform'|'MozTransform'|'msTransform'|'OTransform'
		 *                          => 得到之后的值用于设置ele.style[XXX] = 'xxx'
		 */
		prefixStyle: prefixStyle,

		/**
		 * 前缀
		 * @return {String|Boolean}
		 *
		 * @example
		 * vendor() => ''|'webkit'|'Moz'|'ms'|'O'
		 */
		vendor: function() {
			return vendor;
		},

		/**
		 * 当设置css字符串时使用
		 * @return {String}
		 *
		 * @example
		 * cssVendor() + 'transform' => 'transform'|'-webkit-transform'|'-moz-transform'|'-ms-transform'|'-o-transform'
		 * ele.style.cssText = cssVendor() + ': translate(0, 10)'
		 */
		cssVendor: function() {
			return cssVendor;
		}

	}

	return BrowserPrefix
})