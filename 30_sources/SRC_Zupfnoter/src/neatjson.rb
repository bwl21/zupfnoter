require 'json'
module JSON

	%x{function neatJSON(value,opts){
	opts = opts || {}
	if (!('wrap'          in opts)) opts.wrap = 80;
	if (opts.wrap==true) opts.wrap = -1;
	if (!('indent'        in opts)) opts.indent = '  ';
	if (!('arrayPadding'  in opts)) opts.arrayPadding  = ('padding' in opts) ? opts.padding : 0;
	if (!('objectPadding' in opts)) opts.objectPadding = ('padding' in opts) ? opts.padding : 0;
	if (!('beforeComma'   in opts)) opts.beforeComma   = ('aroundComma' in opts) ? opts.aroundComma : 0;
	if (!('afterComma'    in opts)) opts.afterComma    = ('aroundComma' in opts) ? opts.aroundComma : 0;
	if (!('beforeColon'   in opts)) opts.beforeColon   = ('aroundColon' in opts) ? opts.aroundColon : 0;
	if (!('afterColon'    in opts)) opts.afterColon    = ('aroundColon' in opts) ? opts.aroundColon : 0;
	if (!('beforeColon1'  in opts)) opts.beforeColon1  = ('aroundColon1' in opts) ? opts.aroundColon1 : ('beforeColon' in opts) ? opts.beforeColon : 0;
	if (!('afterColon1'   in opts)) opts.afterColon1   = ('aroundColon1' in opts) ? opts.aroundColon1 : ('afterColon'  in opts) ? opts.afterColon  : 0;
	if (!('beforeColonN'  in opts)) opts.beforeColonN  = ('aroundColonN' in opts) ? opts.aroundColonN : ('beforeColon' in opts) ? opts.beforeColon : 0;
	if (!('afterColonN'   in opts)) opts.afterColonN   = ('aroundColonN' in opts) ? opts.aroundColonN : ('afterColon'  in opts) ? opts.afterColon  : 0;

	var apad   = repeat(' ',opts.arrayPadding),
	    opad   = repeat(' ',opts.objectPadding),
	    comma  = repeat(' ',opts.beforeComma)+','+repeat(' ',opts.afterComma),
	    colon1 = repeat(' ',opts.beforeColon1)+':'+repeat(' ',opts.afterColon1),
	    colonN = repeat(' ',opts.beforeColonN)+':'+repeat(' ',opts.afterColonN);

	var build = memoize();
	return build(value,'');

	function memoize(){
		var memo = new Map;
		return function(o,indent){
			var byIndent=memo.get(o);
			if (!byIndent) memo.set(o,byIndent={});
			if (!byIndent[indent]) byIndent[indent] = rawBuild(o,indent);
			return byIndent[indent];
		}
	}

	function rawBuild(o,indent){
		if (o===null || o===undefined) return indent+'null';
		else{
			if (typeof o==='number'){
				var isFloat = (o === +o && o !== (o|0));
				return indent + ((isFloat && ('decimals' in opts)) ? o.toFixed(opts.decimals) : (o+''));
			}else if (o instanceof Array){
				if (!o.length) return indent+"[]";
				var pieces  = o.map(function(v){ return build(v,'') });
				var oneLine = indent+'['+apad+pieces.join(comma)+apad+']';
				if (opts.wrap===false || oneLine.length<=opts.wrap) return oneLine;
				if (opts.short){
					var indent2 = indent+' '+apad;
					pieces = o.map(function(v){ return build(v,indent2) });
					pieces[0] = pieces[0].replace(indent2,indent+'['+apad);
					pieces[pieces.length-1] = pieces[pieces.length-1]+apad+']';
					return pieces.join(',\n');
				}else{
					var indent2 = indent+opts.indent;
					return indent+'[\n'+o.map(function(v){ return build(v,indent2) }).join(',\n')+'\n'+(opts.indentLast?indent2:indent)+']';
				}
			}else if (o instanceof Object){
				var sortedKV=[],i=0;
				var sort = opts.sort || opts.sorted;
				for (var k in o){
					var kv = sortedKV[i++] = [k,o[k]];
					if (sort===true) kv[2] = k;
					else if (typeof sort==='function') kv[2]=sort(k,o[k],o);
				}
				if (!sortedKV.length) return indent+'{}';
				if (sort) sortedKV = sortedKV.sort(function(a,b){ a=a[2]; b=b[2]; return a<b?-1:a>b?1:0 });
				var keyvals=sortedKV.map(function(kv){ return [JSON.stringify(kv[0]), build(kv[1],'')] });
debugger;
				if (opts.sorted) keyvals = keyvals.sort(function(kv1,kv2){ kv1=kv1[0]; kv2=kv2[0]; return kv1<kv2?-1:kv1>kv2?1:0 });
				keyvals = keyvals.map(function(kv){ return kv.join(colon1) }).join(comma);
				var oneLine = indent+"{"+opad+keyvals+opad+"}";
				if (opts.wrap===false || oneLine.length<opts.wrap) return oneLine;
				if (opts.short){
					keyvals = sortedKV.map(function(kv){ return [indent+' '+opad+JSON.stringify(kv[0]), kv[1]] });
					keyvals[0][0] = keyvals[0][0].replace(indent+' ',indent+'{');
					if (opts.aligned){
						var longest = 0;
						for (var i=keyvals.length;i--;) if (keyvals[i][0].length>longest) longest = keyvals[i][0].length;
						var padding = repeat(' ',longest);
						for (var i=keyvals.length;i--;) keyvals[i][0] = padRight(padding,keyvals[i][0]);
					}
					for (var i=keyvals.length;i--;){
						var k=keyvals[i][0], v=keyvals[i][1];
						var indent2 = repeat(' ',(k+colonN).length);
						var oneLine = k+colonN+build(v,'');
						keyvals[i] = (opts.wrap===false || oneLine.length<=opts.wrap || !v || typeof v!="object") ? oneLine : (k+colonN+build(v,indent2).replace(/^\s+/,''));
					}
					return keyvals.join(',\n') + opad + '}';
				}else{
					var keyvals=[],i=0;
					for (var k in o) keyvals[i++] = [indent+opts.indent+JSON.stringify(k),o[k]];
					keyvals = sortedKV.map(function(kv){ return [indent+' '+opad+JSON.stringify(kv[0]), kv[1]] });


					if (sort) keyvals = keyvals.sort(function(kv1,kv2){ kv1=kv1[0]; kv2=kv2[0]; return kv1<kv2?-1:kv1>kv2?1:0 });
					if (opts.aligned){
						var longest = 0;
						for (var i=keyvals.length;i--;) if (keyvals[i][0].length>longest) longest = keyvals[i][0].length;
						var padding = repeat(' ',longest);
						for (var i=keyvals.length;i--;) keyvals[i][0] = padRight(padding,keyvals[i][0]);
					}
					var indent2 = indent+opts.indent;
					for (var i=keyvals.length;i--;){
						var k=keyvals[i][0], v=keyvals[i][1];
						var oneLine = k+colonN+build(v,'');
						keyvals[i] = (opts.wrap===false || oneLine.length<=opts.wrap || !v || typeof v!="object") ? oneLine : (k+colonN+build(v,indent2).replace(/^\s+/,''));
					}
					return indent+'{\n'+keyvals.join(',\n')+'\n'+(opts.indentLast?indent2:indent)+'}'
				}
			}else{
				return indent+JSON.stringify(o);
			}
		}
	}

	function repeat(str,times){ // http://stackoverflow.com/a/17800645/405017
		var result = '';
		while(true){
			if (times & 1) result += str;
			times >>= 1;
			if (times) str += str;
			else break;
		}
		return result;
	}

	function padRight(pad, str){
		return (str + pad).substring(0, pad.length);
	}
}

}

	def self.neat_generate(object, opts={})
		opts[:sort] = lambda{|k,v,o| result = opts[:sortxx][k] || 9999;  ; result }

		outputjs = %x{neatJSON(JSON.parse(JSON.stringify(#{object.to_n})), #{opts.to_n})} #{ wrap:40, short:false, aligned:true, padding:1, afterComma:1, aroundColonN:1, sort:true })}
	`debugger`
		outputjs
	end
	# Generate the JSON string representation for an object,
	# with a variety of formatting options.
	#
	# @author Gavin Kistner <!@phrogz.net>
	# @param object [Object] the object to serialize
	# @param opts [Hash] the formatting options
	# @option opts [Integer] :wrap        (80)    The maximum line width before wrapping. Use `false` to never wrap, or `true` to always wrap.
	# @option opts [String]  :indent      ("  ")  Whitespace used to indent each level when wrapping (without the :short option).
	# @option opts [Boolean] :indent_last (false) Indent the closing bracket for arrays and objects (without the :short option).
	# @option opts [Boolean] :short       (false) Keep the output 'short' when wrapping, putting opening brackets on the same line as the first value, and closing brackets on the same line as the last item.
	# @option opts [Boolean] :sorted      (false) Sort the keys for objects to be in alphabetical order.
	# @option opts [Boolean] :aligned     (false) When wrapping objects, align the colons (only per object).
	# @option opts [Integer] :decimals     (null) Decimal precision to use for floats; omit to keep numberic values precise.
	# @option opts [Integer] :padding         (0) Number of spaces to put inside brackets/braces for both arrays and objects.
	# @option opts [Integer] :array_padding   (0) Number of spaces to put inside brackets for arrays. Overrides `:padding`.
	# @option opts [Integer] :object_padding  (0) Number of spaces to put inside braces for objects. Overrides `:padding`.
	# @option opts [Integer] :around_comma    (0) Number of spaces to put before/after commas (for both arrays and objects).
	# @option opts [Integer] :before_comma    (0) Number of spaces to put before commas (for both arrays and objects).
	# @option opts [Integer] :after_comma     (0) Number of spaces to put after commas (for both arrays and objects).
	# @option opts [Integer] :around_colon    (0) Number of spaces to put before/after colons (for objects).
	# @option opts [Integer] :before_colon    (0) Number of spaces to put before colons (for objects).
	# @option opts [Integer] :after_colon     (0) Number of spaces to put after colons (for objects).
	# @option opts [Integer] :around_colon_1  (0) Number of spaces to put before/after colons for single-line objects.
	# @option opts [Integer] :before_colon_1  (0) Number of spaces to put before colons for single-line objects.
	# @option opts [Integer] :after_colon_1   (0) Number of spaces to put after colons for single-line objects.
	# @option opts [Integer] :around_colon_n  (0) Number of spaces to put before/after colons for multi-line objects.
	# @option opts [Integer] :before_colon_n  (0) Number of spaces to put before colons for multi-line objects.
	# @option opts [Integer] :after_colon_n   (0) Number of spaces to put after colons for multi-line objects.
	# @return [String] the JSON representation of the object.
	def self.neat_generate1(object,opts={})
		opts[:wrap] = 80 unless opts.key?(:wrap)
		opts[:wrap] = -1 if opts[:wrap]==true
		opts[:indent]         ||= "  "
		opts[:array_padding]  ||= opts[:padding]      || 0
		opts[:object_padding] ||= opts[:padding]      || 0
		opts[:after_comma]    ||= opts[:around_comma] || 0
		opts[:before_comma]   ||= opts[:around_comma] || 0
		opts[:before_colon]   ||= opts[:around_colon] || 0
		opts[:after_colon]    ||= opts[:around_colon] || 0
		opts[:before_colon_1] ||= opts[:around_colon_1] || opts[:before_colon] || 0
		opts[:after_colon_1]  ||= opts[:around_colon_1] || opts[:after_colon]  || 0
		opts[:before_colon_n] ||= opts[:around_colon_n] || opts[:before_colon] || 0
		opts[:after_colon_n]  ||= opts[:around_colon_n] || opts[:after_colon]  || 0
		raise ":indent option must only be whitespace" if opts[:indent]=~/\S/

		apad  = " " * opts[:array_padding]
		opad  = " " * opts[:object_padding]
		comma = "#{' '*opts[:before_comma]},#{' '*opts[:after_comma]}"
		colon1= "#{' '*opts[:before_colon_1]}:#{' '*opts[:after_colon_1]}"
		colonn= "#{' '*opts[:before_colon_n]}:#{' '*opts[:after_colon_n]}"

		memoizer = {}
		build = ->(o,indent) do

			if opts[:explicit_sort] && o.is_a?(Hash)
				pre = opts[:explicit_sort].first
				post = opts[:explicit_sort].last
				opts[:sorted] ? okeys = o.keys.sort: o.keys
				sortfields = (pre + (okeys - pre - post) + post).uniq.map{|i| i.to_s.inspect}
			end

			memoizer[[o,indent]] ||= case o
				when String,Integer       then "#{indent}#{o.inspect}"
				when Symbol               then "#{indent}#{o.to_s.inspect}"
				when TrueClass,FalseClass then "#{indent}#{o}"
				when NilClass             then "#{indent}null"
				when Float
					if (o==o.to_i) && (o.to_s !~ /e/)
						build[o.to_i,indent]
					elsif opts[:decimals]
						"#{indent}%.#{opts[:decimals]}f" % o
					else
						"#{indent}#{o}"
					end

				when Array
					pieces = o.map{ |v| build[v,''] }
					one_line = "#{indent}[#{apad}#{pieces.join comma}#{apad}]"
					if o.empty?
						"#{indent}[]"
					elsif !opts[:wrap] || (one_line.length <= opts[:wrap])
						one_line
					elsif opts[:short]
						indent2 = "#{indent} #{apad}"
						pieces = o.map{ |v| build[ v,indent2 ] }
						pieces[0].sub! indent2, "#{indent}[#{apad}"
						pieces.last << apad << "]"
						pieces.join ",\n"
					else
						indent2 = "#{indent}#{opts[:indent]}"
						"#{indent}[\n#{o.map{ |v| build[ v, indent2 ] }.join ",\n"}\n#{opts[:indent_last] ? indent2 : indent}]"
					end

				when Hash
					keyvals = o.map{ |k,v| [ k.to_s.inspect, build[v,''] ] }
					keyvals = keyvals.sort_by(&:first) if opts[:sorted]
					keyvals = keyvals.sort{|a,b| sortfields.index(a.first.strip) <=> sortfields.index(b.first.strip)} if opts[:explicit_sort]
					keyvals = keyvals.map{ |kv| kv.join(colon1) }.join(comma)
					one_line = "#{indent}{#{opad}#{keyvals}#{opad}}"
					if o.empty?
						"#{indent}{}"
					elsif !opts[:wrap] || (one_line.length <= opts[:wrap])
						one_line
					else
						if opts[:short]
							keyvals = o.map{ |k,v| ["#{indent} #{opad}#{k.to_s.inspect}",v] }
							keyvals = keyvals.sort_by(&:first) if opts[:sorted]
							keyvals = keyvals.sort{|a,b| sortfields.index(a.first.strip) <=> sortfields.index(b.first.strip)} if opts[:explicit_sort]
							keyvals[0][0].sub! "#{indent} ", "#{indent}{"
							if opts[:aligned]
								longest = keyvals.map(&:first).map(&:length).max
                keyvals = keyvals.map{|k, v| ["%-#{longest}s" % k, v] }
							end
							keyvals.map! do |k,v|
								indent2 = " "*"#{k}#{colonn}".length
								one_line = "#{k}#{colonn}#{build[v,'']}"
								if opts[:wrap] && (one_line.length > opts[:wrap]) && (v.is_a?(Array) || v.is_a?(Hash))
									"#{k}#{colonn}#{build[v,indent2].lstrip}"
								else
									one_line
								end
							end
							keyvals.join(",\n") << opad << "}"
						else
							keyvals = o.map{ |k,v| ["#{indent}#{opts[:indent]}#{k.to_s.inspect}",v] }
							keyvals = keyvals.sort_by(&:first) if opts[:sorted]
							keyvals = keyvals.sort{|a,b| sortfields.index(a.first.strip) <=> sortfields.index(b.first.strip)} if opts[:explicit_sort]
							if opts[:aligned]
								longest = keyvals.map(&:first).map(&:length).max
                keyvals = keyvals.map{|k, v| ["%-#{longest}s" % k, v] }
							end
							indent2 = "#{indent}#{opts[:indent]}"
							keyvals.map! do |k,v|
								one_line = "#{k}#{colonn}#{build[v,'']}"
								if opts[:wrap] && (one_line.length > opts[:wrap]) && (v.is_a?(Array) || v.is_a?(Hash))
									"#{k}#{colonn}#{build[v,indent2].lstrip}"
								else
									one_line
								end
							end
							"#{indent}{\n#{keyvals.join(",\n")}\n#{opts[:indent_last] ? indent2 : indent}}"
						end
					end

				else
					"#{indent}#{o.to_json(opts)}"
			end
		end

		build[object,'']
	end
end

