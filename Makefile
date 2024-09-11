.PHONY: release package publish clean

release: package publish clean

package:
	vsce package

publish:
	vsce publish

clean:
	rm -f *.vsix