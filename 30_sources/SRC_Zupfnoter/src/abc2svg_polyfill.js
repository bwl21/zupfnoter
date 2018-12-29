//
// this file does some settings to ensure that abc2svg player can find soundfonts and modules.
// see https://github.com/moinejf/abc2svg/issues/85
//
// these settings were made in abcdoc-1.js which is not included in Zupfnoter
// the settings (in particuler "jsdir" is also specific for Zupfnoter

  var jsdir = '';

  abc2svg.loadjs = function (fn, relay, onerror) {
    var s = document.createElement('script');
    s.src = jsdir + fn;
    s.type = 'text/javascript';
    if (relay)
      s.onload = relay;
    s.onerror = onerror || function() {
      alert('error loading ' + fn)
    }
    document.head.appendChild(s)
  }


