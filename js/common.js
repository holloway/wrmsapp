/*globals navigator,window,document,$,console */
window.pageload = function(callback){
    "use strict";
    if (window.Media && navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
        document.addEventListener("deviceready", callback, false);
    } else {
        $(document).ready(callback);
    }
};

(function(){
    "use strict";
    var check_localStorage = function(){
            if('localStorage' in window && window.localStorage !== null){
                return true;
            }
            return false;
        };

    window.localStorage_get = function(key){
        if(!check_localStorage()) return;
        var response = window.localStorage[key];
        if(!response || response.length === 0) return undefined;
        if(response.substr(0, 1) === "{") return JSON.parse(response);
        return response;
    };

    window.localStorage_set = function(key, value){
        if(!check_localStorage()) return;
        window.localStorage[key] = JSON.stringify(value);
    };

    window.localStorage_set_bool = function(key, bool){
        return window.localStorage_set(key, {key:bool});
    };

    window.localStorage_get_bool = function(key){
        var response = window.localStorage_get(key);
        if(!response) return false;
        return response[key];
    };
}());

(function(){
    "use strict";
    var init = function(){
        var ua = navigator.userAgent;
        //e.g. ua = "Mozilla/5.0 (Linux; U; Android 4.0.3; en-us; Transformer TF101 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
        if(ua.indexOf("Android") >= 0 ){
            window.isAndroid = true;
            window.androidVersion = parseFloat(ua.slice(ua.indexOf("Android")+8));
        } else {
            window.isAndroid = false;
        }
    };
    window.pageload(init);
}());

(function(){
    "use strict";

    var things_to_position = [],
        _key = "original-top",
        isNumber = function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };

    window.fix_position_fixed_not_working_in_old_androids = function($sender, override_with_top){
        var offset,
            offset_top;
        if(!window.isAndroid || window.androidVersion > 3) {
            return;
        }
        $sender.each(function(index, Element){
            var $value = $(Element);
                offset = $value.offset(),
                offset_top = offset.top;
            if(isNumber(override_with_top)){
                offset_top = override_with_top;
            }
            $value.data(_key, offset_top);
        });
        things_to_position.push($sender);
    };

    var init = function(){
        var $body = $("body");
        $(window).scroll(function(){
            var $thing,
                thing_top,
                original_transition,
                scroll_top = $body.scrollTop(),
                check_each_item = function(index, Element){
                    var $this = $(Element),
                        top_css_value;
                    thing_top = parseInt($this.data(_key), 10);
                    original_transition = $this.data("original-transition");
                    top_css_value = (scroll_top + thing_top) + "px";
                    $this.css({
                        "position": "absolute",
                        "top": top_css_value
                    });
                };
            for(var i = 0; i < things_to_position.length; i++){
                $thing = things_to_position[i];
                $thing.each(check_each_item);
            }
        });
    };
    window.pageload(init);
}());