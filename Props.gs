function clean() {
  Props.deleteSaveSheet();
  Props.deleteRegistration();
}

/**
 * handles storing.retrieving app properties nd registration
 * Props are always objects, and are stringified and parsed on exit
 * there is a big props writer. when this is used, it may write the 
 * data over multiple props, and will also zip and unzip as required
 * @namespace Props
 */
var Props = (function (ns) {
  
  'use strict';
  ns.settings = {
    maxPropertySize:9000
  };
  
  var saveCrush_;

  function getCrush_ () {
    return (saveCrush_ = saveCrush_ ||  new Squeeze.Chunking ()
    .setStore (PropertiesService.getUserProperties())
    .setCrushing (Process.globals.crushing)
    .setPrefix (Process.globals.saveSheet));
  }
  
  ns.decodeCoupon = function (couponCode) {
    var salt = Props.getScript (Process.globals.saltKey); 
    if (!salt || !salt.key) {
      throw 'Failed to get coupon private key';
    }
    return Coupon.decode (salt.key, couponCode);

  };
  /**
   * gets the settings from both the user and document properties
   * @return {object} the props
   */
  ns.getAll = function () {
    
    // return all the things saved
    return {
      saved:[
        { source:'useUser' , settings: ns.getUser() },
        { source:'useDocument' , settings: ns.getDocument() }
      ],
    };
    
  };
  
  /**
   * save the sheet selections
   * @param {string} sid the sheet id
   * @param {Array.object} dicerInfo the dicer info
   * @return {string} what was written
   */
  ns.saveSheet = function (sid , dicerInfo) {
    return getCrush_().setBigProperty (sid,dicerInfo);
  };
  
  /**
   * get the sheet selections
   * @param {string} sid the sheet id
   * @return {Array.object} the dicer info
   */
  ns.getSaveSheet = function (sid) {
    return getCrush_().getBigProperty (sid);
  };
  
  /**
   * get the sheet selections
   * @param {string} sid the sheet id
   * @return {Array.object} the dicer info
   */
  ns.removeSaveSheet = function (sid) {
    return getCrush_().removeBigProperty (sid);
  };
  
  /**
   * get all the saveds that exist
   * for this ssid
   * @param {string} ssid the ssid
   * @return {[string]} an array of keys
   */
  ns.getSaved = function (ssid) {
    prefix = getCrush_().getPrefix() + ssid + "_";
    var props = getCrush_().getStore();
    return props.getKeys().filter(function(k) {
      return k.slice(0,prefix.length) === prefix;
    });
  };
  /**
   * delete savesheetstuff tidy up
   */
  ns.deleteSaveSheet = function (prefix) {
    
    prefix = prefix || getCrush_().getPrefix();
    if (!prefix) throw 'must have a prefix to delete them all';
    
    // get all the props
    var props = getCrush_().getStore();
    
    props.getKeys()
    .filter(function (k) {
      return k.slice(0,prefix.length) === prefix;
    })
    .sort (function(a,b) {
      return b > a ? 1 : (a===b ? -1 : 0);
    })
    .forEach(function(k) {
      removeProp_ (props,k);
    });
    return ns;
  };
  

  /**
   * set the registration object for this user
   * @param {object} registration the registration object
   */
  ns.setRegistration = function (registration) {
    var psv = PropertiesService.getUserProperties();
    registration.lastUpdate = new Date().getTime();
    registration.transactions++;
    registration.version = Process.globals.version;
    return ns.set (psv, registration, Process.globals.purchaseLevel);
  };
  
  /**
   * set param plan object for this user
   * @param {object} plan object
   * @return {object} the updated registration object
   */
  ns.setPlan  = function (plan) {
    // first get the current registration object
    var registration = ns.getRegistration();
    if (!registration) {
      throw 'could not get registration object in setplan';
    }
    // set the plan
    registration.plan = plan;
    return ns.setRegistration ( registration );
  };
  
  /**
   * delete registration - mainly for testing
   */
  ns.deleteRegistration = function () {
    var psv = PropertiesService.getUserProperties();
    psv.deleteProperty( Process.globals.purchaseLevel);
  };

  /**
   * get the registration object for this user
   * @return {object} the registration object
   */
  ns.getRegistration = function () {
    
    // get the existing registration ob
    var psv = PropertiesService.getUserProperties();
    var ob = ns.get (psv, Process.globals.purchaseLevel);
    
    // if its the first time, then create one
    if (!ob) {
      var now = new Date().getTime();
      ob = { 
        id:Utils.generateUniqueString(),
        transactions:0,
        created:now,
        lastUpdate:now,
        plan:{
          created:now,
          name:Process.globals.plans.standard.name,
          type:Process.globals.paymentTypes.none,
          id:"",
          expire:0
        },
        version:Process.globals.version
      };
      ns.set (psv, ob, Process.globals.purchaseLevel);
    }
    
    return ob;
    
  };
  
  ns.removeDocument = function () {
    var psv = PropertiesService.getDocumentProperties();
    psv.deleteProperty(Process.globals.resetProperty);
  };
  
  ns.removeUser = function () {
    var psv = PropertiesService.getUserProperties();
    psv.deleteProperty(Process.globals.resetProperty);
  };
  
  ns.removeAll = function () {
    ns.removeDocument();
    ns.removeUser();
  };
  
  ns.isAuthDone = function () {
    return ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL)
    .getAuthorizationStatus() === ScriptApp.AuthorizationStatus.NOT_REQUIRED;
  }
  
  ns.get = function (props,optKey ) {
    return getProp_ (props, optKey || Process.globals.resetProperty);
  };
  
    
  ns.set = function (props , ob ,optKey) {
    return setProp_ (props, optKey || Process.globals.resetProperty,ob);
  };
  
  ns.setDocument = function (ob) {
    
    var psv = PropertiesService.getDocumentProperties();
    return ns.set (psv, ob);
  };
  
  ns.setUser = function (ob) {
    var psv = PropertiesService.getUserProperties();
    return  ns.set (psv, ob) ;
  };
  
  ns.getDocument = function () {
    var psv = PropertiesService.getDocumentProperties();
    return ns.isAuthDone() ? ns.get (psv) : null;
  };
  
  ns.getUser = function () {
    var psv = PropertiesService.getUserProperties();
    return ns.get (psv);
  };
  
  ns.setScript = function (key,ob) {
    var psv = PropertiesService.getScriptProperties();
    return setProp_ (psv,key,ob); 
  };
  
  ns.getScript = function (key) {
    var psv = PropertiesService.getScriptProperties();
    return getProp_ (psv,key); 
  };

  
  /**
  * get a property
  * @param {PropertiesService} props the service to use
  * @param {string} propKey the key
  * @return {object|undefined|null} the ob if auth, otherwise undefined
  */
  function getProp_ (props,propKey) {
    return ns.isAuthDone () ? Utils.expBackoff (function () {
      var r = props.getProperty(propKey);
      return r ? JSON.parse(r) : null;
    }) : "";
  }
  
 /**
  * set a property
  * @param {PropertiesService} props the service to use
  * @param {string} propKey the key
  * @param {object} ob the object to write
  * @return {ob|undefined} the string if auth, otherwise undefined
  */                                             
  function setProp_ (props,propKey,ob) {
    if (ns.isAuthDone ()) {
      props.setProperty(propKey, JSON.stringify(ob));
      return ob;
    } 
  }
  
 /**
  * remove a property
  * @param {PropertiesService} props the service to use
  * @param {string} propKey the key
  * @return {Props|undefined} self
  */                                             
  function removeProp_ (props,propKey) {
    if (ns.isAuthDone ()) {
      props.deleteProperty(propKey);
      return ns;
    } 
  }

  
  
  return ns;
})(Props || {});