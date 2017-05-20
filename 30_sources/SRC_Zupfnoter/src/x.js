function set_draggable(svg_element) {

  var xx = SVG.get(svg_element);
  xx.addClass("zn_draggable");

  xx.draggable(function (x, y) {
    return {
      x: Math.round(x),
      y: Math.round(y)
    }
  });

  var sx = 0,
    sy = 0;
  xx.on('dragstart', function (e) {
    sx = e.detail.p.x;
    sy = e.detail.p.y;
    this.fill("red");
  });

  // todo: don't know why 'this' is the only way to change the filling ...
  xx.on('dragend', function (e) {
    this.fill("green");
    var result = {
      delta: [e.detail.p.x - sx, e.detail.p.y - sy],
      element: svg_element
    };
    alert(JSON.stringify(result));
  })
}

set_draggable("ZN_18");
set_draggable("ZN_19");
set_draggable("ZN_20");
set_draggable("ZN_21");
