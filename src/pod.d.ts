

declare module Pod {
	class AddressedMemory {
		constructor(buffer: ArrayBuffer, offset: number);

		bytes(sizeof: number): Uint8Array;
		view(offset: number): DataView;
		offsetBy(offset: number): AddressedMemory;
	}

	//interface View {
	//	get(): any;
	//	set(value: any): void;
	//}
	type View = any;

	interface TypedView<T> {
		get(): T;
		set(value: T)
	};

	interface NamedType { }

	interface Type {
		as(memberName: string): NamedType;
		view(memory: AddressedMemory): View;
		sizeof: number;
	}

	interface BuiltinType<T> extends Type {
		view(memory: AddressedMemory): TypedView<T>;
	}

	var Int8: BuiltinType<number>;
	var Int16: BuiltinType<number>;
	var Int32: BuiltinType<number>;

	var Uint8: BuiltinType<number>;
	var Uint16: BuiltinType<number>;
	var Uint32: BuiltinType<number>;

	var Float32: BuiltinType<number>;
	var Float64: BuiltinType<number>;

	var Bool: BuiltinType<boolean>;

	//function zeroFill(view: View);
	function rawBytes(view: View);
	function equals(x: View, y: View);
	function assign(dest: View, source: View);
	function defineStruct(namedTypes: NamedType[]): Type;
	function defineList(elemType: Type, compileTimeCount: number): Type;
}


