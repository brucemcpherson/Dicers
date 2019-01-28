/**
* @namespace Interactor
* manage dicers resizing and repositioning
*/
var Interactor = (function(ns) {
  'use strict';
  
  
  ns.settings = {
    front: "mui--z2 front"
  };
  
  /**
  * turn drag and resize restrictions off /on
  * @param {Interactable} interactable the item
  * @param {boolean} enable enable/disable
  * @return {Interactor} self
  */
  
  ns.enableRestrictions = function (interactable, enable) {

    interactable.options.drag.restrict.enabled = 
      interactable.options.drag.restrict.enabled = enable;
    return ns;
  }  
  
  /**
  * called at the beginning
  * to define the selector criteria for Interaction
  * @param {string} selector queryselector
  * @param {boolean} [allowScroll=false] whether to allow them to scroll outside area
  * @return {Interactor} self
  */
  ns.setup = function(selector,allowScroll) {
    
    //,
    // 
    var restrict =  {
      restriction: "parent",
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    };
    
    return interact(selector)
    .draggable({
      restrict: restrict
    })
    .resizable({
      edges: {
        left: true,
        right: true,
        bottom: true,
        top: true
      },
      restrict: {
        restriction: restrict
      }
    })
    
    .on('dragmove',function (event) {
      DomUtils.translateRelative(event.target, event.dx, event.dy);
    })
    .on('resizemove', function(event) {
      
      var target = event.target,x=0,y=0;
      // update the element's style
      if (event.edges.right || event.edges.left) {
        target.style.width = event.rect.width + 'px';
        // translate when resizing from top or left edges
        x += event.deltaRect.left;
      }
      if (event.edges.bottom || event.edges.top) {
        target.style.height = event.rect.height + 'px';
        // translate when resizing from top or left edges
        y += event.deltaRect.top;
      }
      // translate when resizing from top or left edges 
      DomUtils.translateRelative(target, x, y);
      
    })
    .on('hold', function(event) {
      // put all to back 
      Dicers.promote(event.currentTarget);
    });
  };
  
  
  ns.rearrange = function(selector) {
    // put all to back 
    DomUtils.getQuery(selector).forEach(function(element) {
      ns.toBack(element);
    });
  };
  ns.toBack = function(element) {
    if (element) {
      DomUtils.applyClass(element, false, ns.settings.front);
    }
    return ns;
  };
  ns.toFront = function(element) {
    if (element) {
      DomUtils.applyClass(element, true, ns.settings.front);
    }
    return ns;
  };
  
  return ns;
  
})(Interactor || {});

