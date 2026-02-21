#!/bin/bash
# Request Accessibility Access for Witt
# Run this script if global shortcuts are not working

echo "🔑 Requesting Accessibility Access for Witt..."
echo ""
echo "Please follow these steps:"
echo "1. Open System Settings"
echo "2. Go to Privacy & Security → Accessibility"
echo "3. Find and enable 'Witt' or 'witt-tauri'"
echo ""
echo "Opening System Settings..."

# Open Accessibility settings
osascript <<EOF
tell application "System Settings"
    activate
    reveal accessibility preferences
end tell
EOF

echo ""
echo "✅ Once enabled, restart Witt for the changes to take effect."
