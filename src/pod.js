

var Pod = (function () {

	var returnThis = function () {
		return this;
	};


	var AddressedMemory = function (buffer, byteOffset) {
		this._buffer = buffer;
		this._byteOffset = byteOffset;
	};

	AddressedMemory.prototype.bytes = function (byteCount) {
		return new Uint8Array(this._buffer, this._byteOffset, this._byteOffset + byteCount);
	};

	AddressedMemory.prototype.view = function (byteOffset) {
		return new DataView(this._buffer, this._byteOffset + byteOffset);
	};

	AddressedMemory.prototype.offsetBy = function (byteOffset) {
		return new AddressedMemory(this._buffer, this._byteOffset + byteOffset);
	};


	var NamedType = function (name, type) {
		this.name = name;
		this.type = type;
	};


	var Type = function (byteCount) {
		if (byteCount < 0) {
			byteCount = -1;
		}
		this.byteCount = byteCount;
	};

	Type.prototype.as = function (name) {
		if (typeof name !== "string") {
			throw Error();
		}
		return new NamedType(name, this);
	};

	Type.prototype.sizeof = function () {
		if (this.byteCount < 0) {
			throw Error();
		}
		return this.byteCount + (this.bitCount === 0 ? 0 : 1);
	};

	Type.prototype.bitwiseEnabled = false;

	Type.prototype.bitCount = 0;


	var ByteBoundaryType = function () {
		Type.call(this, -1);
	};

	ByteBoundaryType.prototype = new Type();
	ByteBoundaryType.prototype.constructor = ByteBoundaryType;

	ByteBoundaryType.prototype.view = function () {
		throw Error();
	};


	var NativeType = function (name, byteCount) {
		Type.call(this, byteCount);

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


	var BoolType = function () {
		Type.call(this, 0);

		this.bitwiseView = function (bitOffset, memory) {
			if (bitOffset >= 8) {
				throw Error(); // XXX: Remove when sufficiently debugged.
			}

			var view = memory.view(0);
			var mask = 1 << bitOffset;

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
						bits &= ~mask;
					}
					view.setUint8(0, bits);
				},
			};
		};

		this.view = function (memory) {
			return this.bitwiseView(0, memory);
		}
	};

	BoolType.prototype = new Type();
	BoolType.prototype.constructor = BoolType;
	
	BoolType.prototype.bitwiseEnabled = true;

	BoolType.prototype.bitCount = 1;


	var AggrogateType = function (viewClass, byteCount, bitwiseEnabled, bitCount) {
		if (bitCount >= 8) {
			throw Error();
		}
		Type.call(this, byteCount);
		this._viewClass = viewClass;
		this.bitwiseEnabled = bitwiseEnabled;
		this.bitCount = bitCount;
	};

	AggrogateType.prototype = new Type();
	AggrogateType.prototype.constructor = AggrogateType;

	AggrogateType.prototype.bitwiseView = function (bitOffset, memory) {
		if (bitOffset >= 8) {
			throw Error(); // XXX: Remove when sufficiently debugged.
		}
		return new this._viewClass(memory, bitOffset);
	};

	AggrogateType.prototype.view = function (memory) {
		return new this._viewClass(memory, 0);
	};


	var StructType = function (viewClass, byteCount, bitwiseEnabled, paddedBits) {
		if (byteCount < 0) {
			throw Error();
		}
		AggrogateType.call(this, viewClass, byteCount, bitwiseEnabled, paddedBits);
	};

	StructType.prototype = new AggrogateType();
	StructType.prototype.constructor = StructType;
	

	var ListType = function (viewClass, elemType, count) {
		if (elemType.byteCount < 0 || count < 0 || elemType.bitCount > 0) {
			throw Error();
		}
		var byteCount = elemType.byteCount * count;
		var bitwiseEnabled = elemType.bitwiseEnabled;
		var bitCount = xxx;
		AggrogateType.call(this, viewClass, byteCount, bitwiseEnabled, bitCount);
	};

	ListType.prototype = new AggrogateType();
	ListType.prototype.constructor = ListType;


	var Member = function (type) {
		this.type = type;
	};

	var reservedMemberNames = {
		get: null,
		members: null,
		set: null,
		type: null,
	};


	var Module = {};

	Module.reservedMemberNames = function () {
		return reservedMemberNames.slice(0);
	};

	Module.NamedType = NamedType;

	Module.AddressedMemory = AddressedMemory;

	Module.ByteBoundary = new NamedType("*", new ByteBoundaryType());

	Module.Int8 = new NativeType("Int8", 1);
	Module.Int16 = new NativeType("Int16", 2);
	Module.Int32 = new NativeType("Int32", 4);

	Module.Uint8 = new NativeType("Uint8", 1);
	Module.Uint16 = new NativeType("Uint16", 2);
	Module.Uint32 = new NativeType("Uint32", 4);

	Module.Float32 = new NativeType("Float32", 4);
	Module.Float64 = new NativeType("Float64", 8);

	Module.Bool = new BoolType();


	Module.allocate = function (type) {
		var buffer = new ArrayBuffer(type.sizeof());
		var memory = new AddressedMemory(buffer, 0);
		return type.view(memory);
	};

	Module.rawBytes = function (view) {
		var byteCount = view.type.byteCount;
		if (view.type.bitCount > 0) {
			++byteCount;
		}
		return view._memory.bytes(byteCount);
	};

	Module.equals = function (ref1, ref2) {
		if (ref1.type !== ref2.type) {
			throw Error();
		}
		if (ref1.type.bitCount > 0) {
			throw Error(); // TODO
		}

		var sizeof = ref1.type.sizeof();

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
		if (dest.type.bitCount > 0) {
			throw Error(); // TODO
		}

		var sizeof = dest.type.sizeof();

		var dBytes = this.rawBytes(dest);
		var sBytes = this.rawBytes(source);

		for (var i = 0; i < sizeof; ++i) {
			dBytes[i] = sBytes[i]; // XXX: Might not be correct due to endianess. May need to manually walk with DataView.
		}
	};


	Module.defineStruct = function (namedTypes, get, set) {
		var View = function (memory, bitOffset) {
			if (bitOffset > 8) {
				bitOffset -= 8;
				memory = memory.offsetBy(1);
			}
			this._memory = memory;
			this._bitOffset = bitOffset;
		};

		View.prototype.members = [];

		var bitwiseEnabled = true;

		var loopByteOffset = 0;
		var loopBitOffset = 0;

		var forceByteBoundary = function () {
			if (loopBitOffset > 0) {
				loopBitOffset = 0;
				++loopByteOffset;
			}
		};

		for (var i = 0; i < namedTypes.length; ++i) {
			var namedType = namedTypes[i];

			var memberName = namedType.name;
			if (reservedMemberNames.hasOwnProperty(memberName)) {
				throw Error();
			}
			View.prototype.members.push(memberName);

			(function () {
				var type = namedType.type;
				var localByteOffset;
				var localBitOffset;

				if (type instanceof Type) {
					if (type instanceof ByteBoundaryType) {
						bitwiseEnabled = false;
						forceByteBoundary();
						return;
					}

					if (type.bitwiseEnabled) {
						localByteOffset = loopByteOffset;
						localBitOffset = loopBitOffset;

						View.prototype[memberName] = function () {
							var byteOffset = localByteOffset;
							var bitOffset = this._bitOffset + localBitOffset;
							return type.bitwiseView(bitOffset, this._memory.offsetBy(byteOffset));
						};

						loopByteOffset += type.byteCount;
						loopBitOffset += type.bitCount;
						if (loopBitOffset >= 8) {
							forceByteBoundary();
						}
					}
					else {
						bitwiseEnabled = false;
						forceByteBoundary();
						localByteOffset = loopByteOffset;
						localBitOffset = loopBitOffset;

						View.prototype[memberName] = function () {
							var byteOffset = localByteOffset;
							return type.view(this._memory.offsetBy(byteOffset));
						};

						loopByteOffset += type.byteCount;
					}
				}
				else {
					throw Error();
				}
			})();
		}

		if (!bitwiseEnabled) {
			forceByteBoundary();
		}
		var byteCount = loopByteOffset;
		var bitCount = loopBitOffset;
		var type = new StructType(View, byteCount, bitwiseEnabled, bitCount);
		View.prototype.type = type;

		get = get || returnThis;
		if (typeof get !== "function") {
			throw Error();
		}
		View.prototype.get = get;

		set = set || function (other) {
			Module.assign(this, other);
		};
		if (typeof set !== "function") {
			throw Error();
		}
		View.prototype.set = set;

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
				var byteOffset = elemType.byteCount * index;
				var view = this._memory.view(byteOffset);
				return {
					get: function () {
						var byteOffset = index * elemType.byteCount;
						return view[elemType._viewGet]();
					},
					set: function (value) {
						var byteOffset = index * elemType.byteCount;
						view[elemType._viewSet](value);
					},
				};
			};

		}
		else if (elemType.constructor === StructType || elemType.constructor === ListType) {
			if (elemType.byteCount < 0) {
				throw Error();
			}
			View.prototype.at = function (index) {
				var byteOffset = elemType.byteCount * index;
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




