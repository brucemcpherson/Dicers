

/**
 * works the checkout part of Stripe
 * runs on both client and server
 * @namespace {GasStripeCheckout}
 */
var GasStripeCheckout = (function (ns) {

  ns.settings = {
    keys: {
      flavor:"prod",
      propertyName:"stripeKey",
      name:'GasStripeCheckout',
      key:""
    },
    image:'https://lh3.googleusercontent.com/WDw-R5uUz7VnjhPAAyoDYXPWrLKATvUeKeeQk1HA1AFO-tqyVjwmAAKHWDZcJEISO8kRwtV7nQ=s50-h50-e365'
  };
  
  
  /**
   * server side
   * get the stripe key for the mode we're in
   * @param {string} [mode=ns.settings.keys.flavor] the mode to get
   * @return {string} the key
   */
  ns.getKey = function (mode) {
    var ob = Props.getScript(ns.settings.keys.propertyName);
    return ob ? ob[mode || ns.settings.keys.flavor] : null;
  };
  
  /**
   * server side
   * one off setting of keys for stripe
   * @param {object} keys {test:"abc",prod:"xyz"}
   * @return {GasStripeCheckout} self
   */
  ns.setKey = function (keys) {
    Props.setScript (ns.settings.keys.propertyName , keys);
    return ns;
  };
  
  /**
   * get the stripe key from the server
   * @param {string} mode the mode to get
   * @return {Promise} a promise to the key
   */
  ns.getStripeKeyFromServer = function (mode) {
    return Provoke.run (ns.settings.keys.name,'getKey', mode);
  };
  
  /**
   * client side
   * initialize by picking up the key from the server
   * @return {Promise} the promise for the key
   */
  ns.init = function (mode) {

    return ns.getStripeKeyFromServer(mode)
    .then (function (key) {
      
      return Promise.resolve(ns.settings.keys.key = key);
    })
    ['catch'](function (err) {
      
      console.log(err);
      App.showNotification ('getting stripe key', err);
    });
  };
    
  /**
   * get the payment client side
   * @param {string} name 1st line on panel
   * @param {string} description 2nd line
   * @param {number} amount in cents to charge
   * @return {Promise} a promise to the result of the payment
   */
  ns.getPayment = function (name, description , amount) {

    // this is a promise to the payment
    // store the resolution callbacks for later
    var resolvePayment, rejectPayment;
    var payment = new Promise (function (resolve , reject ) {
      resolvePayment = resolve;
      rejectPayment = reject;
    });
     
    // configure returns an object
    // that will execute with the .open method
    try {
      StripeCheckout
      .configure ({
        key:ns.settings.keys.key,
        image:ns.settings.image,
        token:function (tob) {
          // this is fired
          // when a payment is successfully made
          resolvePayment (tob);
        },
        closed:function() {
          // this will be fired after the token resolution
          // so if the promise payload is null you'll know that
          // the payment was abandoned
          resolvePayment (null);
        }
      })
      .open ({
        name: name ,
        description: description,
        amount: amount,
        currency: 'USD',
        panelLabel: "Pay {{amount}}",
        zipCode: false,
        allowRememberMe:false
      });
    }
    catch (err) {
      rejectPayment (err);
    }

    return payment;
  };
   
  
  return ns;
}) (GasStripeCheckout || {});
