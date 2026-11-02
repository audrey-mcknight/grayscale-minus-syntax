.PHONY: app package clean test source

MAKEFILE_DIR:="$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))"

# puts the app in $(MAKEFILE_DIR)/build/Build/Products/Release/name.app
app:
	xcodebuild -project $(MAKEFILE_DIR)/grayscale.xcodeproj -scheme grayscale -configuration Release -derivedDataPath $(MAKEFILE_DIR)/build MACOSX_DEPLOYMENT_TARGET=12.0 GCC_TREAT_WARNINGS_AS_ERRORS=NO

test:
	node --test browser/rules.test.mjs

source:
	python3 tools/source_archive.py

BUILT_APP_PATH:=$(MAKEFILE_DIR)/build/Build/Products/Release/grayscale.app

package: app
	# first argument is the path of the .app file, second argument is installation
	# directory for the app when the .pkg is run, third argument is the output
	# location for the .pkg file
	productbuild --component $(BUILT_APP_PATH) /Applications $(MAKEFILE_DIR)/build/GrayscaleInstaller.pkg
	# first argument is directory to zip, second is zipped directory; put the
	# zipped app file in GitHub releases too, that's what the homebrew casks use
	ditto -c -k --sequesterRsrc --keepParent $(BUILT_APP_PATH) $(MAKEFILE_DIR)/build/grayscale.app.zip

clean:
	rm -rf $(MAKEFILE_DIR)/build
