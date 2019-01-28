/**
 * @namespace Server
 * does all the server side stuff
 */
var Server = (function (ns) {
  

  /**
  * fill a sheet with some test data
  * @param {[[]]} data the data
  * @return {[[]]} the data
  */
  ns.generateTestData = function (data) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.insertSheet();
    sh.getRange(1, 1, data.length, data[0].length).setValues(data);
    ss.setActiveSheet(sh);
    return data;
  };

  
  /**
   * get the sheets dicer status
   * @param {} scope the scope to save the sheet against
   * @return {[object]} dicerInfo the dicer info
   */
  ns.getSaveSheetDicers = function (key) {
    return  Props.getSaveSheet (key);
  };
  
  /**
   * clean all savead sheets on startup
   */
  ns.clearSheetDicers = function () {
    // this already exists as a props function, so thats it.
    return Props.deleteSaveSheet();
  };

  
  /**
   * delete any save sheets for which there is no longer a sheet
   * or when its not enabled
   * @param {boolean} saveFilters whether save filters is activated
   * @return {[number]} list of ids that had saves deleted
   */
  ns.cleanSaveSheets = function (saveFilters) {
    
    // delete any saves that are not present or them all if saveFilters is false
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    // get all the keys for this ss
    var saved =  Props.getSaved ( ss.getId())
    .map (function (d) {
      return d.match (/([A-Za-z0-9]+)$/)[1];
    });
    
    // get all the ids of all the sheets
    var ids = sheets.map(function (d) {
      // the id is an integer so make a string for comparison with regex result
      return d.getSheetId().toString();
    });
    
    // note which of the saveds need to be removed
    var result = saved.map ( function (d) {
      var idx = ids.indexOf (d);
      return !saveFilters || idx === -1 ? d : "";
    })
    .filter(function (d) {
      // filter out the ones to keeo
      return d;
    });
    
    // now remove anything associated with the deleted ones
    result.forEach (function (d) {
      Props.removeSaveSheet (ss.getId() + "_" + d );
    });
    
    // in case the caller is interested
    return result;

  };
  
  
  /**
   * hide all rows except those in selected array
   * if empty, unhide everything
   * also saves any dicer status to property store if there are any changes
   * @param {object} scope the scope to apply the hiding to
   * @param {[object]} pack the filters to work on
   * @param {savFilters} boolean whether to save sheet filters
   */
  ns.diceData = function (scope, pack, saveFilters) {
 
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(scope.sheetName);
    var filters = pack.items;
    var sheetSettings = pack.sheetSettings;
    var activeRange = ss.getActiveRange();
    
    // its possible that the sheet has been deleted in the meantime, or we may not be on it any more
    if (!sheet || activeRange.getSheet().getSheetId() !== scope.sheetId || scope.ss !== ss.getId()) {
      return {status:'gone out of scope',scope:scope,active:activeRange.getSheet().getSheetId()};
    }
    
    
    // still here so lets continue
    var range = sheet.getRange(scope.selectedRange);
    
    // get the values for the modified range
    var values = range.getDisplayValues();
    
    // and maybe we need some other aux values
    var aux = filters.reduce (function (p,c) {
      if(c.flags.color) {
        p.backgroundColors = p.backgroundColors || {
          values:range.getBackgroundColors(),
          keys:[]
        };
        p.backgroundColors.keys.push (c.key);
      } 
      return p;
    },{});
   

    // these offsets are needed in case table doesnt start at top
    var rowOffset = range.getRow() -1;
    var columnOffset = range.getColumn() -1;
    
    // easier to work with a fiddler.
    var fiddler = new Fiddler()
    .setBlankOffset(columnOffset)
    .setRenameDups(true)
    .setRenameBlanks(true)
    .setValues(values);

    Object.keys(aux).forEach(function(k) {
      // we have some backgrounds, replace first row with headings
      var  auxValues = [fiddler.getHeaders()]; 
      Array.prototype.push.apply (auxValues, aux[k].values.slice(1));
      
      // make a fiddler for the aux values
      var auxFiddler = new Fiddler()
        .setBlankOffset(columnOffset)
        .setRenameDups(true)
        .setRenameBlanks(true)
        .setValues(auxValues);
      
     // check that they go with each other
      if (auxFiddler.getNumRows() !== fiddler.getNumRows()) {
        throw 'mismatch in background and values fiddlers length';
      }
      
      if (auxFiddler.getNumColumns() !== fiddler.getNumColumns()) {
        throw 'mismatch in background and values fiddlers width';
      }
      
      // now we can just map the the columns with colors selected
      fiddler.mapColumns (function (values , properties) {
        // and if this is one with a matching aux, replace the values with the aux values
        return aux[k].keys.indexOf (properties.name) === -1 ?
          values : auxFiddler.getColumnValues (properties.name) ;
      });
      
    });
    
    // list of all rows
    var all = fiddler.getData().map(function (d,i) { return i;});
    
    // how to make a list of things that should be visible 
    function makeUnhide_ (d) {
      return {
        matches: d.selected.length  ? 
        fiddler.selectRows (d.key, function (r) {
          var some = d.selected.some(function(e) { 
            return e===r;
          });
          return d.flags.not ? !some : some;
        }) 
        : all,
        key:d.key
      };
    }
    
    // list of things to unhide
    // list of or unhides
    var unhides = filters
    .filter(function(d) {
      return !d.flags.or;
    })
    .map (function (d) {
      return makeUnhide_ (d);
    });

    // list of or unhides
    var unhidesOrs = filters
    .filter(function(d) {
      return d.flags.or;
    })
    .map (function (d,i,a) {
      // illogical treatment for ORS
      // if there are regular unhides
      // and no OR types are selected
      // then we dont OR those 
      // treat the OR as if it wasn't even there
      return (unhides.length && !d.selected.length) ? {matches:[],key:d.key} : makeUnhide_ (d);
    });
    

    // now the final result will be those that appear in all unhides
    var unhide = all.filter(function(d) {
      return unhides.every(function(e) {
        return e.matches.some(function(f) {
          return f===d;
        });
      })
    });

  
    // plus those that are added by the OR
    unhidesOrs.forEach (function (d) {
      d.matches.forEach(function (e) {
        if (unhide.indexOf (e) === -1) {
          unhide.push (e);
        }
      });
    });

    
    // the hides are all the rest
    var hide = fiddler.getData()
    .map(function(d,i) {
      return i;
    })
    .filter(function(d) {
      return !unhide.some(function(e) {
        return d===e;
      });
    });

    
    // show /hide
    optimizeConsecutive(unhide).forEach(function (d) {
      // my index starts at 0, so including the header, need to add 2 for ssapp row numbers
      sheet.showRows(d.start+2+rowOffset, d.count)
    });
    
        // show /hide
    optimizeConsecutive(hide).forEach(function (d) {
      // my index starts at 0, so including the header, need to add 2 for ssapp row numbers
      sheet.hideRows(d.start+2+rowOffset, d.count)
    });
   

    // we dont need the removed ones
    var v = filters.filter(function(d) {
      return !d.remove;
    });
    // pro version allows saving of filter definitions
    if (saveFilters) {  
      Props.saveSheet ( scope.sheetId + "_"  + scope.topLeft , {items:v , sheetSettings:sheetSettings});
    }
     
    /**
     * optimize consecitive rows for hiding/unhiding
     * @param [list] list of numbers
     * @return [{object}] optimized {start:x,count:y}
     */
    function optimizeConsecutive (list) {
      return list.reduce (function (p,c) {
        if (!p.length || p[p.length-1].start + p[p.length-1].count !== c) {
          p.push ({
            start:c,
            count:0
          });
        }
        var prev = p[p.length-1];
        prev.count ++;
        return p;
      
      } , []);
    
    }
   
    return {
      hide:hide,
      unhide:unhide,
      queue:v
    }
  };
  
  return ns;
})(Server || {});
