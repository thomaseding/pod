

var Pod = (function () {

	var returnThis = function () {
		return this;
	};


	var AddressedMemory = function (buffer, offset) {
		this._buffer = buffer;
		this._offset = offset;
	};

	AddressedMemory.prototype.bytes = function (sizeof) {
		return new Uint8Array(this._buffer, this._offset + sizeof);
	};

	AddressedMemory.prototype.view = function (offset) {
		return new DataView(this._buffer, this._offset + offset);
	};

	AddressedMemory.prototype.offsetBy = function (offset) {
		return new AddressedMemory(buffer, this._offset + offset);
	};


	var Type = function (name, sizeof) {
		if (sizeof < 0) {
			sizeof = -1;
		}
		this.sizeof = sizeof;
		this.name = name;
	};


	var NativeType = function (name, sizeof) {
		Type.call(this, name, sizeof);

		this._viewGet = "get" + name;
		this._viewSet = "set" + name;

		this.view = function (memory) {
			var type = this;
			var view = memory.view(0);

			return {
				get: function () {
					return view[type._viewGet](0);
				},
				set: function (value) {
					view[type._viewSet](0, value);
				},
			};
		};
	};

	NativeType.prototype = new Type();
	NativeType.prototype.constructor = NativeType;


	var AggrogateType = function (clazz, name, sizeof) {
		Type.call(this, name, sizeof);
		this._class = clazz;
	};

	AggrogateType.prototype = new Type();
	AggrogateType.prototype.constructor = AggrogateType;

	AggrogateType.prototype.view = function (memory) {
		return new this._class(memory);
	};
	

	var StructType = function (clazz, name, sizeof) {
		AggrogateType.call(this, clazz, name, sizeof);
	};

	StructType.prototype = new AggrogateType();
	StructType.prototype.constructor = StructType;
	

	var ListType = function (clazz, elemType, count) {
		var name = elemType.name + "_" + (count < 0 ? "Z" : count);
		var sizeof = elemType.sizeof * count;
		AggrogateType.call(this, clazz, name, sizeof);
	};

	ListType.prototype = new AggrogateType();
	ListType.prototype.constructor = ListType;


	var Member = function (offset, type) {
		this.offset = offset;
		this.type = type;
	};


	var reservedMemberNames = {
		"sizeof": null,
		"type": null,
		"memberNames": null,
		"view": null,
		"get": null,
		"set": null,
	};


	var StructInfo = function (memberNameToType) {
		var offset = 0;
		var memberNames = Object.keys(memberNameToType);

		for (var i = 0; i < memberNames.length; ++i) {
			var memberName = memberNames[i];
			if (reservedMemberNames.hasOwnProperty(memberName)) {
				throw Error();
			}

			var type = memberNameToType[memberName];
			if (!(type instanceof Type) || type.sizeof < 0) {
				throw Error();
			}

			this[memberName] = new Member(offset, type);
			offset += type.sizeof;
		}

		this.sizeof = offset;
	};


	var Module = {};

	Module.AddressedMemory = AddressedMemory;

	Module.Int8 = new NativeType("Int8", 1);
	Module.Int16 = new NativeType("Int16", 2);
	Module.Int32 = new NativeType("Int32", 4);

	Module.Uint8 = new NativeType("Uint8", 1);
	Module.Uint16 = new NativeType("Uint16", 2);
	Module.Uint32 = new NativeType("Uint32", 4);

	Module.Float32 = new NativeType("Float32", 4);
	Module.Float64 = new NativeType("Float64", 8);


	Module.rawBytes = function (ref) {
		return ref._memory.bytes(ref.type.sizeof);
	};

	Module.equals = function (ref1, ref2) {
		if (ref1.type !== ref2.type) {
			throw Error();
		}

		var sizeof = ref1.type.sizeof;
		if (sizeof < 0) {
			throw Error();
		}

		var bytes1 = this.rawBytes(ref1);
		var bytes2 = this.rawBytes(ref2);

		for (var i = 0; i < sizeof; ++i) {
			if (bytes1[i] !== bytes2[i]) {
				return false;
			}
		}
		return true;
	};

	Module.assign = function (dest, source) {
		if (dest.type !== source.type) {
			throw Error();
		}

		var sizeof = dest.type.sizeof;
		if (sizeof < 0) {
			throw Error();
		}

		var bytes1 = this.rawBytes(ref1);
		var bytes2 = this.rawBytes(ref2);

		for (var i = 0; i < sizeof; ++i) {
			dest[i] = source[i]; // XXX: Might not be correct due to endianess. May need to manually walk with DataView.
		}
	};


	Module.defineStruct = function (name, memberNameToType) {
		var structInfo = new StructInfo(memberNameToType);

		var Reference = function (memory) {
			this._memory = memory;
		};

		var type = new StructType(Reference, name, structInfo.sizeof);

		var memberNames = Object.keys(structInfo);

		Reference.prototype.type = type;
		Reference.prototype.memberNames = memberNames;

		for (var i = 0; i < memberNames.length; ++i) {
			var memberName = memberNames[i];
			if (reservedMemberNames.hasOwnProperty(memberName)) {
				continue;
			}

			var member = structInfo[memberName];

			if (member.type.constructor === NativeType) {
				Reference.prototype[memberName] = (function (member) {
					return function () {
						return member.type.view(this._memory.offsetBy(member.offset));
					};
				})(member);
			}
			else if (member.type.constructor === StructType || member.type.constructor === ListType) {
				Reference.prototype[memberName] = (function (member) {
					return function () {
						var memory = this._memory.offsetBy(member.offset);
						return member.type.view(memory);
					};
				})(member);
			}
			else {
				throw Error();
			}
		}

		Reference.prototype.get = returnThis;

		Reference.prototype.set = function (other) {
			Module.assign(this, other);
		};

		return type;
	};


	Module.defineList = function (elemType, compileTimeCount) {
		if (compileTimeCount === undefined) {
			compileTimeCount = -1;
		}
		
		var Reference = function (memory) {
			this._memory = memory;
		};

		var type = new ListType(Reference, elemType, compileTimeCount);

		Reference.prototype.type = type;
		Reference.prototype.length = compileTimeCount;

		if (elemType.constructor === NativeType) {
			Reference.prototype.at = function (index) {
				var offset = elemType.sizeof * index;
				var view = this._memory.view(offset);
				return {
					get: function () {
						var offset = index * elemType.sizeof;
						return view[elemType._viewGet]();
					},
					set: function (value) {
						var offset = index * elemType.sizeof;
						view[elemType._viewSet](value);
					},
				};
			};

		}
		else if (elemType.constructor === StructType || elemType.constructor === ListType) {
			if (elemType.sizeof < 0) {
				throw Error();
			}
			Reference.prototype.at = function (index) {
				var offset = elemType.sizeof * index;
				var elemMemory = this._memory.offsetBy(index);
				return elemType.view(elemMemory);
			};
		}
		else {
			throw Error();
		}

		Reference.prototype.get = returnThis;

		Reference.prototype.set = function (other) {
			Module.assign(this, other);
		};

		return type;
	};


	return Module;
})();




