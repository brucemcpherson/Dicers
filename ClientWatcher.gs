/**
* @constructor ClientWatcher
* client stuff 
*/
function ClientWatcher(options)  {
  
  var self = this;
  
  // settings to manage the polling and data
  self.settings = {
    // how often
    pollFrequency:1197,
    
    // what to call if something changes
    on:{
      
    },
    
    // which value properties to retrieve - for example
    properties:[
    ],
    
    // which domains can be checked for
    domains: ["sheet", "values","active","dimensions"],
    
    // active, data , specific
    scope: {
      name:"data",
      range:""
    },
    
    // auto find looks for the most likely table
    auto: {
      enabled:true,
      mode:"cells",
      rank:0,
      rowTolerance:0,
      columnTolerance:0
    },
    
    // so for example - a values change will not be generated if there's also a sheet
    preventTrickle: {
      sheet:[],
      values:['sheet','dimensions'],
      active:['sheet','dimensions','values'],
      dimensions:['sheet']
    }
  };
  
  // add user settings
  self.settings = Utils.vanMerge ([self.settings , options]);

  
  // this holds current status
  var current_ =  {
    
    // current checksums
    checksums: {} ,
    
    // latest status of domains
    data: {
      // an array 1- for each of the properties required
      values:null, 
      dimensions:{
        dataRange:"",
        selectedRange:""
      },
      sheet:{
        sheetId:"",
        sheetName:"",
        ss:""
      },
      active: {
        activeRange:""
      }
    }
  };

  /**
   * a domain can be voided just by changing its current checksum
   * @param {string} [domain] the domain to void (dimensions, sheet etc..), if missing does them all
   * @return {ClientWatcher} self
   */
  self.pokeDomain = function (domain) {
    if (!domain) {
      current_.checksums = {};
    }
    else {
      current_.checksums[domain] = "";
    }
  };
  
  /**
   * set callback when change is detected
   * @param {string} the domain to look out for
   * @param {function} func the callback
   * @return {Client} self
   */
  self.on = function (domain, func) {
    // check args are good
    Utils.assert (typeof func === "function", "onChange callback must be a function");
    Utils.assert (self.settings.domains.indexOf(domain) !== -1 , 
                  "domain must be one of " + self.settings.domains.join(","));
    
    // new callback for domain change
    self.settings.on[domain] = func;
    return self;
  };
  
  /**
   * get started
   */
  self.start = function () {
    poll_();
    return Promise.resolve (null);        
  };
  
  /**
   * this polls, but only if the add-on is active
   */
  function pollWrapper_ () {
    
    return ifvisible.now() ? 
      Provoke.run ('ServerWatcher' , 'poll' ,  {
        checksums:current_.checksums,
        domains:Object.keys(self.settings.on),
        properties:self.settings.properties,
        scope:self.settings.scope,
        auto:self.settings.auto
      }) : Promise.resolve (null);
  
  };
  /**
   * polling
   */
  function poll_ () {
    
    // just a short cut to see if anything has changed
    function changed_ (pack,domain) {
      return current_.checksums[domain] !== pack.checksums[domain];
    };
    
    
    // call the server side and explain what to look for
    pollWrapper_()
    .then (function (pack) {
     
      if (pack) {
        // check whats changed
        self.settings.domains.filter(function (k,i,a) {
          
          // copy forward previous if they are not there
          current_.data[k] = pack.data[k] || current_.data[k];
          
          // compare all the checksums for each domain
          // but don't treat as a change if its prevented from bubbling
          return changed_ (pack,k) && 
            !self.settings.preventTrickle[k].some(function(d) { 
              return changed_ (pack , d);
            });
        })
        .forEach (function (k) {
          // call the handler for each that has changed
          if (self.settings.on[k]) {
            self.settings.on[k](current_.data);
          }
        });
      }
      return Promise.resolve (pack);
    })
    .then (function (pack) {
      
      // update the checksums
      if (pack) {
        current_.checksums = pack.checksums;
      }
      // wait a bit then go again
      return Provoke.loiter (self.settings.pollFrequency);
    })
    .then (function () {
      // go again
      poll_ ();
    })
    ['catch'] (function(err) {
      // report an error, then go again
      Utils.assert (false, function (error) {
        console.log( Utils.errorStack ((err || "assertion failed") + ("(" + ' polling ' + ")")));
      } );
      poll_ ();
      
    })
  }

}





