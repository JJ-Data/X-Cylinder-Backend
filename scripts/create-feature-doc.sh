#!/bin/bash

# Script to create new feature documentation from template

if [ -z "$1" ]; then
    echo "Usage: ./scripts/create-feature-doc.sh <feature-name>"
    echo "Example: ./scripts/create-feature-doc.sh webhooks"
    exit 1
fi

FEATURE_NAME=$1
FEATURE_FILE="docs/features/${FEATURE_NAME}.md"
TEMPLATE_FILE="docs/contributing/FEATURE_DOCUMENTATION_TEMPLATE.md"

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found at $TEMPLATE_FILE"
    exit 1
fi

# Check if feature doc already exists
if [ -f "$FEATURE_FILE" ]; then
    echo "Error: Feature documentation already exists at $FEATURE_FILE"
    exit 1
fi

# Create the feature documentation
cp "$TEMPLATE_FILE" "$FEATURE_FILE"

# Replace "Feature Name" with the actual feature name (capitalize first letter)
FEATURE_NAME_CAPITALIZED=$(echo "$FEATURE_NAME" | sed 's/\b\(.\)/\u\1/g' | sed 's/-/ /g')
sed -i '' "s/Feature Name/$FEATURE_NAME_CAPITALIZED/g" "$FEATURE_FILE"

echo "✅ Created feature documentation at: $FEATURE_FILE"
echo ""
echo "Next steps:"
echo "1. Edit $FEATURE_FILE with your feature details"
echo "2. Update docs/README.md to include a link to your feature"
echo "3. Commit your changes"