/**
 * simulate binding with apps script
 * various changes server side can be watched for server side
 * and resolved client side
 * @constructor SeverBinder
 */
var ServerWatcher = (function(ns) {

  /**
   * called server side to get data from active sheet
   * @param {object} what to get
   * @return {object} the result
   */
  ns.poll = function(what) {

    Utils.assert(what, "what to poll is unspecified");
    Utils.assert(["specific", "active", "data"].indexOf(what.scope.name) !== -1, "scope name " + what.scope.name + " unknown");

    // open the current sheet etc.
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var activeRange = sheet.getActiveRange();
    var dataRange = sheet.getDataRange();

    // maybe theres a specificRange
    var specificRange;
    if (what.scope.name === "specific") {
      try {
        specificRange = sheet.getRange(what.scope.range);
      }
      catch (err) {
        // just ignore - the range may not yet be finished being entered
      }
    }
    // set up the selectedRange - this is scope of the sheet to look on
    var selectedRange = specificRange ||  (what.scope.name === "data" ? dataRange : activeRange);
    
    
    var block = {};
    // now we need to potentially modify that if we're using autofind
    if (what.auto && what.auto.enabled) {
      var values = selectedRange.getValues();
      
      
      var tables = Utils.findTableBlocks(values, {
        mode: what.auto.mode,
        rank: what.auto.rank,
        rowTolerance: what.auto.rowTolerance,
        columnTolerance: what.auto.columnTolerance
      });
      
      block = tables && tables.selected ? tables.selected.block : null;
      selectedRange = block ? selectedRange.offset(block.start.row, block.start.column, block.size.rows, block.size.columns) : selectedRange;
    }
    
    var topLeft = selectedRange.offset (0,0,1,1).getA1Notation();
    
    // process the domains asked for
    var obs = {

      sheet: function() {
        return {
          sheetId: sheet.getSheetId(),
          sheetName: sheet.getName(),
          ss: ss.getId(),
          topLeft: topLeft
        };
      },

      active: function() {
        return {
          sheetId: sheet.getSheetId(),
          sheetName: sheet.getName(),
          ss: ss.getId(),
          activeRange: activeRange.getA1Notation(),
          columnOffset: activeRange.getColumn() - 1,
          rowOffset: activeRange.getRow() - 1,
          topLeft: topLeft
        };
      },

      dimensions: function() {
        return {
          sheetId: sheet.getSheetId(),
          sheetName: sheet.getName(),
          ss: ss.getId(),
          dataRange: dataRange.getA1Notation(),
          selectedRange: selectedRange.getA1Notation(),
          columnOffset: selectedRange.getColumn() - 1,
          rowOffset: selectedRange.getRow() - 1,
          block: block,
          topLeft: topLeft
        };
      },

      values: function() {
        return what.properties.reduce(function(dp, dc) {
          
          // get the value property from the sheet
          dp[dc] = selectedRange['get' + dc]();
          
          // check for supported type (you cant pass dates)
          if (dc === "Values") {
            dp[dc] = Utils.transformDates (dp[dc]);
          }
          
          return dp;
        }, {});
      }
    };

    //the returns package
    var result = (what.domains || [])
      .reduce(function(p, c) {

        if (!obs[c]) {
          Utils.assert(false, "Dont know what to do with " + c);
        }

        // params for the domain being measured
        var ob = obs[c]();

        // get a checksum for the new value
        var cs = Utils.keyDigest(ob);
        p.checksums[c] = cs;

        // if its different, we'll need to send back the data 
        // as well as the checksum
        if (cs !== what.checksums[c]) {
          p.data[c] = ob;
        }

        return p;
      }, {
        data: {},
        checksums: {}
      });

    return result;
  };

  return ns;
})(ServerWatcher || {});

/**
 * used to expose memebers of a namespace
 * @param {string} namespace name
 * @param {method} method name
 */
function exposeRun(namespace, method, argArray) {

  // I'm using whitelisting to ensure that only namespaces 
  // authorized to be run from the client are enabled
  // why? to avoid mistakes, or potential poking somehow from the dev tools
  var whitelist = [{
    namespace: "Server",
    methods: null
  }, {
    namespace: "ServerWatcher",
    methods: null
  }, {
    namespace: "Props",
    methods: [
      "getAll",
      "getRegistration",
      "setDocument",
      "removeDocument",
      "removeUser",
      "setPlan",
      "setUser",
      "decodeCoupon"
    ]
  }, {
    namespace: "GasStripeCheckout",
    methods: ["getKey"]
  }];

  // check allowed
  if (whitelist && !whitelist.some(function(d) {
      return namespace === d.namespace &&
        (!d.methods || d.methods.some(function(e) {
          return e === method
        }));
    })) {
    throw (namespace || "this") + "." + method + " is not whitelisted to be run from the client";
  }

  var func = (namespace ? this[namespace][method] : this[method]);
  if (typeof func !== 'function') {
    throw (namespace || "this") + "." + method + " should be a function";
  }
  if (argArray && argArray.length) {
    return func.apply(this, argArray);
  } else {
    return func();
  }
}