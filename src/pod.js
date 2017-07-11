

var Pod = (function () {

	var returnThis = function () {
		return this;
	};


	var AddressedMemory = function (buffer, offset) {
		this._buffer = buffer;
		this._offset = offset;
	};

	AddressedMemory.prototype.bytes = function (sizeof) {
		return new Uint8Array(this._buffer, this._offset);
	};

	AddressedMemory.prototype.view = function (offset) {
		return new DataView(this._buffer, this._offset + offset);
	};

	AddressedMemory.prototype.offsetBy = function (offset) {
		return new AddressedMemory(buffer, this._offset + offset);
	};


	var NamedType = function (name, type) {
		this.name = name;
		this.type = type;
	};


	var Type = function (sizeof) {
		if (sizeof < 0) {
			sizeof = -1;
		}
		this.sizeof = sizeof;
	};

	Type.prototype.as = function (name) {
		if (typeof name !== "string") {
			throw Error();
		}
		return new NamedType(name, this);
	};


	var NativeType = function (name, sizeof) {
		Type.call(this, sizeof);

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


	var AggrogateType = function (clazz, sizeof) {
		Type.call(this, sizeof);
		this._class = clazz;
	};

	AggrogateType.prototype = new Type();
	AggrogateType.prototype.constructor = AggrogateType;

	AggrogateType.prototype.view = function (memory) {
		return new this._class(memory);
	};
	

	var StructType = function (clazz, sizeof) {
		if (sizeof <= 0) {
			throw Error();
		}
		AggrogateType.call(this, clazz, sizeof);
	};

	StructType.prototype = new AggrogateType();
	StructType.prototype.constructor = StructType;
	

	var ListType = function (clazz, elemType, count) {
		if (elemType.sizeof <= 0 || count <= 0) {
			throw Error();
		}
		var sizeof = elemType.sizeof * count;
		AggrogateType.call(this, clazz, sizeof);
	};

	ListType.prototype = new AggrogateType();
	ListType.prototype.constructor = ListType;


	var Bit8Type = function () {
		Type.call(this, 1);

		this.view = function (memory) {
			var view = memory.view(0);

			return {
				at: function (bitIndex) {
					return {
						_mask: 1 << bitIndex,
						get: function () {
							return (view.getUint8(0) & this._mask) !== 0;
						},
						set: function (value) {
							var bits = view.getUint8(0);
							if (value) {
								bits |= this._mask;
							}
							else {
								bits &= this._mask;
							}
							view.setUint8(0, bits);
						},
					};
				},
			};
		};
	};

	Bit8Type.prototype = new Type();
	Bit8Type.prototype.constructor = Bit8Type;


	var BoolType = function (bitIndex) {
		Type.call(this, -1);

		this._mask = 1 << bitIndex;

		this.view = function (memory) {
			var type = this;
			var view = memory.view(0);

			return {
				get: function () {
					return (view.getUint8(0) & type._mask) !== 0;
				},
				set: function (value) {
					var bits = view.getUint8(0);
					if (value) {
						bits |= type._mask;
					}
					else {
						bits &= type._mask;
					}
					view.setUint8(0, bits);
				},
			};
		};
	};

	BoolType.prototype = new Type();
	BoolType.prototype.constructor = BoolType;


	var Bools = [
		new BoolType(0),
		new BoolType(1),
		new BoolType(2),
		new BoolType(3),
		new BoolType(4),
		new BoolType(5),
		new BoolType(6),
		new BoolType(7),
	];


	var Member = function (offset, type) {
		this.offset = offset;
		this.type = type;
	};


	var reservedMemberNames = {
		"": null,
		as: null,
		get: null,
		memberNames: null,
		set: null,
		sizeof: null,
		type: null,
		view: null,
	};


	var StructInfo = function (namedTypes) {
		var offset = 0;

		var currBoolIndex = 0;

		for (var i = 0; i < namedTypes.length; ++i) {
			var namedType = namedTypes[i];

			var memberName = namedType.name;
			if (reservedMemberNames.hasOwnProperty(memberName)) {
				throw Error();
			}

			var type = namedType.type;
			if (!(type instanceof Type)) {
				throw Error();
			}

			if (type instanceof BoolType) {
				if (currBoolIndex === 8) {
					currBoolIndex = 0;
					++offset;
				}
				var type = Bools[currBoolIndex];
				this[memberName] = new Member(offset, type);
				++currBoolIndex;
			}
			else {
				if (type.sizeof < 0) {
					throw Error();
				}

				if (currBoolIndex > 0) {
					currBoolIndex = 0;
					++offset;
				}
				this[memberName] = new Member(offset, type);
				offset += type.sizeof;
			}
		}

		if (currBoolIndex > 0) {
			++offset;
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

	Module.Bit8 = new Bit8Type();

	Module.Bool = Bools[0];


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

		var dBytes = this.rawBytes(dest);
		var sBytes = this.rawBytes(source);

		for (var i = 0; i < sizeof; ++i) {
			dBytes[i] = sBytes[i]; // XXX: Might not be correct due to endianess. May need to manually walk with DataView.
		}
	};


	Module.defineStruct = function (namedTypes) {
		var structInfo = new StructInfo(namedTypes);

		var View = function (memory) {
			this._memory = memory;
		};

		var type = new StructType(View, structInfo.sizeof);

		var memberNames = Object.keys(structInfo);

		View.prototype.type = type;
		View.prototype.memberNames = memberNames;

		for (var i = 0; i < memberNames.length; ++i) {
			var memberName = memberNames[i];
			if (reservedMemberNames.hasOwnProperty(memberName)) {
				continue;
			}

			(function () {
				var member = structInfo[memberName];

				if (member.type instanceof Type) {
					View.prototype[memberName] = function () {
						return member.type.view(this._memory.offsetBy(member.offset));
					};
				}
				else {
					throw Error();
				}
			})();
		}

		View.prototype.get = returnThis;

		View.prototype.set = function (other) {
			Module.assign(this, other);
		};

		return type;
	};


	Module.defineList = function (elemType, compileTimeCount) {
		if (elemType instanceof BoolType) {
			throw Error(); // not yet supported
		}

		if (compileTimeCount === undefined) {
			compileTimeCount = -1;
		}
		
		var View = function (memory) {
			this._memory = memory;
		};

		var type = new ListType(View, elemType, compileTimeCount);

		View.prototype.type = type;
		View.prototype.length = compileTimeCount;

		if (elemType.constructor === NativeType) {
			View.prototype.at = function (index) {
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
			View.prototype.at = function (index) {
				var offset = elemType.sizeof * index;
				var elemMemory = this._memory.offsetBy(index);
				return elemType.view(elemMemory);
			};
		}
		else {
			throw Error();
		}

		View.prototype.get = returnThis;

		View.prototype.set = function (other) {
			Module.assign(this, other);
		};

		return type;
	};


	return Module;
})();