/**
* simulate Watcher with apps script
* various changes server side can be watched for server side
* and resolved client side
* @constructor ClientWatcher
*/
var ClientWatcherx = (function (ns) {
  
  var watchers_  = {},startTime_=0, pack_;
  
  // now clean it
  function cleanTheCamel_ (cleanThis) {
    return typeof cleanThis === "string" ? cleanThis.slice(0,1).toUpperCase() + cleanThis.slice(1) : cleanThis;
  }
  
  /**
  * return {object} all current Watchers, the id is the key
  */
  ns.getWatchers = function () {
    return watchers_;
  };
  
  /**
  * add a Watcher
  * @param {object} options what to watch
  * @param {string} [sheet] the sheet to watch if missing, watch the active sheet
  * @param {string} [range] the range to watch - if missing, watch the whole sheet 
  * @param {string} [property=Data] matches getData, getBackground
  * @param {TYPES} [type=SHEET] the type of Watcher
  * @param {number} pollFrequency in ms, how often to poll
  * @return {ClientWatcher.Watcher} the Watcher
  */
  ns.addWatcher = function (options) {
    
    // default settings for a Watcher request
    var watch = Utils.vanMerge ([{
      pollFrequency:2000,                              // if this is 0, then polling is not done, and it needs self.poke()
      id: '' ,                                        // Watcher id
      pollVisibleOnly:true,                           // just poll if the page is actually visible
      checksum:{
        active:"",                                    // the active checksum last time polled
        data:"",                                      // the data checksum last time polled
        sheets:""                                     // the sheets in the workbook last time polled
      },                                
      domain: {
        app: "Sheets",                                // for now only Sheets are supported                     
        scope: "Sheet",                               // Sheet, Active or Range - sheet will watch the datarange
        range: "",                                    // if range, specifiy a range to watch
        sheet: "",                                    // a sheet name - if not given, the active sheet will be used
        property:"Values",                            // Values,Backgrounds etc...
        fiddler:false,                                // whether to create a fiddler to mnipulate data (ignored for nondata property)
        applyFilters:false,                           // whether to apply filters
        auxProperties:[],                             // whether to get any additional cell properties    
        force:0                                       // can be used to act as if theres a data change even if not  
      },
      rules: {
        active: true,                                 // whether to watch for changes to active
        data: true,                                   // whether to watch for data content changes
        sheets:true                                   // watch for changes in number/names of sheets
      }
    },options || {}]);
    
    // tidy up the parameter cases
    Object.keys(watch.domain).forEach(function(k) {
      watch.domain[k] = cleanTheCamel_ (watch.domain[k]);
    });
    watch.id = watch.id || ('w' + Object.keys(watchers_).length);

    // add to the registry
    return (watchers_[watch.id] = ns.newWatcher(watch));
  };
  
  /**
  * remove a Watcher
  * @param {string||object} id the id or object
  * @return {ClientWatcher} self
  */
  ns.removeWatcher = function (watcher) {
    var id = Utils.isVanObject(watcher) ? watcher.id : watcher;
    if (!id || watchers_[id]) {
      throw 'Watcher ' + id + ' doesnt exists - cannot remove';
    }
    watchers_[id].stop();
    watchers_[id] = null;
    return ns;
  };
  /**
  * return a specifc Watcher
  * @param {string} id the Watcher
  * @return {ClientWatcher.watcher} the Watcher
  */
  ns.getWatcher = function (id) {
    return watchers_[id];
  };
  
  /**
  * used to create a new Watcher object
  * @return {ClientWatcher.Watcher}
  */
  ns.newWatcher = function (watch) {
    return new ns.Watcher(watch);
  }
  /**
  * this is a Watcher object
  * @param {object} watch the Watcher resource
  * @return {ClientWatcher.Watcher}
  */
  ns.Watcher = function (watch) {
    
    var self = this;
    var current_ = {
      active:null,
      data:null,
      dataSource:null,
      filterMap:null,
      aux:null
    } ;
    var watch_ = watch, stopped_ = false;  
    var callback_;
    
    // this monitors requests
    var status_ = {
      serial:0,      // the serial number of the poll
      requested:0,   // time  requested
      responded:0,    // time responded
      errors:0 ,      // number of errors
      hits:0,         // how many times a change was detected
      totalWaiting:0,  //  time spent waiting for server response
      idle:0          // no of times we didnt bother polling
    };
    

    
    
    self.start = function () {
      // get started .. first time it will run immediately
      
      return nextPolling_(!status_.serial);
    };
    
    self.restart = function () {
      stopped_ = false;
      return self;
    };
    
    self.stop = function () {
      stopped_ = true;
      return self;
    };
    
    
    /**
     * does an immediate poll
     * @param {number} force supply some new number to simulate a data change even if there wasnt one
     * @return {Promise} promise to the end of poll
     */
    self.go = function (force) {
      
      // refresh
      watch_.domain.force = force || 0;

      // force a checksum refresh
      self.poke();
      
      // go and do it now
      return nextPolling_ (true)
      .then (function (pack) {
        return somethingHappened_ (pack);
      });
      
    };
    
    // force a redo 
    self.poke = function () {
      
      Object.keys(watch_.checksum).forEach(function(d) {
        watch_.checksum[d] = "";
      });
    };
    self.getWatching = function () {
      return watch_;
    };
    /**
    * if you want the current data
    * @return {object} the current data
    */
    self.getCurrent = function () {
      return current_;
    };
    
    /**
    * if you want the latest status
    * @return {object} status
    */
    self.getStatus = function () {
      return status_;
    };
    
    /**
    * do the next polling after waiting some time
    * @return {Promise}
    */
    function nextPolling_ (immediate) {
      
      return new Promise(function (resolve,reject) {
        setTimeout ( function () {
          self.poll()
          .then(function(pack) {
            resolve(pack);
          })
          ['catch'](function(pack) {
            reject(pack);
          })
        }, immediate ? tweakWaitTime(25): tweakWaitTime(watch_.pollFrequency));
      });
      
      // just to avoid everybody always polling at the same time
      function tweakWaitTime(t) {
        t += (t*Math.random()/5*(Math.random()>.5 ? 1 : -1));
        // now we need to tweak the start time to avoid a timing problem in htmlservice 
        // .. never start one within 750ms of the last one.
        var now = new Date().getTime();
        startTime_ = Math.max(now + t, startTime_+750);
        return startTime_ - now;
      }
      
    }
    
    self.getPack = function () {
      return pack_;
    };
    
    /**
     * called to initialie callback if its needed
     */
    function somethingHappened_ (pack) {
      
      if (pack.changed.active || pack.changed.data || pack.changed.sheets) {
        callback_(current_, pack, self);
      }
      return Promise.resolve (pack);
    }
    
    /**
     * called to contuously poll
     */
    function looper_ () {
      
      if (typeof callback_ !== "function") {
        throw 'callback to .watch() must be a function';
      }
      
      // keep repeating
      self.start()
      .then (function(pack) {
        
        // do a callback if anything happened
        somethingHappened_ (pack);
        
        // if we're not stopped. go again
        if (!stopped_) {
          looper_();
        }
        
      })
      ['catch'](function(err) {
        // this will have been dealt with further up, but we still need to repoll
        if (!stopped_ && watch_.pollFrequency) {
          looper_();
        }
      });
             
    }
    
    // convenience function to endlessly poll and callback on any changes
    self.watch = function (callback) {

      callback_ = callback;
      looper_ ();

    };
    
    /**
    * this returns a promise
    * which will be resolved when the server sends back changed data
    * and rejected when there is no change
    * @return {Promise}
    */
    self.poll = function () {
      
      status_.requested = new Date().getTime();
      status_.serial ++; 
      
      // promises dont have finally() yet.
      function finallyActions  () {
        status_.responded = new Date().getTime();
        status_.totalWaiting += (status_.responded - status_.requested);
      }
      
      // we can get rejected from a few paces, so just pul this out
      function rejectActions  (reject,err) {
        console.log (err);
        status_.errors++;
        finallyActions();
        reject(err);
      }
      
      return pollWork();
      
      // call the co-operating server function
      function pollWork () {
        
        return new Promise(function (resolve, reject) {
 
          // check for visibility.. if not visible, then don't bother polling
          if (pack_ && watch_.pollVisibleOnly && !ifvisible.now() ) {
            status_.idle++;
            finallyActions();
            resolve(pack_);
          }
          else {

            Provoke.run ("ServerWatcher", "poll", watch_)
            .then (
              function (pack) {
                // save this for interest

                pack_ = pack;
                current_.dataSource = pack_.dataSource;
                
                
                // if there's been some changes to data then store it
                if (pack.data) {

                  var columnOffset = pack_.dataSource.columnOffset;
                  current_.filterMap = pack_.filterMap;
                  
                  if (watch_.domain.fiddler && watch_.domain.property === "Values") {
                    // it may fail because data is in midde of being updated
                    // but that's - it'll get it next time.
                    try {
                      current_.fiddler = new Fiddler()
                      .setBlankOffset(columnOffset)
                      .setRenameDups(true)
                      .setRenameBlanks(true)
                      .setValues(pack.data);
                    }
                    catch (err) {
                      // dont want to count this as a valid piece of data yet
                      // so we'll pass on this poll result and treat it as a reject
                      console.log('error in client watcher',err);
                      
                      return rejectActions(reject,err);
                    }
                  }
                  watch_.checksum.data = pack.checksum.data;
                  current_.data = pack.data;
                  current_.aux = pack.aux;
                }
                
                
                
                // if there's been some changes to active positions
                if(pack.active) {
                  current_.active = pack.active;
                  watch_.checksum.active = pack.checksum.active;
                }
                
                // if there's been some changes to sheets then store it
                if (pack.sheets) {
                  current_.sheets = pack.sheets;
                  watch_.checksum.sheets = pack.checksum.sheets;
                }
                
                if (pack.data || pack.active || pack.sheets) {
                  status_.hits++;
                }
                finallyActions();
                resolve (pack);
              })
            ['catch'](function (err) {
              // sometimes there will be network errors which can generally be ignored..
              rejectActions (reject, err);
            });
          }
        });
        
      }
    };
  };
  
  return ns;
})(ClientWatcherx || {});
