# jQuery Format

This is a simple JavaScript string formatting library.

## Examples

	$.format("{foo:+#5x}, {foo:.2e}, {bar}", {foo: 1.26, bar: {foo:"bar"}});

	' +0x1, 1.26e+0, {"foo":"bar"}'


	$.format("%-05d, %(0)^10.1f, %r",[1.26,{foo:"bar"}],{style:"c"});

	'00001,    1.3    , {"foo":"bar"}'


	$.format("<%= foo * 2 %> <%=h bar %>",{foo:5,bar:'<'},{style:'erb',eval:true});

	'10 &lt;'
