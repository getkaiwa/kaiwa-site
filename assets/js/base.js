
function getQueryStringParam(name) {
    var queryParams = window.location.hash.substring(1).split('&');
    for (var i = 0; i < queryParams.length; i++) {
        var param = queryParams[i].split('=');
        if (param[0] === name) {
            return param[1];
        }
    }
}