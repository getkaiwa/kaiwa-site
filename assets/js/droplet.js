
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


/***************************************************************************
 */

var DropletCreator = function(client) {
  this.client = client;
};

DropletCreator.prototype.generateCloudConfig = function(data) {
  return `#cloud-config
packages:
  - git
  - docker.io
  - ldap-utils
runcmd:
  - docker pull orchardup/postgresql
  - docker run -d --name postgres -p 5432:5432 -e POSTGRESQL_USER=otalk -e POSTGRESQL_PASS=` + data.adminPassword + ` orchardup/postgresql
  - docker pull nickstenning/slapd
  - docker run -d --name ldap -p 389:389 -e LDAP_DOMAIN=` + data.org.toLowerCase() + ` -e LDAP_ORGANISATION=` + data.org + ` -e LDAP_ROOTPASS=` + data.adminPassword + ` nickstenning/slapd
  - wget -P /root/ https://raw.githubusercontent.com/digicoop/otalk-prosody/master/users.ldif
  - sed 's/admin@example.com/admin@` + data.domain + `/' -i /root/users.ldif
  - sed 's/user1@example.com/` + data.firstUserName.toLowerCase() + `@` + data.domain + `/' -i /root/users.ldif
  - sed 's/adminpass/` + data.adminPassword + `/' -i /root/users.ldif
  - sed 's/user1pass/` + data.firstUserPassword + `/' -i /root/users.ldif
  - sed 's/example.com/` + data.org.toLowerCase() + `/' -i /root/users.ldif
  - sed 's/ExampleDesc/` + data.org + `/' -i /root/users.ldif
  - sed 's/user1/` + data.firstUserName.toLowerCase() + `/' -i /root/users.ldif
  - docker pull sebu77/otalk-prosody
  - docker run -d -p 5222:5222 -p 5269:5269 -p 5280:5280 -p 5281:5281 -p 3478:3478/udp --name prosody --link postgres:postgres --link ldap:ldap -e XMPP_DOMAIN=` + data.domain + ` -e DB_NAME=otalk -e DB_USER=otalk -e DB_PWD=` + data.adminPassword + ` -e LDAP_BASE=dc=` + data.org.toLowerCase() + ` -e LDAP_DN=cn=admin,dc=` + data.org.toLowerCase() + ` -e LDAP_PWD=` + data.adminPassword + ` -e LDAP_GROUP=` + data.org.toLowerCase() + ` sebu77/otalk-prosody
  - ldapadd -h localhost -x -D cn=admin,dc=` + data.org.toLowerCase() + ` -w ` + data.adminPassword + ` -f /root/users.ldif
  - docker pull sebu77/otalk
  - docker run -d -p 80:8000 --name otalk --link ldap:ldap -e VIRTUAL_HOST=localhost -e VIRTUAL_PORT=80 -e XMPP_NAME=` + data.org + ` -e XMPP_DOMAIN=` + data.domain + ` -e XMPP_WSS=ws://` + data.domain + `:5280/xmpp-websocket -e XMPP_MUC=chat.` + data.domain + ` -e XMPP_STARTUP=groupchat/home%40chat.` + data.domain + ` -e XMPP_ADMIN=admin -e LDAP_BASE=dc=` + data.org.toLowerCase() + ` -e LDAP_DN=cn=admin,dc=` + data.org.toLowerCase() + ` -e LDAP_PWD=` + data.adminPassword + ` -e LDAP_GROUP=` + data.org.toLowerCase() + ` sebu77/otalk`;
};

DropletCreator.prototype.create = function(data, callback) {
  var self = this;
  var payload = {
    name: "otalk",
    region: data.region,
    size: data.size,
    image: "ubuntu-14-04-x64",
    ssh_keys: data.sshKey ? [data.sshKey] : [],
    backups: data.backups || false,
    ipv6: data.ipv6 || false,
    private_networking: false,
    user_data: this.generateCloudConfig(data)
  };

  console.log(payload);

  this.client.post('/droplets', payload, function(err, res) {
    if (err) return callback(err, null);
    callback(null, res.droplet);
  });
};

DropletCreator.prototype.getIp = function(id, callback) {
  var self = this;
  var getIp = function(cb) {
    self.client.get('/droplets/' + id, function(err, res) {
      if (err) return cb(err, null);
      var networks = res.droplet.networks;
      cb(null, networks.v4 && networks.v4.length ? networks.v4[0].ip_address : null);
    });
  };
  var check = function() {
    getIp(function(err, ip) {
      if (err) return callback(err, null);
      if (!ip) {
        setTimeout(check, 10000);
      } else {
        callback(null, ip);
      }
    });
  };
  check();
};
