

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
	Pod.Bool.as("bool6"),
	Pod.Bool.as("bool7"),
	Pod.Bool.as("bool8"),
]);

var NodePair = Pod.defineStruct([
	Node.as("first"),
	Node.as("second"),
]);


var buffer = new ArrayBuffer(NodePair.sizeof);
var memory = new Pod.AddressedMemory(buffer, 0);


var nodePair = NodePair.view(memory);

nodePair.first().asciiChar().set(1);
console.log(nodePair.first().asciiChar().get());

nodePair.first().asciiChar().set(2);
console.log(nodePair.first().asciiChar().get());


var node = nodePair.first();

console.log(node.bool6().get());
node.bool6().set(true);
console.log(node.bool6().get());

console.log(node.bool8().get());
node.bool8().set(true);
console.log(node.bool8().get());


console.log(Pod.rawBytes(nodePair));


