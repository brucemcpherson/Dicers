/**
* sets up all listeners
* @constructor Home
*/

var Home = (function (home) {
  'use strict';
  
  var ns = home;
  
  /**
  * apply a coupon to create or extend a plan
  * @param {string} code the coupon code
  * @return {Promise} to the updated reg data
  */
  ns.applyCoupon = function (code) {
    
    // check the coupon and also get the latest registration in case its been updated   
    return Promise.all([Provoke.run ("Props", "decodeCoupon", code), getRegistration_()])
    .then (function(results) {
      var data = results[1];
      var coupon = results[0]; 
      Process.control.registration.data = data;

      // find the plan
      var plan = Process.globals.plans[Object.keys(Process.globals.plans).filter(function(k) {
        return coupon.prefix === Process.globals.plans[k].name;
      })[0]];

      var now = new Date().getTime();
      var currentExpire = data.plan.expire;
      
      // now we need to update the plan
      if (!coupon.valid || !plan) {
        return Promise.reject(code + " is not a current valid dicers coupon");
      }
      else if (coupon.expiry <= now) {
        return Promise.reject (code + " is an expired coupon");
      }
      else if (coupon.expiry <= currentExpire) {
        return Promise.reject (code + " has the same or earlier expiration date than your current plan")
      }
      
      else {
        // update properties on the server 
        // - only want to store minimal customer information, even though its not accesible to me anyway
        return Provoke.run ('Props', 'setPlan',  {
          created:now,
          email:data.plan.email||"anonymous",
          id:data.plan.id || code,
          type:(data.plan.type ? data.plan.type + "+" : "") + Process.globals.paymentTypes.coupon,
          name:plan.name,
          expire:coupon.expiry
        });
      }
      
    })
    .then (function (data) {
      // confirm the thing happened.
      Process.control.registration.data = data;
      App.toast("Coupon applied","Thank you for trying " + Process.globals.plans[data.plan.name].description );
      Process.changedValues (Process.control.result);
      showPlan_ ();
    })
    ['catch'](function (err) {
      App.showNotification ("Coupon not applied", err);
      
    });
  };
  
  
  /**
   * The initialize function must be run to activate elements
   * @return {Promise} to the registration data being finished
   */
  ns.initialize = function () {
    
    // we can start initializing the payment system
    var gsPromise = GasStripeCheckout.init ();
    
    // get the registration then get on with initializing stuff
    var regPromise = getRegistration_ ();
    
    // advertise how much it costs
    Process.control.elems.cost.innerHTML = Process.globals.plans.pro.amount/100;

    
    /** 
    * configure and get a payment
    * @param {number} currentExpire timestamp that current subscription runs out
    * @param {string} type the type of subscription
    * @param {DomElement} button the button that initiated the payment form to come up
    * @param {object} plan the plan description -eg {name:'Pro',amount:500,description:'Dicers Pro'}
    * @return {Promise} to all this happenening
    */
    function pay_ (currentExpire,type,button,plan) {
      
      // avoid double clicking
      button.disabled = true;
      
      // the callback when token is received
      return GasStripeCheckout.getPayment(type , plan.description, plan.amount)
      .then (function (result) {
        
        // if result is null, then the payment gas bveen abandoned
        if (result) {
          // do whatever is is required when payment is successful
          Process.control.registration.data.plan.expire = extendSubscription_ (currentExpire).getTime();
          
          // update properties on the server 
          // - only want to store minimal customer information, even though its not accesible to me anyway
          return Provoke.run ('Props', 'setPlan',  {
            created:result.created,
            email:result.email,
            id:result.id,
            type:type,
            name:plan.name,
            expire:Process.control.registration.data.plan.expire
          });
        }
      })
      .then(function(data) {
        
        // this will be null if payment was abandoned
        if (data) {
          Process.control.registration.data = data;
          App.toast ('Thank you for your ' + type,  
                     '<div class="mui--text-caption">Payment reference is <br>' + data.plan.id + '</div>');
         
        }
        
        showPlan_ ();
        
      })
      ['catch'] (function (err) {
        // do whatever is is required when payment fails
        App.showNotification ("payment failed", err);
      });
    }
    
    
    // add a year to current expiration date
    function extendSubscription_ (current) {
      var expire = new Date(current);
      expire.setYear(expire.getFullYear() + 1);
      expire.setDate(expire.getDate()+1);
      return expire;
    }
    
    // payment structure .. should be init by now.
    gsPromise.then(function(result) {
      
      // there are two types of payment buttons
      [{button:Process.control.buttons.pay,
        type:Process.globals.paymentTypes.subscribe,
        now:new Date().getTime() 
       },
       {button:Process.control.buttons.payExtend,
        type:Process.globals.paymentTypes.renew
       }
      ]
      .forEach(function (d) {
        
        // initialize new structure for subscribing/renewing
        d.button.addEventListener ('click', function () {
          
          // make sure we have the latest data 
          // since it might be logged on elsewhere
          getRegistration_()
          .then(function (data) {
            
            // keep the reg data fresh 
            Process.control.registration.data = data;
            
            // this will return a promise, resolved when payment received
            return pay_ ( d.now || data.plan.expire, d.type, d.button, Process.globals.plans.pro);
            
          })
          .then (function () {
            // enable various pro things if necessary
            Process.changedValues (Process.control.result);
          });
          
        });
      });
      
    });
    
    // allow adding of dicers
    Process.control.buttons.insert.addEventListener ('click',function () {
      Process.showDicerSelect();
    });
    
    // allow pausing of dicers
    Process.control.buttons.pause.addEventListener ('click',function () {
      Process.control.buttons.pause.innerHTML = Client.isPaused() ? "PAUSE" : "RESTART";
      Client.pause (!Client.isPaused());
    });
    
    // clear all dicers
    Process.control.buttons.clear.addEventListener ('click',function () {
      Dicers.cancelAll();
    });
    
    Process.control.buttons.generate.addEventListener('click',function () {
      
      // spin the cursor
      DomUtils.hide ('spinner',false);
      // disable the button
      Process.control.buttons.generate.disabled = true;
      
      Provoke.run("Server","generateTestData",Process.control.dicer.testData)
      .then (function (result) {
        App.toast ("Sample data generated","You can delete this sheet at any time");
        finallyPromise();
      })
      ['catch'](function (err) {
        App.showNotification ("Failed to generate sample data", err);
        finallyPromise();
      });
      
      function finallyPromise  () {
        DomUtils.hide ('spinner', true);
        Process.control.buttons.generate.disabled = false;
      }
      
    });
    
    
    // if the close button exists then do it.
    if (Process.control.buttons.close) {
      Process.control.buttons.close.addEventListener('click', function () {    
        google.script.host.close();
      });
    }
    
    // watch out for exiting the tab
    var toggles = document.querySelectorAll('[data-mui-controls="' + Process.control.tabs.settings.id + '"]');
    toggles[0].addEventListener ('mui.tabs.hidestart',function () {
      
      if (Process.applyElementer()) {
        // this would have returned true if any changes happened
        Process.changedValues (Process.control.result);
      };
    });
    
    // which settings to use
    var elementer = Process.control.dicer.elementer;
    var elems = elementer.getElements();
    
    // this is about applying different settings 
    Process.control.buttons.apply.addEventListener('click', function () { 
      
      // just use the current settings
      Process.control.buttons.apply.disabled=true;
      Object.keys(Process.control.dicer.store).forEach(function(d) {
        try {
          if (elems.controls[d] && elems.controls[d].checked) {
            elementer.applySettings(Process.control.dicer.store[d]);
            
            
            DicerWorker.mapSettings(elementer);
            Process.changedValues (Process.control.result);
            App.toast ("Settings restored", 
                       "Your dicers have been reformatted");
            
          }
        }
        catch (err) {
          App.showNotification ("Control element error detected on settings " + d, err);
        }
      });
      
    });
    
    // this is about enabling the apply button if anything different is selected
    var buts = ['apply','manage'];
    ['use-group','manage-group'].forEach (function (g,i) {
      DomUtils.getGroup (g).forEach(function(d) {
        d.addEventListener('change', function () {
          Process.control.buttons[buts[i]].disabled=false;
        });
      });
    });
    
    // this is an apply button
    // since they have already been applied then Apply = dont reset when exiting the settings page
    Process.control.buttons.reset.forEach(function(d,i) {
      
      d.addEventListener('click',function() {
        Process.control.dicer.store.reset[d.id.match(/resetButton_(\w+)-elem/)[1]] = null;
        d.disabled = true;
      });
    });
    
    //this us about saving and clearing settings in property stores
    Process.control.buttons.manage.addEventListener('click', function () {    
      
      // get all the elements
      Process.control.buttons.manage.disabled=true;
      var elementer = Process.control.dicer.elementer;
      var elems = elementer.getElements();
      var current = elementer.getCurrent();
      
      if (elems.controls.makePermanent.checked) {
        
        Provoke.run('Props','setDocument', elementer.getCurrent())
        .then (function (result) {
          Process.control.dicer.store.useDocument = current;
          elems.controls.useDocument.disabled = false;
          App.toast ("Settings saved", "Current settings will be applied to all sessions in this document in future");
        })
        ['catch'](function(err) {
          App.showNotification("Error setting document properties",err);
        });
      }
      
      else if (elems.controls.makeDefault.checked) {
        // write to user user properties
        Provoke.run('Props','setUser', elementer.getCurrent())
        .then (function (result) {
          Process.control.dicer.store.useUser = current;
          elems.controls.useUser.disabled = false;
          App.toast ("Settings saved", 
                     "Current settings will be used as default for all your sessions in documents without their own settings");
        })
        ['catch'](function(err) {
          App.showNotification("Error setting user properties",err);
        });
        
      }
      
      else if (elems.controls.clearPermanent.checked) {
        // remove perm settings from document, user properties and apply factory values
        Provoke.run ('Props', 'removeDocument')
        .then(function (result) {
          Process.control.dicer.store.useDocument = null;
          elems.controls.useDocument.disabled = true;
          App.toast ("Settings cleared", 
                     "Document settings have been removed");
        })
        ['catch'](function(err) {
          App.showNotification("Error removing documentproperties",err);
        });
        
      }
      
      else if (elems.controls.clearDefault.checked) {
        // remove perm settings from document, user properties and apply factory values
        Provoke.run ('Props', 'removeUser')
        .then(function (result) {
          Process.control.dicer.store.useUser = null;
          elems.controls.useUser.disabled = true;
          App.toast ("Settings cleared", 
                     "Your default settings have been removed");
        })
        ['catch'](function(err) {
          App.showNotification("Error removing user properties",err);
        });
        
        
      }
      else {
        App.showNotification ("radio group has nothing checked ","manage-group");
      }
      
    });

    
    return regPromise;
    
  };
  
  // get the current registration from the server
  function getRegistration_ () {
    return new Promise(function (resolve, reject) {
      Provoke.run ('Props', 'getRegistration')
      .then (function (data) {
        Process.control.registration.data = data;
        // setup the status of payment panel
        showPlan_ ();
        resolve(data);
      })
      ['catch'](function (err) {
        App.showNotification ("failed to get registration data", err);
        reject (err);
      });
      
    });
  }
  
  // show different content depending on whether signed up
  function showPlan_ () {
    var pd = Process.control.registration.data;
    
    var pro = pd.plan.name === Process.globals.plans.pro.name && 
      pd.plan.expire && pd.plan.expire >= new Date().getTime();
    DomUtils.hide (Process.control.elems.unpaid,pro);
    DomUtils.hide (Process.control.elems.paid,!pro);
    Process.control.buttons.pay.disabled = pro;
    Process.control.buttons.payExtend.disabled = false;
    Process.control.elems.subscribedPlan.innerHTML = pd.plan.name;
    Process.control.elems.runsOut.innerHTML = pd.plan.expire ? new Date(pd.plan.expire).toLocaleString() : "";
    
    // set settings elements to appropriate things
    setAccountElements_ ();

    
  }
  
  function setAccountElements_ () {
    var pd = Process.control.registration.data;
    var controls = Process.control.dicer.elementer.getElements().controls;
    controls.accountId.value = pd.id;
    controls.accountExpiry.value = pd.plan.expire ? new Date(pd.plan.expire).toLocaleString() : "never";
    controls.accountPlan.value = pd.plan.name;
    controls.accountPaymentRef.value = pd.plan.id;

    Process.control.pro.features
    .forEach(function(d) {
      controls[d].disabled = !Process.isPro();
    });
    
  }
  return home;
})(Home || {});
