

var Pod = (function () {

	var returnThis = function () {
		return this;
	};


	var AddressedMemory = function (buffer, byteOffset) {
		this._buffer = buffer;
		this._byteOffset = byteOffset;
	};

	AddressedMemory.prototype.bytes = function (sizeof) {
		return new Uint8Array(this._buffer, this._byteOffset, this._byteOffset + sizeof);
	};

	AddressedMemory.prototype.view = function (byteOffset) {
		return new DataView(this._buffer, this._byteOffset + byteOffset);
	};

	AddressedMemory.prototype.offsetBy = function (byteOffset) {
		return new AddressedMemory(buffer, this._byteOffset + byteOffset);
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

	Type.prototype._isBitwise = function () {
		return false;
	};

	Type.prototype._bitwiseCount = function () {
		return 0;
	};


	var ByteBoundaryType = function () {
		Type.call(this, -1);
	};

	ByteBoundaryType.prototype = new Type();
	ByteBoundaryType.prototype.constructor = ByteBoundaryType;

	ByteBoundartType.prototype.view = function () {
		throw Error();
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


	var BoolType = function (bitIndex) {
		Type.call(this, 0);

		this._bitwiseView = function (bitOffset, memory) {
			var byteOffset = 0;
			var effectiveBitIndex = bitIndex + bitOffset;
			while (effectiveBitIndex >= 8) {
				effectiveBitIndex -= 8;
				++byteOffset;
			}

			var view = memory.view(byteOffset);
			var mask = 1 << effectiveBitIndex;

			return {
				get: function () {
					return (view.getUint8(0) & mask) !== 0;
				},
				set: function (value) {
					var bits = view.getUint8(0);
					if (value) {
						bits |= mask;
					}
					else {
						bits &= mask;
					}
					view.setUint8(0, bits);
				},
			};
		};

		this.view = function (memory) {
			return this._bitwiseView(0, memory);
		}
	};

	BoolType.prototype = new Type();
	BoolType.prototype.constructor = BoolType;
	
	BoolType.prototype._isBitwise = function () {
		return true;
	};

	BoolType.prototype._bitwiseCount = function () {
		return 1;
	};


	var AggrogateType = function (viewClass, sizeof, isBitwise, bitwiseCount) {
		if (bitwiseCount > 8) {
			throw Error();
		}
		Type.call(this, sizeof);
		this._viewClass = viewClass;
		this._bitwise = isBitwise;
		this._bitCount = bitwiseCount;
	};

	AggrogateType.prototype = new Type();
	AggrogateType.prototype.constructor = AggrogateType;

	AggrogateType.prototype._bitwiseView = function (bitOffset, memory) {
		return new this._viewClass(memory, bitOffset);
	};

	AggrogateType.prototype.view = function (memory) {
		return new this._viewClass(memory);
	};

	AggrogateType.prototype._isBitwise = function () {
		return this._bitwise;
	};

	AggrogateType.prototype._bitwiseCount = function () {
		return this._bitCount;
	};
	

	var StructType = function (viewClass, sizeof, isBitwise, paddedBits) {
		if (sizeof <= 0) {
			throw Error();
		}
		AggrogateType.call(this, viewClass, sizeof, isBitwise, paddedBits);
	};

	StructType.prototype = new AggrogateType();
	StructType.prototype.constructor = StructType;
	

	var ListType = function (viewClass, elemType, count) {
		if (elemType.sizeof <= 0 || count <= 0 || elemType._bitwiseCount() > 0) {
			throw Error();
		}
		var sizeof = elemType.sizeof * count;
		var isBitwise = count > 0 && elemType.isBitwise();
		var bitwiseCount = xxx;
		AggrogateType.call(this, viewClass, sizeof, isBitwise, bitwiseCount);
	};

	ListType.prototype = new AggrogateType();
	ListType.prototype.constructor = ListType;


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


	var Member = function (byteOffset, type) {
		this.byteOffset = byteOffset;
		this.type = type;
	};

	var BitwiseMember = function (byteOffset, bitOffset, type) {
		this.byteOffset = byteOffset;
		this.bitOffset = bitOffset;
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
		var byteOffset = 0;
		var bitOffset = 0;

		this.isBitwise = true;

		var forceByteBoundary = function () {
			if (bitOffset > 0) {
				bitOffset = 0;
				++byteOffset;
			}
		};

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

			if (type instanceof ByteBoundaryType) {
				forceByteBoundary();
			}
			else if (type._isBitwise()) {
				if (type.sizeof < 0) {
					throw Error();
				}

				if (type instanceof BoolType) {
					type = Bools[bitOffset];
				}
				this[memberName] = new BitwiseMember(byteOffset, bitOffset, type);

				bitOffset += type._bitwiseCount();
				byteOffset += Math.floor(bitOffset / 8);
				bitOffset = bitOffset % 8;
			}
			else {
				if (type.sizeof < 0) {
					throw Error();
				}

				forceByteBoundary();

				this.isBitwise = false;

				this[memberName] = new Member(byteOffset, type);
				byteOffset += type.sizeof;
			}
		}

		forceByteBoundary();

		this.sizeof = byteOffset;
	};


	var Module = {};

	Module.NamedType = NamedType;

	Module.AddressedMemory = AddressedMemory;

	Module.ByteBoundary = new NamedType("", new ByteBoundaryType());

	Module.Int8 = new NativeType("Int8", 1);
	Module.Int16 = new NativeType("Int16", 2);
	Module.Int32 = new NativeType("Int32", 4);

	Module.Uint8 = new NativeType("Uint8", 1);
	Module.Uint16 = new NativeType("Uint16", 2);
	Module.Uint32 = new NativeType("Uint32", 4);

	Module.Float32 = new NativeType("Float32", 4);
	Module.Float64 = new NativeType("Float64", 8);

	Module.Bool = Bools[0];


	Module.rawBytes = function (view) {
		return view._memory.bytes(view.type.sizeof);
	};

	Module.equals = function (ref1, ref2) {
		if (ref1.type !== ref2.type) {
			throw Error();
		}
		if (ref1.type._bitwiseCount() > 0) {
			throw Error(); // TODO
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
		throw Error(); // XXX: Bitwise stuff

		if (dest.type !== source.type) {
			throw Error();
		}
		if (dest.type._bitwiseCount() > 0) {
			throw Error(); // TODO
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

		var memberNames = Object.keys(structInfo);

		View.prototype.memberNames = memberNames;

		for (var i = 0; i < memberNames.length; ++i) {
			var memberName = memberNames[i];
			if (reservedMemberNames.hasOwnProperty(memberName)) {
				continue;
			}

			(function () {
				var member = structInfo[memberName];

				if (member.type instanceof Type) {
					if (member instanceof BitwiseMember) {
						View.prototype[memberName] = function () {
							return member.type._bitwiseView(this._memory.offsetBy(member.byteOffset), member.bitOffset);
						};
					}
					else {
						View.prototype[memberName] = function () {
							return member.type.view(this._memory.offsetBy(member.byteOffset));
						};
					}
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

		var type = new StructType(View, structInfo.sizeof, structInfo.isBitwise);
		View.prototype.type = type;

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

		View.prototype.length = compileTimeCount;

		if (elemType.constructor === NativeType) {
			View.prototype.at = function (index) {
				var byteOffset = elemType.sizeof * index;
				var view = this._memory.view(byteOffset);
				return {
					get: function () {
						var byteOffset = index * elemType.sizeof;
						return view[elemType._viewGet]();
					},
					set: function (value) {
						var byteOffset = index * elemType.sizeof;
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
				var byteOffset = elemType.sizeof * index;
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

		var type = new ListType(View, elemType, compileTimeCount);
		View.prototype.type = type;

		return type;
	};


	return Module;
})();




