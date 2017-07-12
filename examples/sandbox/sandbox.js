
var Tristate = Pod.defineStruct([
	Pod.Bool.as("value"),
	Pod.Bool.as("exists"),
], function () {
	if (this.exists().get()) {
		return this.value().get();
	}
	return null;
}, function (value) {
	this.exists().set(value !== null);
	if (value !== null) {
		this.value().set(value);
	}
});


var Flags = Pod.defineStruct([
	Tristate.as("x"),
	Tristate.as("y"),
]);

var flags = Pod.allocate(Flags);
var tri = flags.y();
console.log(tri.get());
tri.set(true);
console.log(tri.get());
tri.set(false);
console.log(tri.get());
console.log(Pod.rawBytes(flags));



var Node = Pod.defineStruct([
	Pod.Uint8.as("asciiChar"),
	Pod.Uint32.as("parentPtr"),
	Pod.Uint8.as("kidCapacity"),
	Pod.Uint32.as("kidsPtr"),
	Pod.Bool.as("bool0"),
	Pod.Bool.as("bool1"),
	Pod.Bool.as("bool2"),
	Pod.Bool.as("bool3"),
	Pod.Bool.as("bool4"),
	Pod.Bool.as("bool5"),

	Pod.ByteBoundary,
	Pod.Bool.as("bool6"),
	Pod.Bool.as("bool7"),

	Pod.ByteBoundary,
	Pod.Bool.as("bool8"),
]);

var NodePair = Pod.defineStruct([
	Node.as("first"),
	Node.as("second"),
]);


var nodePair = Pod.allocate(NodePair);

nodePair.first().asciiChar().set(1);
console.log(nodePair.first().asciiChar().get());

nodePair.first().asciiChar().set(2);
console.log(nodePair.first().asciiChar().get());


var node = nodePair.first();

console.log(node.bool1().get());
node.bool1().set(true);
console.log(node.bool1().get());

console.log(node.bool8().get());
node.bool8().set(true);
console.log(node.bool8().get());

console.log(Pod.rawBytes(nodePair));


