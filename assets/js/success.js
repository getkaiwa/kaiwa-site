
$(function() {
  var ip = getQueryStringParam('ip');
  if (ip) {
    $('#ip').show().find('.value').text(ip);
  }
});