

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

	Type.prototype.bitwiseEnabled = function () {
		return false;
	};

	Type.prototype.bitwiseCount = function () {
		return 0;
	};


	var ByteBoundaryType = function () {
		Type.call(this, -1);
	};

	ByteBoundaryType.prototype = new Type();
	ByteBoundaryType.prototype.constructor = ByteBoundaryType;

	ByteBoundaryType.prototype.view = function () {
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


	var BoolType = function () {
		Type.call(this, 0);

		this.bitwiseView = function (bitOffset, memory) {
			if (bitOffset >= 8) {
				throw Error(); // XXX: Remove when sufficiently debugged.
			}

			var view = memory.view(0);
			//var mask = 1 << (7 - bitOffset);
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
						bits &= mask;
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
	
	BoolType.prototype.bitwiseEnabled = function () {
		return true;
	};

	BoolType.prototype.bitwiseCount = function () {
		return 1;
	};


	var AggrogateType = function (viewClass, sizeof, bitwiseEnabled, bitwiseCount) {
		if (bitwiseCount >= 8) {
			throw Error();
		}
		Type.call(this, sizeof);
		this._viewClass = viewClass;
		this._bitwiseEnabled = bitwiseEnabled;
		this._bitwiseCount = bitwiseCount;
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

	AggrogateType.prototype.bitwiseEnabled = function () {
		return this._bitwiseEnabled;
	};

	AggrogateType.prototype.bitwiseCount = function () {
		return this._bitwiseCount;
	};
	

	var StructType = function (viewClass, sizeof, bitwiseEnabled, paddedBits) {
		if (sizeof <= 0) {
			throw Error();
		}
		AggrogateType.call(this, viewClass, sizeof, bitwiseEnabled, paddedBits);
	};

	StructType.prototype = new AggrogateType();
	StructType.prototype.constructor = StructType;
	

	var ListType = function (viewClass, elemType, count) {
		if (elemType.sizeof <= 0 || count <= 0 || elemType.bitwiseCount() > 0) {
			throw Error();
		}
		var sizeof = elemType.sizeof * count;
		var bitwiseEnabled = count > 0 && elemType.bitwiseEnabled();
		var bitwiseCount = xxx;
		AggrogateType.call(this, viewClass, sizeof, bitwiseEnabled, bitwiseCount);
	};

	ListType.prototype = new AggrogateType();
	ListType.prototype.constructor = ListType;


	var Member = function (type) {
		this.type = type;
	};

	var reservedMemberNames = {
		"": null,
		as: null,
		bitwiseCount: null,
		bitwiseEnabled: null,
		get: null,
		memberNames: null,
		set: null,
		sizeof: null,
		type: null,
		view: null,
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


	Module.rawBytes = function (view) {
		return view._memory.bytes(view.type.sizeof);
	};

	Module.equals = function (ref1, ref2) {
		if (ref1.type !== ref2.type) {
			throw Error();
		}
		if (ref1.type.bitwiseCount() > 0) {
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
		if (dest.type !== source.type) {
			throw Error();
		}
		if (dest.type.bitwiseCount() > 0) {
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
		var View = function (memory, bitOffset) {
			if (bitOffset > 8) {
				bitOffset -= 8;
				memory = memory.offsetBy(1);
			}
			this._memory = memory;
			this._bitOffset = bitOffset;
		};

		View.prototype.memberNames = [];

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
			View.prototype.memberNames.push(memberName);

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

					if (type.bitwiseEnabled()) {
						localByteOffset = loopByteOffset;
						localBitOffset = loopBitOffset;

						View.prototype[memberName] = function () {
							var byteOffset = localByteOffset;
							var bitOffset = this._bitOffset + localBitOffset;
							return type.bitwiseView(bitOffset, this._memory.offsetBy(byteOffset));
						};

						loopByteOffset += type.sizeof;
						loopBitOffset += type.bitwiseCount();
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

						loopByteOffset += type.sizeof;
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
		var sizeof = loopByteOffset;
		var bitwiseCount = loopBitOffset;
		var type = new StructType(View, sizeof, bitwiseEnabled, bitwiseCount);
		View.prototype.type = type;

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




