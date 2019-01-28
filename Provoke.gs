/**
 * @namespace Provoke
 * promise management for async calls
 */

var Provoke =(function (ns) {

  /**
   * wait for a bit 
   * @param {number} ms number of ms to wait
   * @param {*} [tag] will be passed on with resolve if specified
   * @return {Promise} resolved when timeout acheived
   */
  ns.loiter = function (ms, tag) {
    return new Promise(function(resolve, reject) {
      try {
        setTimeout(function() {
          resolve(tag);
        }, ms);
      } catch (err) {
        reject(err);
      }
    });
  };
  
  /**
  * run something asynchronously
  * @param {string} namespace the namespace (null for global)
  * @param {string} method the method or function to call
  * @param {[...]} the args
  * @return {Promise} a promise
  */
  ns.run = function (namespace,method) {
    
    // the args to the server function
    var runArgs = Array.prototype.slice.call(arguments).slice(2);

    
    if (arguments.length<2) {
      throw new Error ('need at least a namespace and method');
    }

    // this will return a promise
    return new Promise(function ( resolve , reject ) {
      
      google.script.run
    
      .withFailureHandler (function(err) {
        reject (err);
      })
    
      .withSuccessHandler (function(result) {
        resolve (result);
      })
    
      .exposeRun (namespace,method,runArgs); 
    });
    
    
  };
  
  
  return ns;
  
})(Provoke || {});



