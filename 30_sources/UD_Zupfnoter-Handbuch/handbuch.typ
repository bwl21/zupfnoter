#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2.5cm, right: 2.5cm),
  header: [
    #grid(
      columns: (auto, 1fr, auto),
      align: (left, center, right),
      [♪],
      [Zupfnoter-Handbuch (review)],
      [2 EINFÜHRUNG]
    )
    #line(length: 100%, stroke: 0.5pt)
  ],
  footer: [
    #line(length: 100%, stroke: 0.5pt)
    #context [
      #grid(
        columns: (1fr, auto, 1fr),
        [www.zupfnoter.de],
        [#counter(page).display()],
        align: right,
        [February 28, 2026]
      )
    ]
  ]
)

#set text(font: "Libertinus Serif", size: 11pt, lang: "de")
#set par(justify: true, leading: 0.65em)
#set columns(2, gutter: 1.5cm)
#set heading(numbering: "1.")

#show heading: it => {
  set text(weight: "bold")
  if it.level == 1 {
    text(size: 16pt, it)
  } else {
    it
  }
}

#let blockquote(body) = {
  block(
    fill: luma(240),
    inset: 1em,
    radius: 0.5em,
    [#body]
  )
}

#show raw.where(block: true): it => {
  block(
    fill: luma(245),
    inset: 0.8em,
    radius: 0.3em,
    stroke: 0.5pt + luma(200),
    text(font: "Courier New", size: 9pt, it)
  )
}

$body$
