(typeof(jQuery) === "undefined" ? window : jQuery).format = (function (undefined) {
	"use strict";

	var FORMAT_MAP = {
		number:    'g',
		string:    's',
		'boolean': 's',
		object:    's',
		undefined: 's'
	};

	function padd (s,width,fill,align,prec) {
		if (s.length >= width) {
			if (prec !== undefined) s = s.slice(0,prec);
			return s;
		}
		var padding = new Array(width-s.length+1).join(fill);
		switch (align) {
			case '^':
				var i = Math.floor(padding.length / 2);
				return padding.slice(0,i) + s + padding.slice(i);
			case '<': return s + padding;
			default:  return padding + s;
		}
	}

	function numpadd (value, neg, prefix, sign, width, fill, align) {
		if (align === '=') {
			if (sign !== '-' || neg) {
				-- width;
			}
			width -= prefix.length;
			value = prefix+padd(value, width, '0', '>');
			switch (sign) {
				case '+': value = (neg?'-':'+')+value; break;
				case ' ': value = (neg?'-':' ')+value; break;
				default: if (neg) value = '-'+value;
			}
		}
		else {
			value = prefix+value;
			switch (sign) {
				case '+': value = (neg?'-':'+')+value; break;
				case ' ': value = (neg?'-':' ')+value; break;
				default: if (neg) value = '-'+value;
			}
			value = padd(value, width, fill, align);
		}
		return value;
	}

	function thousands (s,sep) {
		var buf = [];
		for (var i = s.length - 3; i >= 0; i -= 3) {
			buf.unshift(s.slice(i,i+3));
		}
		if (i > -3) {
			buf.unshift(s.slice(0,3+i));
		}
		
		return buf.join(sep);
	}

	function intfmt (value, width, fill, align, sign, prefix, base, sep_t, t_sep, upper) {
		value = parseInt(value);
		if (isNaN(value)) {
			return padd(String(value), width, fill, !align||align==='=' ? '>' : align);
		}		
		var neg = value < 0;
		value = (neg ? -value : value).toString(base);

		if (sep_t) {
			value = thousands(value,t_sep);
		}
		
		value = numpadd(value, neg, prefix, sign, width, fill, align);

		if (upper) {
			value = value.toUpperCase();
		}
		return value;
	}

	function floatfmt (value, width, fill, align, sign, prec, type, sep_t, t_sep, d_sep) {
		value = parseFloat(value);
		if (isNaN(value) || value === Infinity || value === -Infinity) {
			return padd(String(value), width, fill, !align||align==='=' ? '>' : align);
		}		
		var neg = value < 0;
		if (neg) value = -value;
		switch (type) {
		case '%':
			value *= 100;
		case 'f':
			value = value.toFixed(prec === undefined ? 20 : prec);
			break;
		case 'e':
			value = value.toExponential(prec === undefined ? 20 : prec);
			break;
		case 'g':
			value = value.toPrecision(prec === undefined ? 21 : prec);
		}

		if (sep_t) {
			var pos = value.search(/[\.e]/i);
			if (pos < 0) {
				value = thousands(value,t_sep);
			}
			else {
				value = thousands(value.slice(0,pos),t_sep) + value.slice(pos).replace(/\./g, d_sep);
			}
		}
		else {
			value = value.replace(/\./g, d_sep);
		}
		if (type === '%') {
			value += '%';
		}

		return numpadd(value, neg, '', sign, width, fill, align);
	}

	function format_field (value, conv, type, width, fill, align, sign, base_prefix, prec, sep_t, t_sep, d_sep) {
		if (conv === 's') {
			value = String(value);
		}
		else if (conv === 'r' || !conv && typeof(value) === "object") {
			value = JSON.stringify(value);
		}

		if (!type) type = FORMAT_MAP[typeof(value)];
		
		switch (type) {
			case 's':
				return padd(String(value), width, fill, !align||align==='=' ? '<' : align, prec);
			case 'd':
				return intfmt(value, width, fill, align, sign, '', 10, sep_t, t_sep);
			case 'b':
				return intfmt(value, width, fill, align, sign, base_prefix ? '0b' : '',  2, sep_t, t_sep);
			case 'o':
				return intfmt(value, width, fill, align, sign, base_prefix ?  '0' : '',  8, sep_t, t_sep);
			case 'x':
				return intfmt(value, width, fill, align, sign, base_prefix ? '0x' : '', 16, sep_t, t_sep);
			case 'X':
				return intfmt(value, width, fill, align, sign, base_prefix ? '0X' : '', 16, sep_t, t_sep, true);
			case 'c':
				return padd(String.fromCharCode(parseInt(value)), width, fill, !align||align==='=' ? '<' : align, prec);
			case 'e':
			case 'f':
			case 'g':
			case '%':
				return floatfmt(value, width, fill, align, sign, prec, type, sep_t, t_sep, d_sep);
			case 'n':
				return floatfmt(value, width, fill, align, sign, prec, 'g', sep_t, t_sep, d_sep);
			case 'E':
			case 'F':
			case 'G':
				return floatfmt(value, width, fill, align, sign, prec, type.toLowerCase(), sep_t, t_sep, d_sep).toUpperCase();
			default:
				throw new SyntaxError("Illegal format character: "+type);
		}
	}

	var STYLES = {
		simple: function (fmt, args, opts) {
			var index = 0;
			return fmt.replace(/\{[^\{\}]*\}|\{\{|\}\}|\{|\}/g, function (found) {
				switch (found) {
					case '{{': return '{';
					case '}}': return '}';
					case '{': throw new SyntaxError("Single '{' encountered in format string");
					case '}': throw new SyntaxError("Single '}' encountered in format string");
					default:
						var key = found.slice(1,found.length-1);
						if (!key) {
							key = index ++;
						}
						if (key in args) {
							return String(args[key]);
						}
						else {
							throw new ReferenceError(key+" is not defined");
						}
				}
			});
		},
		python: function (fmt, args, opts) {
			var t_sep = opts.thousands_sep;
			var d_sep = opts.decimal_sep;
			var index = 0;
			return fmt.replace(/\{[^\{\}]*\}|\{\{|\}\}|\{|\}/g, function (found) {
				switch (found) {
					case '{{': return '{';
					case '}}': return '}';
					case '{': throw new SyntaxError("Single '{' encountered in format string");
					case '}': throw new SyntaxError("Single '}' encountered in format string");
					default:
						var f = found.slice(1,found.length-1);
						var m = /^([^!:]*)(?:!([rs]))?(?::(?:(.)?([<>=^]))?([-+ ])?(#)?(0)?([0-9]+)?(,)?(?:\.([0-9]+))?([bcdoxXneEfFgG%s])?)?$/.exec(f);
						if (!m) {
							throw new SyntaxError("Illegal format string: "+f);
						}
						var key = m[1];
						var value;

						if (!key) {
							key = [index ++];
						}
						else {
							key = key.replace(/\[([^\[\]]*)\]/g, '.$1');
							if (/[\[\]]/.test(key)) {
								throw new SyntaxError("Illegal format string key syntax: "+m[1]);
							}
							key = key.split(/\./g);
						}
						value = args;
						for (var i = 0; i < key.length; ++ i) {
							var k = key[i];
							if (k in value) {
								value = value[k];
							}
							else {
								throw new ReferenceError("Cannot resolve format string key: "+key.join("."));
							}
						}

						var conv  = m[2];
						var fill  = m[3];
						var align = m[4];
						var sign  = m[5]||'-';
						var base_prefix = m[6] === '#';
						
						if (m[7] === '0') {
							align = '=';
							fill  = '0';
						}
						if (!fill) fill = ' ';

						var width = parseInt(m[8]) || 0;
						var sep_t = m[9] === ',';
						var prec  = m[10] ? parseInt(m[10]) : undefined;
						var type  = m[11];

						return format_field(value, conv, type, width, fill, align, sign, base_prefix, prec, sep_t, t_sep, d_sep);
				}
			});
		},
		// actually old python format strings + ruby format strings
		c: function (fmt, args, opts) {
			var t_sep = opts.thousands_sep;
			var d_sep = opts.decimal_sep;
			var index = 0;
			return fmt.replace(/%%|%\{([^\}]*)\}|%(?:\(([^\)]*)\))?(?:(.)?([<>=^]))?([-+ ])?(#)?(0)?([0-9]+)?(,)?(?:\.([0-9]+))?([bcdoxXneEfFgG%sr])/g, function (
					all, ruby_key, python_key, fill, align, sign, base_prefix, zero_fill, width, sep_t, prec, type) {
				if (all === '%%') return '%';
				else if (ruby_key !== undefined) {
					if (ruby_key in args) {
						return String(args[ruby_key]);
					}
					else {
						throw new ReferenceError("Cannot resolve format string key: "+ruby_key);
					}
				}
				else {
					var value;
					if (python_key === undefined) {
						python_key = index ++;
					}
					if (python_key in args) {
						value = args[python_key];
					}
					else {
						throw new ReferenceError("Cannot resolve format string key: "+python_key);
					}

					base_prefix = base_prefix === '#';
					if (zero_fill === '0') {
						align = '=';
						fill  = '0';
					}
					else if (!align) {
						// compat with '-' for right align
						align = sign === '-' ? '>' : '<';
					}
					if (!sign) sign = '-';
					if (!fill) fill = ' ';
					width = parseInt(width) || 0;
					sep_t = sep_t === ',';
					prec = prec ? parseInt(prec) : undefined;
					var conv;

					if (type === 'r') {
						conv = 'r';
						type = 's';
					}
					else {
						conv = 's';
					}

					return format_field(value, conv, type, width, fill, align, sign, base_prefix, prec, sep_t, t_sep, d_sep);
				}
			});
		},
		erb: function (fmt, args, opts) {
			var t_sep = opts.thousands_sep;
			var d_sep = opts.decimal_sep;
			var pattern = /<%=\s*(h)?\s*(\S.*?)\s*%>/g;

			if (opts.eval) {
				var argnames = [];
				var argvals  = [];
				for (var name in args) {
					argnames.push(name);
					argvals.push(args[name]);
				}
				return fmt.replace(pattern, function (all, h, code) {
					var params = argnames.slice();
					params.push('return ('+code+');');
					var f = Function.constructor.apply(Function,params);
					var value = f.apply(args,argvals);
					if (value === null || value === undefined) {
						return '';
					}
					value = String(value);
					if (h) {
						value = escapeHtml(value);
					}
					return value;
				});
			}
			else {
				return fmt.replace(pattern, function (all, h, key) {
					if (key in args) {
						var value = args[key];
						if (value === null || value === undefined) {
							return '';
						}
						value = String(value);
						if (h) {
							value = escapeHtml(value);
						}
						return value;
					}
					else {
						throw new ReferenceError("Cannot resolve format string key: "+key);
					}
				});
			}
		}
	};

	var HTML_ESC_MAP = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&apos;'
	};

	function escapeHtml (s) {
		return s.replace(/[&<>"']/g, function (c) {
			return HTML_ESC_MAP[c];
		});
	}

	function format (fmt, args, opts) {
		if (!opts) opts = {};
		if (!opts.thousands_sep) opts.thousands_sep = format.thousands_sep || ',';
		if (!opts.decimal_sep)   opts.decimal_sep   = format.decimal_sep   || '.';
		var style = opts.style || format.default_style || 'python';
		
		if (typeof(style) !== "function") {
			style = STYLES[style];
		}

		return style(fmt, args||{}, opts);
	}

	format.format_field = format_field;
	format.styles = STYLES;
	format.escapeHtml = escapeHtml;

	return format;
})();
