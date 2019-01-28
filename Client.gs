/**
* client stuff that's specific to the type server
*/
var Client = (function(ns) {
  
  // this can be used to pause the filtering mechanism
  // it will automatocally do a poke if it gets turned false
  var paused_ = false;
  
  ns.isPaused = function () {
    return paused_;
  };
  
  ns.pause = function (pause) {
    paused_ = pause;
    if (!paused_) {
      ns.pokeChange();
    }
  };
  
  /**
   * get any saved information for this sheet
   * @param {object} scope describes the sheet being monitored
   * @return {Promise} to the saved properties for this sheet
   */
  ns.getSaveSheetDicers = function (scope) {
   
    // will use cache if it exists
    var key = ns.getScopeKey (scope);
    if (Process.isSavingDicers()) {
      var save = ns.getSaveCache(scope);
      if (save) {
        return Promise.resolve (save);
      }
      else {
        return Provoke.run ("Server","getSaveSheetDicers",key)
        .then (function (save) {
          Process.control.saved[key] = save;
          return Promise.resolve (save);
        })
      }
      
    }
    else {
      return Promise.resolve (null)
    }
    
  };
  
  /**
  * param {object} scope
  * @return {string} the key
  */
  ns.getScopeKey = function (scope) {
    return scope.sheetId + "_"  + scope.topLeft;

  };
  
  ns.getSaveCache = function (scope) {
    var key = ns.getScopeKey (scope);
    return Process.control.saved[key];
  };
  

  
  ns.setSaveCache = function (scope, queue) {
    
    // will use cache if it exists
    var key = ns.getScopeKey (scope);
    
    if (Process.isSavingDicers()) {
      Process.control.saved[key] = queue;
    }
    else {
      Process.control.saved[key] = null;
    }
    
  };
  
  /**
   * clears sheet dicers on startup if necessary
   * @return {Promise}
   */
  ns.clearSheetDicers = function () {
    // delete everything in cache
    Process.control.saved = {};
    // and in property store
    return Process.control.dicer.elementer.getElements().controls.clearSheetDicers.checked ?
      Provoke.run ('Server', 'clearSheetDicers') : Promise.resolve (null);
  };
  
  /**
   * start all the polling activities
   */
  ns.start = function () {
    var sc = Process.control;
    
    // this'll call sync when there's any data change
    sc.watching.watcher.start();
    
    // start regular housekeeping of saved properties
    cleanSaved_();
    resetCursor ();
    
    // this will clear out any uneeded saves from time to time
    function cleanSaved_ (waitFor) {

      Provoke.loiter(waitFor ||  Process.control.cleanSaved.interval)
      .then (function () {
        return ifvisible.now() ? 
          Provoke.run ('Server' , 'cleanSaveSheets' , Process.isSavingDicers() ) :
          null;
      })
      .then (function (data) {
          cleanSaved_();
      })
      ['catch'] (function (err) {
        App.showNotification ('Error cleaning up store' , err);
      });
    }
    
    /**
     * called to start a queue polke if needed
     */
    ns.pokeChange = function () {
      pollQueue();
    };
    
    // start polling for anything queued
    function pollQueue () {
      var sc = Process.control;

      // we wait a bit before contacting the server
      // this gives a chance for multiple selections to
      // entered and queued
      // like that, they'll be dealt with in one server call
      Provoke.loiter(sc.queue.interval)
      .then(function (tag) {
        
        if (!paused_) {
          // get the current queue if theres anything to do
          var queue = Process.establishQueue();
          
          if(queue.length) {
            
            // optimize so we only need to save to properties if cache has changed.......
            var getFromCache = ns.getSaveCache (sc.result.sheet);
            
            // now process the filter and save status to props
            var current = Process.control.dicer.elementer.getCurrent();
            var pack =  {
              items:Utils.clone(queue), 
              sheetSettings: Process.control.pro.sheetSettings.reduce(function(p,t) {
                p[t] = current[t];
                return p;
              },{})
            };
            
            
            // save that in cache to avoid prop gets in the future
            var saving = Process.isSavingDicers() && 
              (!getFromCache || (getFromCache && JSON.stringify(getFromCache) !== JSON.stringify(pack))) ;

            return Provoke.run ('Server' , 'diceData', sc.result.dimensions, pack , saving  )
            .then (function (result) {
              
              // page settings also include current data setttings
              ns.setSaveCache (sc.result.dimensions , pack);
              
              // poke again in case some more changes have been queued up in the meantime
              ns.pokeChange();
            })
            ['catch'] (function(err) {
              console.log("dicedata hiccup",err);
              
            });
          }
        }

      })
      ['catch'](function(err) {
        App.showNotification ('polling for queue', err);
      });
    }
  };

  
  function resetCursor() {
    DomUtils.hide ('spinner',true);
  }
  function spinCursor() {
    DomUtils.hide ('spinner',false);
  }

  
  return ns;
  
})(Client || {});



