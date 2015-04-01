

function getQueryStringParam(name) {
    var queryParams = window.location.search.substring(1).split('&');
    for (var i = 0; i < queryParams.length; i++) {
        var param = queryParams[i].split('=');
        if (param[0] === name) {
            return param[1];
        }
    }
}


var DigitalOceanClient = function(token) {
  this.token = token;
  this.baseUrl = 'https://api.digitalocean.com/v2';
}

DigitalOceanClient.prototype.request = function(method, action, data, callback) {
  if (typeof(data) === 'function') {
    callback = data;
    data = null;
  }
  if (data) {
    data = JSON.stringify(data);
  }
  $.ajax({
    type: method,
    url: this.baseUrl + action,
    data: data,
    headers: {
      "Content-Type": 'application/json',
      "Authorization": 'Bearer ' + this.token
    },
    success: function (res) {
      callback(null, res);
    },
    error: function (err) {
      callback(err);
    }
  });
};

DigitalOceanClient.prototype.get = function(action, data, callback) {
  return this.request("GET", action, data, callback);
};

DigitalOceanClient.prototype.post = function(action, data, callback) {
  return this.request("POST", action, data, callback);
};