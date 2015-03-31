
function getQueryStringParam(name) {
  var queryParams = window.location.hash.substring(1).split('&');
  for (var i = 0; i < queryParams.length; i++) {
    var param = queryParams[i].split('=');
    if (param[0] === name) {
      return param[1];
    }
  }
}

var token = getQueryStringParam('token');

function createDroplet(data, callback) {
  $.ajax({
    type: "POST",
    url: 'https://api.digitalocean.com/v2/droplets',
    headers: {
      "Content-Type": 'application/json',
      "Authorization": 'Bearer ' + token
    },
    data: data,
    success: function (data) {
      console.log("ok2");
      console.log(data);
      callback(data);
    },
    error: function (err) {
      console.log("ko2");
      console.log(err);
    }
  });
}

$(function() {
  console.log(token);
  // createDroplet(token, {
  //   "name": "example.com",
  //   "region": "nyc3",
  //   "size": "512mb",
  //   "image": "ubuntu-14-04-x64",
  //   "ssh_keys": null,
  //   "backups": false,
  //   "ipv6": true,
  //   "user_data": null,
  //   "private_networking": null
  // }, function(res) {

  // })
});