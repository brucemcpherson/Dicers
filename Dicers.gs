/**
 * manages the dicers in the sidebar
 * @namespace Dicers
 */
var Dicers = (function(ns) {
  'use strict';
  
  /**
   * delete the current dicers
   * @return {Dicers} self
   */
  ns.destroy = function () {
    var ds = ns.settings.dicers;
    Object.keys (ds)
    .forEach (function (k) {
      kill_ (ds[k]);
    });
  };
  
  ns.getDicers = function () {
    return ns.settings.dicers;
  };
  
  ns.settings = {
    interact: {
      containerHeight: 0,
      containerWidth: 0,
      quietColor: "",
      selectedColor: "",
      unselectedColor: "",
      hoverColor: "",
      tooltipColor: "",
      sortData: true,
      staggerLeft: 24,
      staggerTop: 30,
      dicerWidth: 160,
      dicerHeight: 220,
      staggerWrap: false
    },
    elements: {},
    dicers: {},
    isIconAllowed:function (dicer , iconKey ) {
      return true;
    },
    empty: "&lt;empty&gt;",
    tooltips: {
      content: {
        multi: "tooltip-multi",
        single: "tooltip-single",
        cancel: "tooltip-cancel",
        ascending: "tooltip-ascending",
        descending: "tooltip-descending",
        remove: "tooltip-remove",
        blow: "tooltip-blow",
        color: "tooltip-color",
        values: "tooltip-values",
        and: "tooltip-and",
        or: "tooltip-or",
        not: "tooltip-not",
        notnot: "tooltip-notnot"
      },
      control: {
        delay: 1200,
        loitering: null,
        target: null
      }
    },
    on: {
      // default event handlers
      change: function(dicer) {},
      remove: function(dicer) {},
      add: function(dicer) {},
      color: function(dicer) {},
      descending: function(dicer) {},
      or: function(dicer) {},
      not: function (dicer) {},
      multi: function (dicer) {}
    }
  };

  /**
   * the interaction setttings
   * @return {object} settings
   */
  ns.getInteractSettings = function() {
    return ns.settings.interact;
  };

  /**
   * how many are there
   * @return {number} count of dicers
   */
  ns.getCount = function() {
    return Object.keys(ns.settings.dicers);
  };
  /**
   * change event handlers
   * @param {string} event the event
   * @param {func} function what to call with func(dicer)
   * @return {Dicers} self
   */
  ns.on = function(event, func) {

    var s = ns.settings;
    // check its a possible event
    if (!s.on.hasOwnProperty(event)) {
      throw new Error(event + ' is not a valid dicer event-try one of:' + Object.keys(s.on).join(","));
    }
    // check its a function
    if (typeof func !== "function") {
      throw new Error("argument for event " + event + " is not a function");
    }
    // set up
    s.on[event] = func;
    return ns;
  };

  /**
   * called from clieanr side to set up dom related stuff
   * before doing anything else
   * @raturn {Dicers} self
   */
  ns.init = function() {
    var s = ns.settings;

    s.elements.diceArea = DomUtils.elem('dicearea');
    s.interact.containerWidth = s.elements.diceArea.offsetWidth;
    s.interact.containerHeight = s.elements.diceArea.offsetHeight;

    return ns;
  };

  /**
   * remove and unplot a dicer
   * @param {object} dicer
   * @return {Dicers} self
   */
  ns.remove = function(dicer) {

    // call the event before the remove
    ns.settings.on.remove(dicer);
    return kill_ (dicer);

  };
  
  function kill_ (dicer) {
    
    // remove it
    DomUtils.remove(dicer.element);

    if (ns.settings.dicers.hasOwnProperty(dicer.key)) {
      delete ns.settings.dicers[dicer.key];
    };
    // sort out what's in front now
    ns.front();
    return ns;
  }

  /**
   * iterate over dicers
   * @param {function} func the func to do
   * @return {Dicers} self
   */
  ns.iterate = function(func) {
    Object.keys(ns.settings.dicers).forEach(function(d, i) {
      func(ns.settings.dicers[d], i);
    });
    return ns;
  };
  


  /**
   * bulk cancel of all dicers
   * @return {Dicers} self
   */
  ns.cancelAll = function() {
    Object.keys(ns.settings.dicers).forEach(function(d) {
      ns.settings.dicers[d].selected = [];
      ns.selectRender(ns.settings.dicers[d]);
    });
    return ns;
  };

  /**
   * called to establish current dicer structure
   * whenever there's a change to selected slicers
   * @param {object} dicers the new dicers
   * @raturn {Dicers} self
   */
  ns.sync = function(dicers) {
    var s = ns.settings;
    var du = DomUtils;
    dicers = dicers || {};


    
    // get rid of any dicers that are no longer here
    Object.keys(s.dicers)
    .forEach(function(c) {
      if (!dicers.hasOwnProperty(c)) {
        ns.remove(s.dicers[c]);
      }
    });
    

    // add any new ones
    Object.keys(dicers).forEach(function(d) {

      var dicer = s.dicers[d];

      var flags = Utils.vanMerge([{
        descending: false,
        multi: false,
        color: false,
        or: false,
        not: false,
        width: s.interact.dicerWidth,
        height: s.interact.dicerHeight,
        top:0,
        left:0,
        itemHeight: 0
      }, dicers[d].flags]);
      
      if (!s.dicers.hasOwnProperty(d)) {

        var now = new Date().getTime();

        dicer = s.dicers[d] = {
          element: du.addElem(s.elements.diceArea, "div", "", "diceable mui-panel"),
          created: now,
          promoted: now,
          key: d,
          icons: {},
          flags: flags,
          selected: [],
          data: {}
        };

        // create some unique id for the element
        dicer.element.id = du.makeId();
        dicer.element.style.width = dicer.flags.width + "px";
        dicer.element.style.height = dicer.flags.height + "px";
        dicer.iconElement = du.addElem (dicer.element , "div","","dicer-icon-element");
        du.addElem(dicer.element, "div", "", "mui-divider");
        dicer.captionElement = du.addElem (dicer.element , "div","","dicer-caption");

        //------add the icons for dicer actions
        
        function iconAction_ (dc , e , ik ,  swapIcon , initialIcon) {
          dc.flags[ik] = !dc.flags[ik];
          e.target.innerHTML = dc.flags[ik] ? swapIcon : initialIcon;
         
          ns.settings.on[ik](dc);
        }
        
        // delete this dicer
        dicer.icons.remove = iconize("remove", dicer, "delete", function(dc, e , ik , initial) {
          ns.remove(dc);
        }, s.tooltips.content.remove);


        // sort dicer
        dicer.icons.descending =  iconize("descending", dicer, "sort", function(dc, e , ik , initial) {
          iconAction_ ( dc , e , ik , "sort" , initial);
          //flip the icon
          du.verticalFlip(e.target);
        }, function(dc) {
          return dc.flags.descending ? s.tooltips.content.ascending : s.tooltips.content.descending;
        });
        
        // cancel all selections
        dicer.icons.cancel = iconize("cancel",dicer, "flash_off", function(dc, e , ik , initial) {
          // this ones a little different as there is no bi-state
          dc.selected = [];
          ns.selectRender(dc);
        }, s.tooltips.content.cancel);


        // a multi.single dicer
        dicer.icons.multi =  iconize("multi", dicer, "done_all", function(dc, e , ik , initial) {
          iconAction_ ( dc , e , ik , "done" , initial );
        }, function(dc) {
          return dc.flags.multi ? s.tooltips.content.single : s.tooltips.content.multi;
        });
        
        
        // a color dicer
        dicer.icons.color =  iconize("color", dicer, "color_lens", function(dc, e , ik , initial) {
          iconAction_ ( dc , e , ik , "view_module" , initial );
        }, function(dc) {
          return dc.flags.color ? s.tooltips.content.values : s.tooltips.content.color;
        });
        
        
        // an OR dicer
        dicer.icons.or =  iconize("or", dicer, "playlist_add", function(dc, e , ik , initial) {
          iconAction_ ( dc , e , ik , "playlist_add_check" , initial );
        }, function(dc) {
          return dc.flags.or? s.tooltips.content.and : s.tooltips.content.or;
        });
        

        // a  NOT dicer
        dicer.icons.not =  iconize("not", dicer, "speaker_notes_off", function(dc, e , ik , initial) {
          iconAction_ ( dc , e , ik , "speaker_notes" , initial );
        }, function(dc) {
          return dc.flags.not ? s.tooltips.content.notnot : s.tooltips.content.not;
        });
        

        //--- deal with the layout of a new dicer
        var p = Object.keys(s.dicers).length - 1;
        var maxPanels = Math.floor((s.interact.containerWidth - dicer.element.offsetWidth) / s.interact.staggerLeft);
        
        // how left & top it should be. If there are previous saves for this it'll be rememebered
        dicer.flags.left = dicer.flags.left || (s.interact.staggerLeft * (s.interact.staggerWrap ? (p % maxPanels) : p));
        dicer.flags.top = dicer.flags.top || (p * s.interact.staggerTop);
       
        // position it
        du.translate(dicer.element, dicer.flags.left, dicer.flags.top);
        
        
        // add the label
        var p = du.addElem(dicer.captionElement, "span", 
                           "<strong>" + (d === "" ? ns.settings.empty : d) + "</strong>", "mui--text-caption");
        p.id = du.makeId();
        blowTool(p, d);

        du.addElem(dicer.element, "div", "", "mui-divider");
        dicer.content = {
          element: du.addElem(dicer.element, "div")
        };

        // call the event handler after the new ones been added
        ns.settings.on.add(dicer);
      }

      //now update the content
      dicer.data.values = dicers[d].values;
      dicer.flags = dicers[d].flags || dicer.flags;
      // but we we have to drop any selected no longer in the list
      // better to drive off the data list as the selected list will be shorter for indexofing
      dicer.selected = dicer.data.values.filter(function(f) {
        return dicers[d].selected.indexOf(f) !== -1;
      });

    });

    // put last plotted on top & populate with latest data
    // and add listeners
    ns.populate()
      .front()
      .listeners();

    /**
     * this handles making icons, assigning tooltips etc
     */
    function iconize(iconKey,dicer, icon, func, tooltip) {
      var s = ns.settings;
      var du = DomUtils;

      // add a span to hold the item
      var p = du.addElem(
        dicer.iconElement, "span", "", "dicer-icons mui--pull-right clickable-icon"
      );
      
      // we'll need an id to make tooltips work
      p.id = du.makeId();

      // add the icon
      var i = du.addElem(p, "i", icon, "material-icons dicer-icon-color-enabled");
      
      // add tool tip if required
      tooltipize(p, tooltip, dicer);

      // assign clicker
      if (func) {
        p.addEventListener("click", function(e) {
          // always clear any tooltip first
          clearTip();
          // execute the click function if not pro, or proenabled
          if (ns.settings.isIconAllowed(dicer, iconKey)) {
            func(dicer, e, iconKey , icon);
          }
          
        }, false);
      }

      return i;
    }

    return ns;
  };
  /**
   * this will remove the active tooltip
   */
  function clearTip() {
    var s = ns.settings;
    var du = DomUtils;
    if (s.tooltips.control.loitering) {
      du.hide(s.tooltips.control.loitering, true);
      s.tooltips.control.loitering = null;
    }
  }
  // can add a tooltip to an element
  function blowTool(elem, content) {
    // this will make the header into a tooltip in case its too long
    var du = DomUtils;
    var s = ns.settings;

    tooltipize(elem, function(e) {
      du.elem(e).innerHTML = content;
      return e;
    }, s.tooltips.content.blow);
    return du.elem(elem);
  }

  /**
   * this handles making icons, assigning tooltips etc
   */
  function tooltipize(target, tooltip, tipArg) {
    var s = ns.settings;
    var du = DomUtils;
    var tc = s.tooltips.control;

    // if there's a toolip the we need to holler
    if (tooltip) {
      // add the event
      target.addEventListener("mouseover", function(e) {

        // the tip can be dynamic or static
        var tip = typeof tooltip === "function" ? tooltip(tipArg) : tooltip;

        // if not already showing this one
        if (!tc.loitering || tc.loitering !== tip || !tc.target || tc.target.id !== target.id) {

          // hide the other one
          clearTip();

          // this is now the active one
          tc.loitering = tip;
          tc.target = target;

          // wait a bit then show it
          Provoke.loiter(s.tooltips.control.delay)
            .then(function() {
              // if this is still the good one then move it to the right place
              // and then show it
              if (tc.loitering === tip && tc.target.id === target.id) {
                du.translate(tip, e.clientX + 4, e.clientY);
                du.hide(tip, false);
              }

            });
        }
      }, false);

      target.addEventListener("mouseout", function(e) {
        // cancel any waiting and hide this one
        var tip = typeof tooltip === "function" ? tooltip(tipArg) : tooltip;
        s.tooltips.control.loitering = s.tooltips.control.target = null;
        du.hide(tip, true);
      }, false);
    }
    return ns;
  }
  
  /**
   * redo all the dicers
   */
  ns.allSort = function () {
    ns.iterate(function (d) {
      ns.sort(d);
    });
  }
  /**
   * re-rerender
   * @param {object} dicer the dicer to sort
   * @return {Dicers} self
   */
  ns.sort = function(dicer) {

    var du = DomUtils;
    // we can use the interactable to get its position & width & height
    // this will be used for saved settings
    var rect = Process.control.dicer.interactor.getRect(dicer.element);
    if (rect) {
      dicer.flags.height = rect.height;
      dicer.flags.width = rect.width;
    }
    

    // now need to replot the values as they may have been sorted
    dicer.data.values.forEach(function(d, i) {
      // this container holds potentially 2 spans
      // onfor the value and another for the color if using
      
      // the value was should have already been made
      var eid = dicer.content.items[i].id;
      var ve = du.elem(eid + "-value");
      
      // show the value , or the symbol for empty
      ve.innerHTML = (d === "" ? ns.settings.empty : d);

      // enables tooltip with this value
      blowTool(dicer.content.items[i], d);

      // find the element being used for color
      var ce = du.elem(eid + "-background");

      // if we ever have a a heiogt/width then store it for later use
      // because if this is happening when the div
      // is hidden, it;ll be 0.
      dicer.flags.itemHeight = dicer.content.items[i].offsetHeight || dicer.flags.itemHeight;


      // if coloring, then we need to style and reveal 
      if (dicer.flags.color) {
        if (!ce) {
          ce = du.addElem(eid, "span", "", "dicer-background");
          ce.id = eid + "-background";
        }

        // the size of the color bar relative to the usual height of the dicer
        ce.style.backgroundColor = d;
        ce.style.height = dicer.flags.itemHeight - 16 + "px";
        ce.style.width = dicer.flags.width * .5 + "px";

      } else {
        // if there is one then hide it
        if (ce) {
          du.hide(ce, true);
        }
      }

    });
    ns.selectRender(dicer);
    return ns;
  };

  /**
   * add event listeners
   * @return {Dicers} self
   */
  ns.listeners = function() {
    var s = ns.settings;
    Object.keys(s.dicers).forEach(function(d) {
      var dicer = s.dicers[d];

      dicer.content.items.forEach(function(z, i) {
        // click event is a change to the selected list
        z.addEventListener("click", function(e) {

          // redo the selected list
          var value = dicer.data.values[i];
          if (dicer.selected.indexOf(value) === -1) {
            // initialize current selected list
            // if its not multi, then a selection cancels all the others
            if (!dicer.flags.multi) {
              dicer.selected = [];
            }
            // add the new one
            dicer.selected.push(value);
          } else {
            // we're removing it
            dicer.selected = dicer.selected.filter(function(m) {
              return m !== value;
            });
          }
          // now redo the dicer selection
          ns.selectRender(dicer);
        }, false);
      });
    });
  };

  /**
   * redo the selected render status of the dicer
   * @param {object} dicer the dicer to do
   * @return {Dicers} self
   */
  ns.selectRender = function(dicer) {
    var si = ns.settings.interact;
    var du = DomUtils;
    du.hide (dicer.captionElement , dicer.flags.or , "dicer-iconor");

    dicer.content.items.forEach(function(d, i) {
      var value = dicer.data.values[i];
      var selected = dicer.selected.indexOf(value) !== -1;
      var id = d.id + "-value";
      
      if (dicer.selected.length) {
        du.applyClass(d, selected, "dicer-selected");
        du.applyClass(d, !selected, "dicer-unselected");
      } else {
        du.applyClass(d, false, "dicer-selected dicer-unselected");
      }
    });
    ns.settings.on.change(dicer);
  };
  /**
   * populate the dicer with the current values
   * @return {Dicers} self
   */
  ns.populate = function() {
    var s = ns.settings,
      du = DomUtils;

    Object.keys(s.dicers).forEach(function(d) {
      var dicer = s.dicers[d];
      
      // sort out those that can be shown
      Object.keys(dicer.icons).forEach(function(t) {
        du.hide (dicer.icons[t], !ns.settings.isIconAllowed(dicer, t) ,"dicer-icon-color-disabled");
        du.hide (dicer.icons[t].parentElement, !ns.settings.isIconAllowed(dicer, t) ,"clickable-icon-notallowed");
      });

      dicer.content.element.innerHTML = "";
      dicer.content.items = dicer.data.values.map(function(e) {
        var elem = du.addElem(dicer.content.element, "div", "", "dicer-frame dicer-quiet");

        // this is the parent of the text & the color panel if there is one
        elem.id = DomUtils.makeId();
        du.addElem(elem, "span", "", "dicer-value").id = elem.id + "-value";

        if (dicer.flags.color) {
          du.addElem(elem, "span", "", "dicer-background").id = elem.id + "-background";
        }
        return elem;
      });
      ns.sort(dicer);
    });
    // and sort

    return ns;
  };

  /**
   * called from Interactor when a new slicer moves to the top
   * @param {DOmElement} element the element to promote to the top
   * @raturn {Dicers} self
   */
  ns.promote = function(element) {

    var key = Object.keys(ns.settings.dicers)
      .filter(function(d) {
        return ns.settings.dicers[d].element.id === element.id;
      })[0];
    if (!ns.settings.dicers[key]) console.log(element);
    ns.settings.dicers[key].promoted = new Date().getTime();
    ns.front();
    return ns;
  };

  /**
   * establish the front dicer - last one in or promoted
   * @raturn {Dicers} self
   */
  ns.front = function() {

    // sort and get on top
    Object.keys(ns.settings.dicers).sort(function(a, b) {
        return ns.settings.dicers[b].promoted - ns.settings.dicers[a].promoted;
      })
      .forEach(function(d, i) {
        return Interactor[i ? 'toBack' : 'toFront'](ns.settings.dicers[d].element);
      });
    return ns;
  };

  return ns;
})(Dicers || {});