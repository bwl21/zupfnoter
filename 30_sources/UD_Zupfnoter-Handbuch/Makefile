.PHONY: pdf clean

pdf: x.pdf

x.typ: *.md handbuch.typ
	pandoc *.md --to=typst --wrap=none --standalone --output=x.typ --template handbuch.typ

x.pdf: x.typ handbuch.typ
	typst c x.typ --root ..

clean:
	rm -f x.typ x.pdf
