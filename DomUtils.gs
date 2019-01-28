/**
* @namespace DomUtils
* client side interaction with the Dom
*/
var DomUtils = (function(ns) {
  
  ns.getGroup = function(groupName) {
    return Array.prototype.slice.apply(document.getElementsByName(groupName));
  };
  
  ns.getOptions = function(selectElem) {
    var sel = ns.elem(selectElem);
    return (Array.isArray(sel.options) ? sel.options : []).map(function(d) {
      return d.text;
    });
  };
  
  ns.getHeight = function (elem) {
    return window.getComputedStyle(ns.elem(elem)).getPropertyValue("height");
  };
  
  ns.getWidth = function (elem) {
    return window.getComputedStyle(ns.elem(elem)).getPropertyValue("height");
  };
  
  ns.getChecked = function(groupName) {
    
    var filt = (document.getElementsByName(groupName) || []).filter(function(d) {
      return d.checked;
    });
    return filt.length ? filt[0] : null;
  };
  
  ns.elem = function(name) {
    if (typeof name === 'string') {
      var elem = document.getElementById(name.replace(/^#/, ""));
    } else {
      var elem = name;
    }

    
    return elem;
  };
  ns.addStyles = function(elem, styles) {
    if (styles) {
      styles.toString().split(";").forEach(function(d) {
        if (d) {
          var s = d.split(":");
          
          if (s.length !== 2) {
            throw "invalid style " + d;
          }
          elem.style[s[0]] = s[1];
        }
      });
    }
    return elem;
  };
  ns.addElem = function(parent, type, text, className, styles) {
    parent = ns.elem(parent);
    var elem = document.createElement(type);
    parent.appendChild(elem);
    elem.innerHTML = typeof text === typeof undefined ? '' : text;
    if (className) {
      elem.className += (" " + className);
    }
    return ns.addStyles(elem, styles);
    
  };
  
  ns.addClass = function(element, className) {
    element = ns.elem(element);
    className.split(" ").forEach(function(d) {
      if (!element.classList.contains(d)) {
        element.classList.add(d);
      }
    });
    
    return element;
  };
  
  /**
  * apply a class to a div
  * @param {element} element
  * @param {boolean} addClass whether to remove or add
  * @param {string} [className] the class
  * @return {element} the div
  */
  ns.applyClass = function(element, addClass, className) {
    return ns.hide(element, addClass, className)
  };
  /**
  * apply a class to a div
  * @param {element} element
  * @param {boolean} addClass whether to remove or add
  * @param {string} [className] the class
  * @return {element} the div
  */
  ns.hide = function(element, addClass, className) {
    element = ns.elem(element);
    className = (className || "mui--hide").split(" ").forEach(function(d) {
      if (!element.classList.add) {
        throw 'classlist not supported';
      }
      var q = addClass ? ns.addClass(element, d) : element.classList.remove(d);
    });
    
    return element;
  };
  
  /**
  * flip a div
  * @param {element} element
  * @param {string} [className] the class
  * @return {element} the div
  */
  ns.flip = function(element, className) {
    element = ns.elem(element);
    element.classList.toggle(className || "mui--hide");
    return element;
  };
  
  /**
  * is hidden
  * @param {element} element
  * @param {string} [className]
  * @return {boolean} is it hidden
  */
  ns.isHidden = function(element, className) {
    element = ns.elem(element);
    return element.classList.contains(className || "mui--hide");
  };
  
  /**
  * gets context of elem if text is preceded by # and the elem exists
  *@param {string} label the label or elem id to get
  *@return {string} the result
  */
  ns.fillLabel = function(label) {
    if (label && label.toString().slice(0, 1) === '#') {
      var elem = ns.elem(label);
      return elem ? elem.innerHTML : label;
    }
    return label;
    
  }
  /**
  * remove an element from dom
  * @param {object} elem the elem to remove
  */
  ns.remove = function(elem) {
    
    var elem = DomUtils.elem(elem);
    elem.parentElement.removeChild(elem);
  };
  
  ns.getQuery = function(selector) {
    
    return [].map.call(document.querySelectorAll(selector), function(d) {
      return d;
    });
  }
  ns.translateRelative = function (elem, x,y) {
    var target = ns.elem(elem);
    x += (parseFloat(target.getAttribute('data-x')) || 0);
    y += (parseFloat(target.getAttribute('data-y')) || 0);
    return ns.translate (elem ,x,y)
  }
  ns.translate = function(elem, x, y) {
    var target = ns.elem(elem);
    target.style.webkitTransform =
      target.style.transform =
        'translate(' + x + 'px, ' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    return target;
  };
  
  ns.verticalFlip = function(elem) {
    var target = ns.elem(elem);
    var rt = target.style.transform ? '' : 'rotate(180deg)';
    target.style.webkitTransform =
      target.style.transform =
        rt;
    return target;
  };
  ns.getId = function(elem) {
    return ns.elem(elem).id;
  };
  ns.makeId = function() {
    
    return new Date().getTime().toString(32) + "-" + Math.round(Math.random() * 10000).toString(32);
    
  }
  
  ns.classPatch = function  (className, property, newValue) {
    
    // get the known styles and make any changes
    ns.getQuery ("style").forEach(function(d) {
      var rxs = '([\\s\\S]*\\.'+className+'\\s*{[\\s\\S]*?'+property+'[\\s]*?:[\\s]*?)([\\w#]+)([\\s\\S]*)';
      var rx = new RegExp(rxs,"mig");
      if (d.innerHTML.match(rx)) {
        d.innerHTML = d.innerHTML.replace(rx,"$1"+newValue+"$3");
      }
    });
  };
  
  return ns;
})(DomUtils || {});
