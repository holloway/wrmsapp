(function(){
    window.wrms_app_version = "0.4";

    window.update_wrms_app_version = function(){
        var $wrms_app_version = $("#wrms-app-version");
        $wrms_app_version.text("WRMS APP v." + wrms_app_version);
    };

    window.pageload(window.update_wrms_app_version);
}());