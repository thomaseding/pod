

declare module Pod {
	class AddressedMemory {
		constructor(buffer: ArrayBuffer, offset: number);

		bytes(byteCount: number): Uint8Array;
		view(byteOffset: number): DataView;
		offsetBy(byteOffset: number): AddressedMemory;
	}

	interface View {}

	interface TypedView<_Value> extends View {
		get(): _Value;
		set(value: _Value): void;
	}

	type NumberView = TypedView<number>;
	type BoolView = TypedView<boolean>;

	interface NamedType { }

	interface Type {
		as(memberName: string): NamedType;
		view(memory: AddressedMemory): View;
		sizeof(): number;
		byteCount: number;
		bitCount: number;
		bitwiseEnabled: boolean;
	}

	interface BitwiseType extends Type {
		bitwiseView(bitOffset: number, memory: AddressedMemory): View;
	}

	interface TypedType<_View> extends Type {
		view(memory: AddressedMemory): _View;
	}

	interface TypedBitwiseType<_BitwiseView> extends BitwiseType {
		view(memory: AddressedMemory): _BitwiseView;
		bitwiseView(bitOffset: number, memory: AddressedMemory): _BitwiseView;
	}

	type NumberType = TypedType<NumberView>;
	type BoolType = TypedBitwiseType<BoolView>;

	var ByteBoundary: NamedType;

	var Int8: NumberType;
	var Int16: NumberType;
	var Int32: NumberType;

	var Uint8: NumberType;
	var Uint16: NumberType;
	var Uint32: NumberType;

	var Float32: NumberType;
	var Float64: NumberType;

	var Bool: BoolType;

	function reservedMemberNames(): string[];

	function allocate(type: Type): View;

	function allocate(type: NumberType): NumberView;

	function allocate(type: BoolType): BoolView;

	function rawBytes(view: View);

	function equals(x: View, y: View);

	function assign(dest: View, source: View);

	function defineStruct(namedTypes: NamedType[]): Type;
	function defineStruct(namedTypes: NamedType[], get: () => any): Type;
	function defineStruct(namedTypes: NamedType[], get: () => any, set: (value: any) => void): Type;

	function defineList(elemType: Type, compileTimeCount: number): Type;
}


