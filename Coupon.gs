function getCoupon() {
  var salt = Props.getScript (Process.globals.saltKey);
  Logger.log(salt);
  var code = Coupon.generateDays (salt.key ,365*5, Process.globals.plans.pro.name);
  Logger.log(Props.decodeCoupon(code));
}

/**
 * generates/decodes coupons
 * @namespace Coupon
 */
var Coupon = (function (ns) {
  
  // changing this will invalidate all previous tokens 
  var ALGO = "#trumpity@trump";
  var SIG_SIZE = 3;

  // a coupon looks like this
  // prefix-sig-expiryhash
  // an extended coupon also contains data about number of days to extend from today in the expiryhash

  
   /**
   * generate a coupon code with a particular expiry date
   * @param {string} salt your private key
   * @param {number} expiry timestamp for when its supposed to expire
   * @param {string} planName the plan to generate a coupon for
   * @param {number} [extendDays=0]
   * @return {string} a coupon code
   */
  ns.generate = function (salt, expiry,prefix,extendDays) {
    if (typeof expiry !== 'number') {
      throw 'date should be a time stamp';
    }
    extendDays = extendDays || 0;    
    var result = getCode_ ( salt, prefix,  expiry.toString(32), extendDays, false);
    return result.coupon;
  };
  
  /**
   * generate a coupon code with an expiry date of n days from now
   * @param {string} salt your private key
   * @param {number} nMonths expiry n months from now
   * @param {string} prefix the prefix
   * @param {number} [extendDays=0]
   * @return {string} coupon code
   */
  ns.generateMonths = function (salt, nMonths , prefix,extendDays) {
    return ns.generate (salt, addDate_(new Date() , "Month" , nMonths).getTime()  ,prefix,extendDays);
  };
  
  /**
   * generate a coupon code with an expiry date of n days from now
   * @param {string} salt your private key
   * @param {number} nDays expiry n days from now
   * @param {string} prefix the prefix
   * @param {number} [extendDays=0]
   * @return {string} coupon code
   */
  ns.generateDays = function (salt, nDays , prefix,extendDays) {
    return ns.generate (salt, addDate_(new Date() , "Date" , nDays).getTime()  ,prefix,extendDays);
  };
  
  /**
   * decode a coupon
   * @param {string} salt your private key
   * @param {string} coupon code
   * @return {object} the result
   */
  ns.decode = function (salt, coupon) {

    var matches = coupon.split("-");
    var c = getCode_ (salt, matches[0], matches[1] + matches[2], 0 , true);
    var valid = c.coupon === coupon;
    
    return {
      expiry:valid ? c.expiry: 0,
      valid:valid,
      prefix:matches[0],
      coupon:coupon,
      expired:!valid || c.expiry <= new Date().getTime(),
      extraDays:c.extraDays,
      extendedExpiry:c.extendedExpiry
    };
  };
  
  /**
   * need a repeatable seed for the random function
   * this generates a hash of the string
   * @param {string} str
   * @return {number} the seed
   */
  function getPepper_ (str) {
    var m = 0;
    return digest_ (str+ALGO)
    .split("")
    .reduce (function (p,c) {
      return p + (c.charCodeAt(0)*Math.pow(.1,m++));
    },7);
    
  }
  /**
   * i need to be able to generate repeatable random numbers
   * @param {string} salt the private key
   * @param {string} str the string to shuffle
   */
  function getSeq_ (salt, str) {
    
    // save the current seed
    var seed = Math.seed;
    
    // the initial seed - if its the value, we get repeated random numbers
    Math.seed = getPepper_(salt);

    // generate a repeatable array based on the string
    var muffle = str.split("")
    .map(function(d,i) {
      return i;
    });
    
    // shuffle
    muffle.forEach(function(d,i,a) {
      var dx = Math.round(seededRandom ()*(a.length-1)) ;
      var t = a[dx];
      a[dx] = a[i];
      a[i] = t;
    });
    
    // restore
    Math.seed = seed;
    
    // return a shuffle array
    return muffle;
    

    // thanks to http://indiegamr.com/generate-repeatable-random-numbers-in-js/
    /// I have no idea why this works, but it does
    function seededRandom(max, min) {
      max = max || 1;
      min = min || 0;
      
      Math.seed = (Math.seed * 9301 + 49297) % 233280;
      var rnd = Math.seed / 233280;
      
      return min + rnd * (max - min);
    }
    
  }
  
  /**
   * given an array or sequence, scramble or unscramble
   * @param {[number]} seq the sequence to scramble into
   * @param {string} expiry32 the expiry date as string32
   * @param {boolean} unscrambling whether we're unscrambling
   * @return {string} the scrambled/unscrambled expiry32
   */
  function scramble_ (seq, expiry32, unscrambling) {
   
    if (!seq || seq.length !== expiry32.length) {
      throw 'coupon sequencing model is invalid'+seq.join(",");
    }
    
    return expiry32
    .split("")
    .map(function (d,i,a) {
      return unscrambling ? a[seq.indexOf(i)] : a[seq[i]];
    })
    .join("");
    
  }
  
  /**
   * get a coupon
   * @param {string} salt your private key
   * @param {string} prefix your token prefix
   * @param {string} target the expiry date as string32
   * @param {number} extendDays if not 0, will make a token that has an extended number of days from the time its decoded
   * @param {boolean} [decoding=false] whether we're decoding from an existing coupon
   * @return {object} the result
   */
  function getCode_ ( salt, prefix, target, extendDays , decoding) {
    

    if (typeof salt !== 'string' || salt.length < 6) {
      throw 'salt value must be a string of at least 6 characters';
    }
    
    // used to determine the length of a timestamp
    var t32 = new Date().getTime();
    var tsLen = t32.toString(32).length;
    
    // ignore extenddays if decoding
    extendDays = decoding ? 0 : extendDays;
    
    // must have both a prefix and a target (the expiry date shuffle)
    if (prefix && target && target.length >= tsLen) {
      
      // "-" not allowed in prefix
      prefix = prefix.replace(/-/g,"_");
    
      // extend the target by extend days
      if (extendDays) {
        target += extendDays.toString(32);
      }
      
      // simulate a sig for decoding
      var t = decoding ? target : nChars_ (SIG_SIZE , "x" ) + target;
      
      
      // the shuffle sequence for this kind of token
      var seq = getSeq_ ( prefix+salt , t );
      
      // scramble using the shuffle sequence
      var t = decoding ? scramble_ (seq , target, true) : t;
      var e32 = t.slice (SIG_SIZE);
      
      // if this is an extended token slice of the expiry and the extended parts
      var expiry32 = e32.slice (0,tsLen);
      var ex32 = e32.slice (tsLen);
      
      // digest the coupon parameters and salt
      var z = digest_(prefix,e32,salt);
      
      // sign it with itself
      var c = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(
        prefix+e32, salt + z
      ));
      
      // digest the signed result
      var x = digest_ (c);
      
      // convert expiry back to a timestamp
      var expiry = parseInt(expiry32,32);
      
      // use part of the expiry time to get a slice of the signed digest
      var start = expiry % (x.length-SIG_SIZE-1);
      
      // this is the validation code for the expiry time
      var sig = x.slice(start,start+SIG_SIZE).toLowerCase();
      
      // calculate extra days
      var extraDays = ex32 ? parseInt(ex32,32) : 0;
    
      // scramble it all up
      var scramble = scramble_ (seq, sig + expiry32 + ex32,false);
      
      return {
        coupon:prefix+"-" + scramble.slice(0,SIG_SIZE) +"-"+scramble.slice (SIG_SIZE),
        expiry:expiry,
        ex32:expiry32,
        extraDays:extraDays,
        extendedExpiry:extraDays ? addDate_(new Date(),"Date", extraDays).getTime() : 0
      }
    }
    else {
      return {}
    }
  }
  
  /**
 * @param {[*]} arguments unspecified number and type of args
 * @return {string} a digest of the arguments to use as a key
 */
  function digest_() {
    // conver args to an array and digest them
    return Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, Array.prototype.slice.call(arguments).map(function (d) {
        return (Object(d) === d)  ? JSON.stringify(d) : (isUndefined_(d) ? 'undefined' : d.toString());
      }).join("-")));
  }
  
  function isUndefined_ (o) {
    return typeof o === typeof undefined;
  }
  
  function addDate_ (when, period , howMany) {
    when['set'+period] (when['get'+period]() + howMany);
    return when;
  }
  
  function nChars_ (howMany , theChar) {
    return new Array(howMany+1).slice().join(theChar || " ");
  }
                     
  
  return ns;
})(Coupon || {});
