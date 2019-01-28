/**
* manages the connection between the data and the dicers
* all parameters and globals are maintained here
* @namespace Process
*/
var Process = (function (ns) {
  
  "use strict";
  
  // stuff that applies both client and server side
  ns.globals = {
    resetProperty:"dicersSettings",
    purchaseLevel:'dicersLevel',
    saltKey:"salt",
    saveSheet:"saveSheet_",
    crushing:false,
    paymentTypes:{
      renew:'Unlimited usage for one year',
      subscribe:'Unlimited usage for one year',
      none:"Not subscribed",
      coupon:"Coupon"
    },
    plans: {
      pro: {
        name:'pro',
        amount:800,
        description:'Dicers Pro'
      },
      standard: {
        name:'standard',
        amount:0,
        description:'Dicers Standard'
      }
    },
    version:"2.0.0.2"
  };
  
  /**
  * apply the contents of the elementer to the app settings
  * @return {boolean} whether anything changed
  */
  ns.applyElementer  = function () {
    var before = Utils.clone (ns.control.dicer.settings);
    ns.control.dicer.settings =  DicerWorker.mapSettings (ns.control.dicer.elementer);
    return JSON.stringify(before) !== JSON.stringify(ns.control.dicer.settings);
  };
  
  /**
   * give a reminder if required
   */
  ns.reminder = function () {
    var sc = ns.control;
    var current = sc.dicer.elementer.getCurrent();
    if (current.expiryReminder) {
      var now = new Date().getTime();
      var pd = Process.control.registration.data;
      var expire = pd && pd.plan && pd.plan.expire ? pd.plan.expire : null;
      var odds = sc.reminder.odds, diff = 0;
      if (expire) {
        var diff = (now - expire)/(24*60*60*1000);
        if (Math.abs(diff) < sc.reminder.critical) {
          odds = 1 - Math.abs(diff)/sc.reminder.critical;
        }
      }
      var chance = Math.random();
      if (chance < odds ) {
        var message;
        var days = Math.round(Math.abs(diff));
        if (expire) {
          if (!ns.isPro()) {
            message = "Your subscription expired " + days + " days ago. Visit the upgrade page to resubscribe";
          }
          else {
            message = Math.abs(diff) < sc.reminder.critical * 1.5 ? 
              ("Your subscription will expire in " + days + " days. Visit the upgrade page to extend") : "";
          }
        }
        else {
          message = "Visit the Upgrade page to enable Pro features";
        }
        if (message) {
          App.toast ("Pro subscription reminder", message);
        }
      }
    }

  };
  
  /**
  * initialize client side stuff
  * @return {Process} self
  */
  ns.initialize = function () {
    
    
    // set up the elementer
    var maxHeight = DomUtils.elem("dicearea").offsetHeight || 360;
    var vizSetup = DicerWorker.setup(maxHeight);
    
    // this will create the structure for retrieving settings
    var elementer = DicerWorker.doElementer(vizSetup);
    var elements = elementer.getElements();
    
    ns.control = {

      block:null,
      dicer:{
        interactor:null,
        diceable: '.diceable',
        setup:vizSetup,
        elementer:elementer,
        settings:{},
        store:{
          useInitial:null,
          useStandard:null,
          useUser:null,
          useDocument:null,
          reset:{
          }
        },
        testData:getTestData()
      },
      registration: {
        
      },
      tabs: {
        settings:DomUtils.elem("elementer-root")
      },
      
      
      chart: {
        select:DomUtils.elem("dicer-select"),
        elem:DomUtils.elem("dicearea"),
        instructions:DomUtils.elem("instructions"),
        mainButtons:DomUtils.elem("main-buttons"),
        defOptions:{
          width:DomUtils.elem("dicearea").offsetWidth
        }
      },
      
      code: {
        svg:elements.controls.svgCode
      },
      
      elems: {
        cost:DomUtils.elem("subscription-charge"),
        paid:DomUtils.elem("subscribed"),
        unpaid:DomUtils.elem("not-subscribed"),
        runsOut:DomUtils.elem("runs-out"),
        subscribedPlan:DomUtils.elem("subscribed-plan")
      },
      
      buttons: {
        insert:DomUtils.elem("insert-button"),
        pause:DomUtils.elem("pause-button"),
        manage:elements.controls.manageButton,
        apply:elements.controls.applyButton,
        clear:DomUtils.elem("clear-button"),
        generate:DomUtils.elem("generate-button"),
        pay:DomUtils.elem("pay"),
        payExtend:DomUtils.elem("pay-extend"),
        reset:[
          elements.controls.resetButton_behavior,
          elements.controls.resetButton_colors,
          elements.controls.resetButton_dataSettings,
          elements.controls.resetButton_proSettings,
          elements.controls.resetButton_appearance,
          elements.controls.resetButton_account
        ]
      },
      
      watching: {
        
        watcher:new ClientWatcher ({
          pollFrequency:997,
          scope:{
            name:elements.controls.wholeSheet.value ? "data" : "active",
            range:""
          },
          properties:[
            'BackgroundColors',
            'DisplayValues',
            'Values'
          ],
        })

      },
      
      toast: {
        interval:3500
      },
      
      
      
      // create a queue of events
      // to batch up requests if possible
      queue: {
        dicers:[],
        interval:1103
      },
      
      
      // clean up any unneeded saved props from time to time
      // this is low priority task so dont do it very often
      cleanSaved: {
        interval:20000
      },
      
      // this is a saved cache to avoid continually looking at save properties
      saved: {
        
      },
      
      pro:{
        features:["saveSheetDicers","clearSheetDicers","proDisabled",
                  "autoFindTables","autoFindTablesMode","autoFindTablesRank","autoFindTablesRowTolerance","autoFindTablesColumnTolerance"],
        icons:["color","or","not"],
        sheetSettings: ["wholeSheet", "activeRange","specificRange","specificRangeValue",
                        "autoFindTables", "autoFindTablesMode","autoFindTablesRank","autoFindTablesRowTolerance",
                        "autoFindTablesColumnTolerance","sortData"]
      },
      reminder: {
        odds:0.05,
        critical:28
      }
    };
    

                      
    
    //----- watcher events provoke a resync
    var watcher = ns.control.watching.watcher;
    
    watcher.on ('sheet', function (data) {

      // the sheet has changed
     
      return ns.changedSheet (data)
      .then (function (saved) {
        ns.saved = saved;
        return ns.changedValues (data);
       });
      
    })
    
    .on ('dimensions',function (data) {
      // just act as if only data has changed
      
      return ns.changedValues (data);
    })
    
    .on ('values', function (data) {
     
      return ns.changedValues (data);
      
    });
    
    function addQueue_ (dicer, replace) {
      
      // the queue
      var pq = ns.control.queue;
      
      // keep the mirror up to date
      var dc = Process.control.dicers[dicer.key];
      if (replace.remove) {
        // get rid of it
        Utils.removeProperty ( Process.control.dicers, dicer.key ,true);
      }
      else {
        dc.flags = dicer.flags;
        dc.selected = dicer.selected;
      }
      
      
      // remove any existing items in the queue for this dicer
      pq.dicers = pq.dicers.filter(function(k) {
        return k.key !== dicer.key;
      });
      
      // add to queue
      pq.dicers.push(replace);
      
      Client.pokeChange();

    }
    
    /**
     * establish what needs to be send to the server
     * for filtering
     * in order to bunch up requests, a queue has been added to as 
     * user input happens
     * if there's anything to do then we need to send all the dicers current states to the server
     * for filter processing
     * @return {[object]} the queue
     */
    ns.establishQueue = function () {
      var queue = [];
      if (ns.control.queue.dicers.length) {
        
        Dicers.iterate (function (dicer) {
          queue.push ( {
            flags:dicer.flags,
            selected:dicer.selected,
            key:dicer.key
          });
        });
        ns.control.queue.dicers = [];
      }
      
      return queue;
    };
    //----- dicer events provoke an update    
    Dicers.settings.isIconAllowed = function (dicer , iconKey) {
      return ns.isProEnabled() || Process.control.pro.icons.indexOf(iconKey) === -1;
    };
    
    function onDicerDefault_ (dicer) {
      addQueue_ (dicer , {
        key:dicer.key,
        selected:dicer.selected,
        flags:dicer.flags
      });
    };
    
    Dicers.on("remove",function(dicer) {
      addQueue_ (dicer , {
        key:dicer.key,
        selected:[],
        flags:dicer.flags,
        remove:true
      });
    });
    
    Dicers.on("multi",function(dicer) {
      onDicerDefault_ (dicer);
    });
    
    Dicers.on("change",function(dicer) {
      onDicerDefault_ (dicer);
    });
    
    // if a change in dicer color status
    Dicers.on("color",  function (dicer) {
      onDicerDefault_ (dicer);
      ns.control.watching.watcher.pokeDomain ("values");
    });
    
    Dicers.on("descending",function(dicer) {
      // force a rethink
      ns.changedValues (ns.control.result);
    });
    
    Dicers.on("or",function(dicer) {
      // force a rethink
      onDicerDefault_ (dicer);
      ns.control.watching.watcher.pokeDomain ("values");
    });
    
    // change in status
    Dicers.on("not",  function (dicer) {
      onDicerDefault_ (dicer);
      // force a rethink
      ns.control.watching.watcher.pokeDomain ("values");
    });
    
    
    //------get and apply any stored properties  
    return new Promise (function (resolve, reject) {
      
      Provoke.run ('Props','getAll')
      .then( function (result) {
        var pc = ns.control.dicer.store;
        
        // the factory settings
        pc.useStandard = elementer.getStandard();

        
        // any data found in property stores
        result.saved.forEach(function(d) {
          var s = Utils.vanMerge ([pc.useStandard, d.settings]);
          pc[d.source] = s; 
          elements.controls[d.source].disabled = s ? false : true;
          if (s) {
            elementer.setInitial (s);
          }
        });
        
        
        // the finally decided upon initial values
        pc.useInitial = elementer.getInitial();
        
        // map the values 
        ns.applyElementer();
        resolve (elementer);
      })
      ['catch'](function (err) {
        App.showNotification ("failed while getting saved properties ", err);
        reject (err);
      });
    });
    
  };
  
  /**
  * bring up a list of checkboxes to allow dicer population to be modified
  */
  ns.showDicerSelect = function () {
    
    // create the list from the known columns
    var sc = ns.control;
    var du = DomUtils;
    
    // if we have any data
    if (sc.columns && sc.columns.length) {
      
      // hide the dicers and prevent double clicking
      du.hide(sc.chart.mainButtons,true);
      du.hide (sc.chart.elem, true);
      
      // clear out the panel
      sc.chart.select.innerHTML = "";
      
      // add a master button and closer
      var panel = sc.chart.select;
      var tr = du.addElem(panel,"div")
      
      
      var td = du.addElem (tr,"span","","mui-checkbox");
      var mastercb = du.addElem(td,"input");
      mastercb.type = "checkbox";
      du.addElem (td,"span","Columns");
      
      var close = du.addElem (td,"span",""," mui--pull-right dicer-icons clickable-icon");
      du.addElem(close, "i", "close", "material-icons","font-size:130%;");
      
      // divide it 
      du.addElem(panel,"div","","mui-divider");
      
      // make a table of all columns with checkboxes
      var cbs = sc.columns.map (function (c) {
        var tr = du.addElem (panel,"div");
        var td = du.addElem (tr,"span","","mui-checkbox");
        var cb = du.addElem(td,"input");
        cb.type = "checkbox";
        cb.checked = Dicers.settings.dicers.hasOwnProperty(c);
        du.addElem (td,"span",c);
        return cb;
      });
      
      // make some buttons
      du.addElem (panel,"button","APPLY","button-item action")
      .addEventListener("click", closePanel , false);
      
      du.addElem (panel,"button","CANCEL","button-item")
      .addEventListener("click", cancelPanel , false);
      
      // set them all
      mastercb.addEventListener ("change", function () {
        cbs.forEach(function(c) {
          c.checked = mastercb.checked;
        });
      },false);
      
      // close the thing
      close.addEventListener ("click" , closePanel , false);
      
      
      // show the select panel
      du.hide (sc.chart.select, false);
      
      
    }
    
    function cancelPanel () {
      // hide the thing
      du.hide (sc.chart.select, true);
      du.hide (sc.chart.elem, false);
      du.hide(sc.chart.mainButtons,false);
    }
    
    function closePanel () {
      
      // now apply selections
      sc.columns.forEach(function (c,i) {
        // remove any not selected
        if (cbs[i].checked) {
          sc.dicers[c] = sc.dicers[c] || ns.dicerTemplate (c);
        }
        else {
          if (sc.dicers.hasOwnProperty (c) ) {
            Utils.removeProperty (sc.dicers , c);
          }
        }        
      })
      
      cancelPanel();
      
      // update the dicers
      ns.changedValues (Process.control.result);
    }
  };
  
  
  
  /**
  * will be called to restore any values reserverd for this page
  * @param {Elementer} elementer the elementer
  * @param {string} branch the branchname
  */
  ns.restoreResetValues = function (elementer , branch) {
    
    // if apply has been used, then the reset values will be null and this wont happen.
    
    // merge them with the current settings and apply them to the chart
    if (ns.control.dicer.store.reset[branch]) {
      elementer.applySettings(Utils.vanMerge([elementer.getCurrent(),ns.control.dicer.store.reset[branch]]));
    }
    
    
  }
  
  /**
  * will be called on entering a page that needs preserved to store initial values affected by that page
  * @param {Elementer} elementer the elementer
  * @param {string} branch the branchname
  */
  ns.reserveResetValues = function (elementer, branch) {
    
    // all the current values
    var current = elementer.getCurrent();
    
    // the items on this page
    var items = elementer.getLayout().pages[branch].items;
    
    // store the values on this page
    ns.control.dicer.store.reset[branch] = items.reduce(function (p,c) {
      if (current.hasOwnProperty(c)) p[c] = current[c];
      return p;
    },{});
    
  }
  /**
  * make a vanilla dicer
  * @param {string} the dicer key
  * @return {Object} the dicer template
  */
  ns.dicerTemplate = function (key) {
    return  {
      selected:[],
      flags:{},
      key:key
    };
    
  };
  
  /**
   * reveal chart or help area
   */
  function reveal_ (chart) {
    var sc = Process.control;
    DomUtils.hide (sc.chart.elem,!chart);
    DomUtils.hide (sc.chart.instructions,chart);
    DomUtils.hide (sc.chart.mainButtons,!chart);
  }
  
  /**
   * client watcher has detected a changed sheet
   * @param {object} data see above
   * @return {Promise} 
   */
  ns.changedSheet = function (data) {
    
    var sc = ns.control;
    var controls = sc.dicer.elementer.getElements().controls;

    
    // store this for later
    sc.result = data;
    sc.columns = [];
    
    // destroy the current dicers and data description and queue
    sc.columns = [];
    sc.dicers = {};
    Dicers.destroy();
    sc.queue.dicers = [];
    
    // get the values
    var values = data.values && data.values.Values ?  data.values.Values : null
    
    // if there's none (a blank sheet usually sends back 1 blank cell), then offer to generate some and go away
    if (!values ||
        (values.length === 1 && values[0].length === 1 && values[0][0] === "")) { 
      return Promise.resolve (null);
    }
      
    // we have to use a fiddler to deal with blank/dup headers consistently, 
    // but we only actually need the first row
    var fiddler = new Fiddler()
    .setBlankOffset(sc.result.dimensions.columnOffset)
    .setRenameDups(true)
    .setRenameBlanks(true)
    .setValues(values.slice(0,1));
    
    // the columns for this sheet
    sc.columns = fiddler.getHeaders();
    
    // figure out what the default dicers should be
    sc.dicers = sc.columns
    .slice (0, controls.autoCreateMax.value)
    .reduce(function(p,c) {
      p[c] = ns.dicerTemplate(c) ; 
      return p;
    },{});
    

    // we need to get any saved sheet info
    return ns.isProEnabled() && controls.saveSheetDicers.checked ? 
      
      // its a pro version, so there might be some saved stuff
      Client.getSaveSheetDicers(sc.result.sheet)
      .then (function (result) {
        
        var saved = result ? result.items : null;
        var sheetSettings = result ? result.sheetSettings : null;
        
        // if we have sheet settings to apply, then do that
        if (sheetSettings) {
          Process.control.dicer.elementer.applySettings(sheetSettings);
          DicerWorker.mapSettings(Process.control.dicer.elementer);
        }
        
        if (saved) {
          // get rid of any saved that are no longer here

          sc.saved = saved.filter(function (d) {
            return sc.columns.indexOf (d.key) !== -1;
          });
          
          // and adjust the dicers to reflect the ones found
          sc.dicers = sc.saved.reduce (function(p,c) {
            p[c.key] = c;
            return p;
          },{});
        }
        return Promise.resolve (data);
        
        
      }) : 
      Promise.resolve (null) ;
  
  };
  

  
  /**
   * client watcher has detected a change in data
   * if it was related to a change in sheet thats been dealt with already
   */
  ns.changedValues = function (data) {
  
    var sc = ns.control;
    var watcher = sc.watching.watcher;
    var current =  ns.control.dicer.elementer.getCurrent();
    
    sc.result = data;
    var values = data.values && data.values.Values ?  data.values.Values : null
    // make sure that chart screen is in scope
    reveal_ (true);
   
    // if there's none (a blank sheet usually sends back 1 blank cell), then offer to generate some and go away
    if (!values || 
        (values.length === 1 && values[0].length === 1 && values[0][0] === "")) {
      reveal_ (false);
      return Promise.resolve(null);
    }
    
    // so we have some data
    var block = null,tables = null;
    var columnOffset = sc.result.dimensions.columnOffset;
    var rowOffset = sc.result.dimensions.rowOffset;
    
    // disable the clear and add buttons thill all this is over
    sc.buttons.insert.disabled = sc.buttons.clear.disabled = sc.buttons.clear.pause = true;
    
    
    // make some fiddlers out of the values
    sc.fiddlers = watcher.settings.properties.reduce (function (p,c) {
      p[c] = new Fiddler()
      .setBlankOffset(columnOffset)
      .setRenameDups(true)
      .setRenameBlanks(true)
      .setValues(sc.result.values[c]);
      return p;
    },{});
   
    // set up the columns that exist now
    sc.columns = sc.fiddlers.Values.getHeaders();
    
    // adjust the dicers to remove any that are no longer any good
    sc.dicers = Object.keys(sc.dicers)
    .filter(function (d) {
      return sc.columns.indexOf (sc.dicers[d].key) !== -1;
    })
    .reduce (function (p,c) {
      p[c] = sc.dicers[c];
      return p;
    },{});

    
    // hack the colors one to take the headings of the values one
    if (sc.fiddlers.BackgroundColors) {
      sc.fiddlers.BackgroundColors.mapHeaders(function (name, properties) {
        return sc.columns[properties.columnOffset];
      });
    }

    // update the dicers to the values we know
    Object.keys(sc.dicers).forEach(function(k) {
      var prop = sc.dicers[k].flags.color ? "BackgroundColors" : "DisplayValues";
      
      //if we're sorting, then do that first
      var useFiddler = sc.fiddlers[prop];
       
      if (current.sortData) {
        // this is about sorting on the actual values rather than the display values
        if (sc.fiddlers[prop].getData().length) {
          useFiddler = new Fiddler();
          useFiddler.setData(
            sc.fiddlers[prop]
            .sort(k,sc.dicers[k].flags.descending, sc.dicers[k].flags.color ? null : sc.fiddlers.Values)
          );
        }
      }
     
      sc.dicers[k].values = useFiddler.getUniqueValues(k);
      sc.dicers[k].selected = sc.dicers[k].selected.filter(function(d) {
        return sc.dicers[k].values.indexOf (d) !== -1;
      });
      
    });   

    // now resync the dicers with all the new values
    Dicers.sync (sc.dicers);
    
    // disable the clear and add buttons thill all this is over
    sc.buttons.insert.disabled = sc.buttons.clear.disabled = sc.buttons.pause.disabled = false;
    
    
    
    
  };
  
  
 
  
  function getTestData() {
    return [["Source","Target","Volume"],["mars","venus",100],["venus","mars",25],["venus","earth",299],["earth","mars",200],["mars","jupiter",500],["jupiter","venus",200],["venus","mercury",100],["mercury","venus",50],["earth","jupiter",200],["jupiter","mercury",800],["venus","jupiter",100],["neptune","pluto",200],["pluto","mars",800],["saturn","neptune",100],["saturn","pluto",200],["saturn","venus",130],["earth","pluto",200],["mercury","earth",300],["neptune","venus",200],["venus","neptune",300],["pluto","neptune",400]] ;
  }
  
  ns.isProEnabled = function () {
    var controls =  ns.control.dicer.elementer.getElements().controls;
    return ns.isPro() && !controls.proDisabled.checked;
  };
  
  ns.isSavingDicers = function () {
    var controls =  ns.control.dicer.elementer.getElements().controls;
    return ns.isProEnabled() && controls.saveSheetDicers.checked;
  };
  
  ns.isPro = function () {
    var controls =  ns.control.dicer.elementer.getElements().controls;
    var pd = ns.control.registration.data;
    return pd.plan.name === ns.globals.plans.pro.name && 
      pd.plan.expire && pd.plan.expire >= new Date().getTime();
  };
  
  
  return ns;
  
})( Process || {} );
