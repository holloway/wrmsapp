(function(){
    "use strict";

    var _key = "login_status";

    window.login_status = {
        get: function(){
            return window.localStorage_get_bool(_key);
        },
        set: function(logged_in){
            return window.localStorage_set_bool(_key, logged_in);
        }
    };
}());

