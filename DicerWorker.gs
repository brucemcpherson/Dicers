/**
* @nameSpace DicerWorker
* manages the Dicer/settings mappings
*/
var DicerWorker = (function(ns) {
  'use strict';
  
  ns.doElementer = function (setup) {
    
    return new Elementer()
    .setMain('')
    .setContainer('elementer-content')
    .setRoot('elementer-root')
    .setLayout(setup.layout)
    .setDetail(setup.detail)
    .build();
    
  };
  
  /**
   * this is the translation from element values 
   * to any internal needs
   * @param {Elementer} arger the elementer holding the settings items
   * @return {object} the current settings
   */
  ns.mapSettings = function (arger) {
    
    var du = DomUtils;
    var watcher = Process.control.watching.watcher
    var features = Process.control.pro.features;
    
    // we can just get all the current settings
    var current = arger.getCurrent();
    
    //and any of them needed for dicers can just be popped in
    var interact = Dicers.getInteractSettings();
    
    // we'll check for a change
    var before = Utils.clone (interact);
    
    Object.keys(current)
    .forEach (function (d) {
      if (interact.hasOwnProperty(d)) {
          interact[d] = Utils.isNumeric(current[d]) ? parseFloat (current[d]) : current[d];      
      }      
    });

    // make any class changes    
    pokeClass ("quietColor" , "dicer-quiet");
    pokeClass ("selectedColor" , "dicer-selected");
    pokeClass ("unselectedColor" , "dicer-unselected");
    pokeClass ("hoverColor" , "dicer-quiet:hover");
    pokeClass ("tooltipColor" , "tooltip");
    
    function pokeClass (color,className) {
      if (before[color] !==interact[color]) {
        du.classPatch (className, "background-color" , interact[color]);
      }
    }
    
    // maybe a change to sort status or a change to selection status should provoke a data re-evaluation
    if (before.sortData !== interact.sortData) {
      Process.changedValues (Process.control.result); 
    }
    
    // maybe we have a new data source
    if (current.specificRange) {
      watcher.settings.scope.name = "specific";
      watcher.settings.scope.range = current.specificRangeValue;
    }
    else {
      watcher.settings.scope.name = current.activeRange ? "active" : "data";
    }  
  

    // maybe we have some auto stuff
    watcher.settings.auto.enabled = !current.proDisabled && current.autoFindTables;
    watcher.settings.auto.mode = current.autoFindTablesMode;
    watcher.settings.auto.rank = parseInt(current.autoFindTablesRank,10);
    watcher.settings.auto.rowTolerance = parseInt(current.autoFindTablesRowTolerance,10);
    watcher.settings.auto.columnTolerance = parseInt(current.autoFindTablesColumnTolerance,10);
    
    
    // fix up the scrolling 
    if (Process.control.dicer.interactor) {
      Interactor.enableRestrictions(
        Process.control.dicer.interactor ,  !current.allowScroll
      );
    }
    
    
    return current;
    
  };
  
  ns.setup = function(height) {

    return {
      detail: {

        manageDivider: {
          template: "dividerTemplate",
          label:"Manage settings"
        },
        
         dataSourceDivider:{
          label:"Source data",
          template:"dividerTemplate"
        },
        
        
        useStandard: {
          template: "radioTemplate",
          label: "Standard",
          icon: "tuner",
          properties:{
            name:"use-group"
          },
          values:{
            resetable:false
          }
        },
        useDocument: {
          template: "radioTemplate",
          label: "This document's settings",
          icon: "playlist_play",
          properties:{
            name:"use-group"
          },
          values:{
            resetable:false
          }
        },
        useUser: {
          template: "radioTemplate",
          label: "My personal settings",
          icon: "fingerprint",
          properties:{
            name:"use-group"
          },
          values:{
            resetable:false
          }
        },
        
        useInitial: {
          template: "radioTemplate",
          label: "Reset to initial",
          icon: "undo",
          properties:{
            name:"use-group"
          },
          values:{
            value:true,
            resetable:false
          }
        },
        
        makePermanent: {
          template: "radioTemplate",
          label: "Save for future use in this document",
          icon: "playlist_add_check",
          properties:{
            name:"manage-group"
          },
          values:{
            resetable:false,
            value:true
          }
        },
        
        makeDefault: {
          template: "radioTemplate",
          label: "Save for future use in all my documents",
          icon: "playlist_add",
          properties:{
            name:"manage-group"
          },
          values:{
            resetable:false
          }
        },
        
        clearPermanent: {
          template: "radioTemplate",
          label: "Clear saved settings in this document",
          icon: "settings_backup_restore",
          properties:{
            name:"manage-group"
          },
          values:{
            resetable:false
          }
        },
        
        clearDefault: {
          template: "radioTemplate",
          label: "Clear all my saved default settings",
          icon: "layers_clear",
          properties:{
            name:"manage-group"
          },
          values:{
            resetable:false
          }
        },
        
        manageButton:{
          template:"buttonTemplate",
          classes: {
            element:"action"
          },
          values:{
            value:"APPLY"
          }
        },
        
        
        resetButton_dataSettings:{
          template:"resetButtonTemplate"
        }, 
        
        
        resetButton_behavior:{
          template:"resetButtonTemplate"
        },

        resetButton_appearance:{
          template:"resetButtonTemplate"
        },
        
        resetButton_colors:{
          template:"resetButtonTemplate"
        },
        
        resetButton_proSettings:{
          template:"resetButtonTemplate"
        },
        
        resetButton_account:{
          template:"resetButtonTemplate",
          on: {
            click:function (elementer, branch , ob,e) {
              var controls = elementer.getElements().controls;
              controls.resetButton_account.disabled = true;
              if (controls.couponCode.value) {
                Home.applyCoupon(controls.couponCode.value);
                controls.couponCode.value = "";
              }
            },
            enter:function (elementer,branch) {
               elementer.getElements().controls.resetButton_account.disabled = true;
               Process.reserveResetValues (elementer, branch);
            },
            exit:function (elementer, branch) {
              Process.restoreResetValues (Process.control.dicer.elementer , branch);
            }
            
          }
        },
        
        applyButton:{
          template:"buttonTemplate",
          classes:{
            element:"action"
          },
          values:{
            value:"APPLY"
          }
        },
        
        wholeSheet: {
          template: "radioTemplate",
          label: "Whole sheet",
          icon: "grid_on",
          values: {
            value: true
          },
          properties:{
            name:"range-group"
          }
        },
        
        activeRange: {
          template: "radioTemplate",
          label: "Active range",
          icon: "domain",
          properties:{
            name:"range-group"
          },
          values:{
            value:false
          }
        },
        
        specificRange: {
          template: "radioTemplate",
          label: "Specify range",
          icon: "select_all",
          properties:{
            name:"range-group"
          },
          values:{
            value:false
          },
          on: {
            change: function (elementer , branch, ob , e){
              // the default one
              elementer.defaultOnChange (elementer , branch, ob , e);
              // plus set default range
              var controls = elementer.getElements().controls;
              var sr = Process.control.result;

              if (controls.specificRange.value && !controls.specificRangeValue.value ) {
                controls.specificRangeValue.value = 
                  sr && sr.dimensions && sr.dimensions.selectedRange ? sr.dimensions.selectedRange : "";                
              }

            }
          }
        },
        
        specificRangeValue: {
          template: "textTemplate",
          label: "Range",
          icon: "font_download",
          values:{
            value:""
          }
        },
        

        autoCreateMax: {
          template: "numberTemplate",
          label: "Max to autocreate",
          icon: "content_copy",
          properties: {
            max: 6,
            min: 0
          },
          values:{
            value:2
          }
        },
        

        staggerLeft: {
          template: "numberTemplate",
          label: "Left stagger",
          icon: "format_indent_increase",
          properties: {
            max: 60,
            min: 0
          },
          values:{
            value:30
          }
        },
        
        staggerTop: {
          template: "numberTemplate",
          label: "Top stagger",
          icon: "vertical_align_bottom",
          properties: {
            max: 68,
            min: 0
          },
          values:{
            value:36
          }
        },
        
        staggerWrap: {
          template: "checkboxTemplate",
          label: "Wrap dicers",
          icon: "wrap_text",
          values:{
            value:false
          }
        },
        
        dicerHeight: {
          template: "numberTemplate",
          label: "Dicer height",
          icon: "crop_landscape",
          properties: {
            max: height,
            min: 100
          },
          values:{
            value:height * .65
          }
        },
        
        dicerWidth: {
          template: "numberTemplate",
          label: "Dicer width",
          icon: "crop_portrait",
          properties: {
            max: 250,
            min: 80
          },
          values:{
            value:180
          }
        },
        
        sortData: {
          template: "checkboxTemplate",
          label: "Sort data on load",
          icon: "sort",
          values:{
            value:true
          }
        },
        
        saveSheetDicers: {
          template: "checkboxTemplate",
          label: "Autosave selections",
          icon: "archive",
          values:{
            value:false
          }
        },
        
        clearSheetDicers: {
          template: "checkboxTemplate",
          label: "Clear saves at start",
          icon: "layers_clear",
          values:{
            value:true
          }
        },
        


        proDisabled: {
          template: "checkboxTemplate",
          label: "Disable features",
          icon: "loyalty",
          values:{
            value:false
          },
          properties: {
            disabled:true
          },
          on: {
            change: function (elementer , branch, ob , e){
              // the default one
              elementer.defaultOnChange (elementer , branch, ob , e);
              // plus a reminder
              if (!elementer.getElements().controls.proDisabled.checked) {
                App.toast ("Pro features enabled", "Remember to save settings to permanently enable for this or all documents");
              }
              
            }
          }
        },
        
        expiryReminder: {
          template: "checkboxTemplate",
          label: "Reminders",
          icon: "vibration",
          values:{
            value:true
          }
        },
        
        useSheetFiltering: {
          template: "checkboxTemplate",
          label: "Use sheet filtering",
          icon: "filter_list",
          values:{
            value:false
          }
        },
        
        autoFindTables: {
          template: "checkboxTemplate",
          label: "Autofind tables",
          icon: "find_in_page",
          values:{
            value:false
          }
        },
        
        
        autoFindTablesMode: {
          template: "selectTemplate",
          label: "Autofind mode",
          icon: "dashboard",
          options:["cells","position"],
          values:{
            value:"cells"
          }
        },
        
        autoFindTablesRowTolerance: {
          template: "numberTemplate",
          label: "Row tolerance",
          icon: "dehaze",
          values:{
            value:1
          },
          properties: {
            max:20,
            min:0
          }
        },
        
        autoFindTablesColumnTolerance: {
          template: "numberTemplate",
          label: "Column tolerance",
          icon: "view_column",
          values:{
            value:0
          },
          properties: {
            max:20,
            min:0
          }
        },
        
        autoFindTablesRank: {
          template: "numberTemplate",
          label: "Autofind rank",
          icon: "sort",
          values:{
            value:0
          },
          properties: {
            max:20,
            min:0
          }
        },
        
        
        allowScroll: {
          template: "checkboxTemplate",
          label: "Allow scrolling",
          icon: "photo_size_select_small",
          values:{
            value:false
          }
        },

        selectedColor: {
          template: "textTemplate",
          label: "Selected color",
          icon: "check_box",
          properties: {
            type: "color",
            value: '#B3E5FC'
          },
          values:{
            value:'#B3E5FC'
          }
        },
        
        quietColor: {
          template: "textTemplate",
          label: "Ready color",
          icon: "label_outline",
          properties: {
            type: "color",
            value: '#ECEFF1'
          },
          values:{
            value:'#ECEFF1'
          }
        },
        
        hoverColor: {
          template: "textTemplate",
          label: "Hover color",
          icon: "mouse",
          properties: {
            type: "color",
            value: '#FFF3E0'
          },
          values:{
            value:'#FFF3E0'
          }
        },
        
        unselectedColor: {
          template: "textTemplate",
          label: "Unselected color",
          icon: "check_box_outline_blank",
          properties: {
            type: "color",
            value: '#FFFFFF'
          },
          values:{
            value:'#FFFFFF'
          }
        },
        
        tooltipColor: {
          template: "textTemplate",
          label: "Tooltip color",
          icon: "help_outline",
          properties: {
            type: "color",
            value: '#FFCDD2'
          },
          values:{
            value:'#FFCDD2'
          }
        },
        
        accountId: {
          template: "wideReadonlyTemplate",
          label: "ID",
          icon: "perm_identity"
        },
        
        accountPlan: {
          template: "wideReadonlyTemplate",
          label: "Plan",
          icon: "verified_user"
        },
        
        accountExpiry: {
          template: "wideReadonlyTemplate",
          label: "Expires",
          icon: "update"
        },
        
        accountPaymentRef: {
          template: "wideReadonlyTemplate",
          label: "Payment reference",
          icon: "receipt",
          properties: {
            rows:2
          }
        },
        
        couponCode: {
          template: "wideTemplate",
          label: "Code",
          icon: "card_giftcard",
          properties:{
            disabled:false
          }
        },
        
        couponDivider:{
          label:"Pro version coupon",
          template:"dividerTemplate"
        },
        
        chartDivider:{
          label:"Dicer settings",
          template:"dividerTemplate"
        },
        
        proDivider:{
          label:"Pro features and account",
          template:"dividerTemplate"
        },
        
        dataProDivider:{
          label:"Pro features",
          template:"dividerTemplate"
        },
        
        
        accountDivider: {
          label:"My Account",
          template:"dividerTemplate"
        },
        
        proEnabledDivider: {
          label:"Sheet settings save behavior",
          template:"dividerTemplate"
        }
        
      },
      layout: {
        settings: {
          prefix: "layout",
          root: "root"
        },
        pages: {
          root: {
            label: "Settings menu",
            items: ["chartDivider", "behavior", 
                    "dataSourceDivider","dataSettings",
                    "manageDivider","saveSettings","manageSettings",
                    "proDivider","proSettings","accountSettings"]
          },
          
          dataSettings: {
            label: "Data",
            items: ["wholeSheet", "activeRange","specificRange","specificRangeValue","dataProDivider",
                    "autoFindTables", "autoFindTablesMode","autoFindTablesRank","autoFindTablesRowTolerance",
                    "autoFindTablesColumnTolerance","resetButton_dataSettings"],
            on:{
              enter:function (elementer,branch) {
                elementer.getElements().controls.resetButton_dataSettings.disabled = true;
                Process.reserveResetValues (elementer, branch);
              },
              exit:function (elementer, branch) {
                Process.restoreResetValues (Process.control.dicer.elementer , branch);
              }
            }
          },
          
          proSettings: {
            label: "Pro plan settings",
            items: ["proDisabled","proEnabledDivider",
                    "saveSheetDicers","clearSheetDicers",
                    "resetButton_proSettings"],
            on:{
              enter:function (elementer,branch) {
                elementer.getElements().controls.resetButton_proSettings.disabled = true;
                Process.reserveResetValues (elementer, branch);
              },
              exit:function (elementer, branch) {
                Process.restoreResetValues (Process.control.dicer.elementer , branch);
              }
            }
          },
          

          
          
          accountSettings: {
            label: "Your Account",
            items: ["accountPlan","accountExpiry","accountPaymentRef","accountId","expiryReminder","couponDivider","couponCode",
                   "resetButton_account"]
          },
          


          
          manageSettings: {
            label:"Reset",
            items:["useInitial","useStandard","useUser", "useDocument","applyButton"],
            on: {
              exit: function (elementer, branch) {
                // reset the buttons to apply next time in
                Process.control.buttons.apply.disabled=false;
              }
            }
          },
          
          saveSettings: {
            label:"Save",
            items:["makePermanent","makeDefault","clearPermanent","clearDefault","manageButton"],
            on: {
              exit: function (elementer, branch) {
                // reset the buttons to apply next time in
                Process.control.buttons.manage.disabled=false;
              }
            }
          },
         
          
          behavior: {
            label: "Dicers",
            items: ["sortData","allowScroll","autoCreateMax","appearance","colors",
                    "resetButton_behavior"],
            on:{
              enter:function (elementer,branch) {
                elementer.getElements().controls.resetButton_behavior.disabled = true;
                Process.reserveResetValues (elementer, branch);
              },
              exit:function (elementer, branch) {
                Process.restoreResetValues (Process.control.dicer.elementer , branch);
              }
            }
          },
          
          appearance: {
            label: "Appearance",
            items: ["staggerLeft",
                    "staggerTop","dicerWidth","dicerHeight","staggerWrap",
                    "resetButton_appearance"],
            on:{
              enter:function (elementer,branch) {
                elementer.getElements().controls.resetButton_appearance.disabled = true;
                Process.reserveResetValues (elementer, branch);
              },
              exit:function (elementer, branch) {
                Process.restoreResetValues (Process.control.dicer.elementer , branch);
              }
            }
          },
          
          colors: {
            label: "Colors",
            items: ["quietColor","selectedColor","unselectedColor","hoverColor","tooltipColor","resetButton_colors"],
            on:{
              enter:function (elementer,branch) {
                elementer.getElements().controls.resetButton_colors.disabled = true;
                Process.reserveResetValues (elementer, branch);
              },
              exit:function (elementer, branch) {
                Process.restoreResetValues (Process.control.dicer.elementer , branch);
              }
            }
          }
          
          
        }
      }
    }
  };
  
  
  
  return ns;
  
})(DicerWorker || {});