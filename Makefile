.PHONY: clean package release

package:
	vsce package

release: package
	vsce publish

clean:
	rm -f *.vsix