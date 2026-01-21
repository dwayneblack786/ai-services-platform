#!/bin/bash
# Generate Python gRPC code from proto file

PROTO_DIR="../../../services-java/va-service/src/main/proto"
PROTO_FILE="voice_service.proto"
OUTPUT_DIR="generated"

echo "=== Generating Python gRPC Code ==="
echo "Proto file: $PROTO_DIR/$PROTO_FILE"
echo "Output dir: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p $OUTPUT_DIR

# Generate Python code
python -m grpc_tools.protoc \
  -I$PROTO_DIR \
  --python_out=$OUTPUT_DIR \
  --grpc_python_out=$OUTPUT_DIR \
  $PROTO_DIR/$PROTO_FILE

if [ $? -eq 0 ]; then
    echo "✅ Code generation successful!"
    echo "Generated files:"
    ls -l $OUTPUT_DIR/*.py
else
    echo "❌ Code generation failed"
    exit 1
fi
